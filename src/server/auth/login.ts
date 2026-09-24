import { and, count, eq, gt, max } from "drizzle-orm";
import type { Database } from "../db/connection";
import { adminLoginAttempts, adminUsers } from "../db/schema";
import { burnPasswordCheck, verifyPassword } from "./password";
import { createSession } from "./session";

/**
 * Login do painel com limite de tentativas.
 *
 * - Até 5 falhas por e-mail e 30 por IP a cada 15 minutos.
 * - A resposta de erro é a mesma para e-mail inexistente, senha errada ou
 *   usuário desativado, e o tempo de verificação é equivalente nos três casos.
 */

const WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 30;

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; userId: string }
  | { ok: false; reason: "invalid_credentials" }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function failuresSince(db: Database, where: ReturnType<typeof eq>, since: Date) {
  const [row] = await db
    .select({ failures: count(), latest: max(adminLoginAttempts.attemptedAt) })
    .from(adminLoginAttempts)
    .where(and(where, eq(adminLoginAttempts.succeeded, false), gt(adminLoginAttempts.attemptedAt, since)));
  return { failures: Number(row?.failures ?? 0), latest: row?.latest ?? null };
}

async function lastSuccess(db: Database, email: string): Promise<Date | null> {
  const [row] = await db
    .select({ at: max(adminLoginAttempts.attemptedAt) })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.email, email), eq(adminLoginAttempts.succeeded, true)));
  return row?.at ?? null;
}

async function rateLimit(db: Database, email: string, ipAddress: string | null): Promise<number | null> {
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const success = await lastSuccess(db, email);
  const emailSince = success && success > windowStart ? success : windowStart;
  const byEmail = await failuresSince(db, eq(adminLoginAttempts.email, email), emailSince);
  const byIp = ipAddress ? await failuresSince(db, eq(adminLoginAttempts.ipAddress, ipAddress), windowStart) : { failures: 0, latest: null };

  const blockedBy =
    byEmail.failures >= MAX_FAILURES_PER_EMAIL ? byEmail.latest : byIp.failures >= MAX_FAILURES_PER_IP ? byIp.latest : null;
  if (!blockedBy) return null;
  const retryAt = blockedBy.getTime() + WINDOW_MS;
  return Math.max(1, Math.ceil((retryAt - Date.now()) / 1000));
}

export async function login(
  db: Database,
  input: { email: string; password: string; ipAddress: string | null; userAgent: string | null },
): Promise<LoginResult> {
  const email = normalizeEmail(input.email);

  const retryAfterSeconds = await rateLimit(db, email, input.ipAddress);
  if (retryAfterSeconds !== null) return { ok: false, reason: "rate_limited", retryAfterSeconds };

  const [user] = await db
    .select({ id: adminUsers.id, passwordHash: adminUsers.passwordHash, isActive: adminUsers.isActive })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  let valid = false;
  if (user) valid = (await verifyPassword(input.password, user.passwordHash)) && user.isActive;
  else await burnPasswordCheck(input.password);

  await db.insert(adminLoginAttempts).values({ email, ipAddress: input.ipAddress, succeeded: valid });
  if (!user || !valid) return { ok: false, reason: "invalid_credentials" };

  const session = await createSession(db, user.id, { userAgent: input.userAgent, ipAddress: input.ipAddress });
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  return { ok: true, token: session.token, expiresAt: session.expiresAt, userId: user.id };
}
