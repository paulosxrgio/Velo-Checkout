/**
 * Nome e opções do cookie de sessão do painel.
 *
 * Sem imports do servidor: também é usado pelo `proxy.ts`, que só verifica
 * a presença do cookie (checagem otimista). A validação real acontece no
 * servidor, contra o banco, em cada página e API administrativa.
 */

const secure = process.env.NODE_ENV === "production";

/** Em produção, o prefixo `__Host-` exige HTTPS, `Path=/` e nenhum `Domain`. */
export const SESSION_COOKIE = secure ? "__Host-velo_session" : "velo_session";

export const SESSION_COOKIE_NAMES = ["__Host-velo_session", "velo_session"] as const;

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Token de sessão: 32 bytes aleatórios em base64url (43 caracteres). */
export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
