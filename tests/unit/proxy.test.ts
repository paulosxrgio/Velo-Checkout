import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

const token = "a".repeat(43);

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie } : {} });
}

describe("proxy (checagem otimista)", () => {
  it("redireciona páginas do painel sem sessão para o login, preservando o destino", () => {
    const response = proxy(request("/admin/pedidos?filtro=atencao"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/entrar?next=%2Fadmin%2Fpedidos%3Ffiltro%3Datencao");
  });

  it("responde 401 em JSON para APIs administrativas sem sessão", async () => {
    const response = proxy(request("/api/admin/settings"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthorized" } });
  });

  it("ignora cookies com formato inválido", () => {
    expect(proxy(request("/admin", "velo_session=abc")).status).toBe(307);
  });

  it("deixa passar quando há cookie com formato válido (a verificação real é no servidor)", () => {
    const response = proxy(request("/admin", `velo_session=${token}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
