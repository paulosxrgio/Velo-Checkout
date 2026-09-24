import type { NextRequest } from "next/server";
import { loginInput } from "@/server/admin/schemas";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/auth/cookie";
import { login } from "@/server/auth/login";
import { getDb } from "@/server/db/client";
import { ApiError, assertSameOrigin, clientIp, errorResponse, ok, readJson } from "@/server/http/api";

/** Autentica um administrador e grava o cookie de sessão (httpOnly). */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const input = await readJson(request, loginInput);
    const result = await login(getDb(), {
      email: input.email,
      password: input.password,
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    if (!result.ok) {
      if (result.reason === "rate_limited") {
        const minutes = Math.ceil(result.retryAfterSeconds / 60);
        throw new ApiError(429, "rate_limited", `Muitas tentativas. Tente novamente em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`, undefined, {
          "Retry-After": String(result.retryAfterSeconds),
        });
      }
      throw new ApiError(401, "invalid_credentials", "E-mail ou senha incorretos.");
    }

    const response = ok({ authenticated: true });
    response.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions(result.expiresAt));
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
