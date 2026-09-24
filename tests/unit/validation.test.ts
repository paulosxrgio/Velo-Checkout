import { describe, expect, it } from "vitest";
import { safeAdminPath } from "@/lib/safe-redirect";
import { appearanceInput, domainInput, settingsInput } from "@/server/admin/schemas";

const validAppearance = { storeName: "Loja", logoUrl: null, primaryColor: "#1F4D3A", supportText: "Fale conosco" };
const validSettings = {
  environment: "sandbox",
  operationName: "Operação",
  alertEmail: "OPS@Loja.com.br",
  storeUrl: "https://loja.com.br/",
  currencyCode: "BRL",
  timezone: "America/Sao_Paulo",
};

describe("validação das entradas do painel", () => {
  it("aparência: normaliza cor e recusa campos desconhecidos", () => {
    expect(appearanceInput.parse(validAppearance).primaryColor).toBe("#1f4d3a");
    expect(appearanceInput.safeParse({ ...validAppearance, checkoutActive: true }).success).toBe(false);
    expect(appearanceInput.safeParse({ ...validAppearance, primaryColor: "red" }).success).toBe(false);
    expect(appearanceInput.safeParse({ ...validAppearance, storeName: "  " }).success).toBe(false);
  });

  it("aparência: aceita só data URL de imagem e até 300 KB", () => {
    const png = `data:image/png;base64,${Buffer.alloc(1024).toString("base64")}`;
    expect(appearanceInput.safeParse({ ...validAppearance, logoUrl: png }).success).toBe(true);
    expect(appearanceInput.safeParse({ ...validAppearance, logoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(appearanceInput.safeParse({ ...validAppearance, logoUrl: "data:text/html;base64,PGgxPg==" }).success).toBe(false);
    const big = `data:image/png;base64,${Buffer.alloc(301 * 1024).toString("base64")}`;
    expect(appearanceInput.safeParse({ ...validAppearance, logoUrl: big }).success).toBe(false);
  });

  it("configurações: exige https, fuso suportado e normaliza e-mail e URL", () => {
    const parsed = settingsInput.parse(validSettings);
    expect(parsed.alertEmail).toBe("ops@loja.com.br");
    expect(parsed.storeUrl).toBe("https://loja.com.br");
    expect(settingsInput.safeParse({ ...validSettings, storeUrl: "http://loja.com.br" }).success).toBe(false);
    expect(settingsInput.safeParse({ ...validSettings, timezone: "Europe/Lisbon" }).success).toBe(false);
    expect(settingsInput.safeParse({ ...validSettings, environment: "staging" }).success).toBe(false);
  });

  it("domínio: exige subdomínio da marca", () => {
    expect(domainInput.parse({ hostname: "Checkout.MinhaLoja.com" }).hostname).toBe("checkout.minhaloja.com");
    expect(domainInput.safeParse({ hostname: "minhaloja.com" }).success).toBe(false);
    expect(domainInput.safeParse({ hostname: "loja.myshopify.com" }).success).toBe(false);
    expect(domainInput.safeParse({ hostname: "checkout.minhaloja.com/x" }).success).toBe(false);
  });

  it("redirecionamento pós-login fica dentro do painel", () => {
    expect(safeAdminPath("/admin/pedidos?filtro=atencao")).toBe("/admin/pedidos?filtro=atencao");
    expect(safeAdminPath("https://malicioso.example/admin")).toBe("/admin");
    expect(safeAdminPath("//malicioso.example")).toBe("/admin");
    expect(safeAdminPath("/admin/../entrar")).toBe("/admin");
    expect(safeAdminPath(null)).toBe("/admin");
  });
});
