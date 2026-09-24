import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getDb } from "../db/client";
import type { Database } from "../db/connection";
import { ApiError, assertSameOrigin, errorResponse } from "../http/api";
import { SESSION_COOKIE, SESSION_COOKIE_NAMES } from "./cookie";
import { findSession, type AdminPrincipal } from "./session";

/**
 * Camada de acesso (DAL) do painel: toda leitura ou escrita administrativa
 * passa por aqui, e a sessão é sempre conferida no banco — o `proxy.ts` faz
 * apenas uma checagem otimista da presença do cookie.
 */

export function readSessionToken(source: { get(name: string): { value: string } | undefined }): string | null {
  for (const name of [SESSION_COOKIE, ...SESSION_COOKIE_NAMES]) {
    const value = source.get(name)?.value;
    if (value) return value;
  }
  return null;
}

/** Sessão válida para páginas (Server Components). `null` quando não autenticado. */
export async function getAdminForPage(): Promise<AdminPrincipal | null> {
  const store = await cookies();
  return findSession(getDb(), readSessionToken(store));
}

export async function requireAdmin(request: NextRequest, db: Database = getDb()): Promise<AdminPrincipal> {
  const admin = await findSession(db, readSessionToken(request.cookies));
  if (!admin) throw new ApiError(401, "unauthorized", "Sessão ausente ou expirada. Entre novamente.");
  return admin;
}

type AdminHandler<C> = (args: { request: NextRequest; admin: AdminPrincipal; db: Database; context: C }) => Promise<Response>;

/**
 * Envolve uma rota administrativa: exige sessão válida e, em mutações,
 * mesma origem. Qualquer erro vira uma resposta JSON padronizada.
 */
export function adminRoute<C = unknown>(handler: AdminHandler<C>, options: { mutation?: boolean } = {}) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      if (options.mutation) assertSameOrigin(request);
      const db = getDb();
      const admin = await requireAdmin(request, db);
      return await handler({ request, admin, db, context });
    } catch (error) {
      return errorResponse(error);
    }
  };
}
