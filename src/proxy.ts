import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAMES, SESSION_TOKEN_PATTERN } from "./server/auth/cookie";

/**
 * Checagem otimista do painel (Next.js 16: `proxy` substitui `middleware`).
 *
 * Só verifica se existe um cookie de sessão com formato válido — sem banco,
 * como recomenda a documentação do Next. A validação real acontece no
 * servidor: no layout de /admin e em cada rota /api/admin (src/server/auth/dal.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => {
    const value = request.cookies.get(name)?.value;
    return Boolean(value && SESSION_TOKEN_PATTERN.test(value));
  });

  if (pathname.startsWith("/api/admin")) {
    if (hasSessionCookie) return NextResponse.next();
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sessão ausente ou expirada. Entre novamente." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!hasSessionCookie) {
    const login = new URL("/entrar", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // Informa ao layout qual página foi pedida, para voltar a ela após um novo login.
  const headers = new Headers(request.headers);
  headers.set("x-velo-pathname", `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
