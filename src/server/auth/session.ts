import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Database } from "../db/connection";
import { adminSessions, adminUsers } from "../db/schema";
import { SESSION_TOKEN_PATTERN } from "./cookie";

/**
 * Sessões do painel guardadas no banco.
 *
 * O navegador recebe apenas um token aleatório (cookie httpOnly). O banco
 * guarda somente o SHA-256 desse token: um vazamento da tabela não permite
 * assumir sessões. Sessões expiram por tempo absoluto e por inatividade e
 * podem ser revogadas a qualquer momento (logout, troca de senha).
 */

export const SESSION_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_TTL_MS = 12 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 10 * 60 * 1000;

export interface AdminPrincipal {
  sessionId: string;
  userId: string;
  email: string;
  displayName: string | null;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  db: Database,
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_ABSOLUTE_TTL_MS);
  await db.insert(adminSessions).values({
    id: hashSessionToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
  });
  // Limpeza oportunista das sessões vencidas deste usuário.
  await db.delete(adminSessions).where(and(eq(adminSessions.userId, userId), lt(adminSessions.expiresAt, new Date(now))));
  return { token, expiresAt };
}

/** Valida o token do cookie contra o banco. Devolve `null` para qualquer sessão inválida. */
export async function findSession(db: Database, token: string | undefined | null): Promise<AdminPrincipal | null> {
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return null;
  const id = hashSessionToken(token);
  const now = new Date();
  const [row] = await db
    .select({
      sessionId: adminSessions.id,
      lastSeenAt: adminSessions.lastSeenAt,
      userId: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      isActive: adminUsers.isActive,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.id, id), gt(adminSessions.expiresAt, now)))
    .limit(1);

  if (!row || !row.isActive) return null;

  const idleFor = now.getTime() - row.lastSeenAt.getTime();
  if (idleFor > SESSION_IDLE_TTL_MS) {
    await db.delete(adminSessions).where(eq(adminSessions.id, id));
    return null;
  }
  if (idleFor > TOUCH_INTERVAL_MS) {
    await db.update(adminSessions).set({ lastSeenAt: now }).where(eq(adminSessions.id, id));
  }

  return { sessionId: row.sessionId, userId: row.userId, email: row.email, displayName: row.displayName };
}

export async function revokeSession(db: Database, token: string | undefined | null): Promise<void> {
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return;
  await db.delete(adminSessions).where(eq(adminSessions.id, hashSessionToken(token)));
}

export async function revokeAllSessions(db: Database, userId: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}
