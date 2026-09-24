import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAMES, sessionCookieOptions } from "@/server/auth/cookie";
import { readSessionToken } from "@/server/auth/dal";
import { revokeSession } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { assertSameOrigin, errorResponse, ok } from "@/server/http/api";

/** Revoga a sessão no banco e apaga o cookie. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await revokeSession(getDb(), readSessionToken(request.cookies));
  } catch (error) {
    // Sem mesma origem, não desloga (evita logout forçado por outro site).
    const response = errorResponse(error);
    if (response.status === 403) return response;
  }
  const response = ok({ signedOut: true });
  for (const name of SESSION_COOKIE_NAMES) {
    response.cookies.set(name, "", { ...sessionCookieOptions(new Date(0)), secure: name.startsWith("__Host-") || process.env.NODE_ENV === "production" });
  }
  return response;
}
