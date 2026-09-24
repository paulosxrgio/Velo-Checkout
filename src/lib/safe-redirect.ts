/**
 * Destino seguro após o login: somente caminhos internos do painel.
 * Impede redirecionamento aberto (ex.: ?next=https://site-malicioso).
 */
export function safeAdminPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) return "/admin";
  try {
    const url = new URL(value, "http://velo.local");
    return url.origin === "http://velo.local" && url.pathname.startsWith("/admin") ? `${url.pathname}${url.search}` : "/admin";
  } catch {
    return "/admin";
  }
}
