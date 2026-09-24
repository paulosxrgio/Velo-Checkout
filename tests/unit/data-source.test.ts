import { afterEach, describe, expect, it } from "vitest";
import { DataSourceConfigError, getAdminGateway, getCheckoutGateway, resolveDataSource, toGatewayError } from "@/data";
import { demoCheckoutGateway } from "@/data/demo/checkout-gateway";
import { httpAdminGateway } from "@/data/http/admin-gateway";
import { liveCheckoutGateway } from "@/data/live/checkout-gateway";

const original = process.env.NEXT_PUBLIC_DATA_SOURCE;

function setSource(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  else process.env.NEXT_PUBLIC_DATA_SOURCE = value;
}

describe("seleção explícita da fonte de dados", () => {
  afterEach(() => setSource(original));

  it("exige um valor explícito e válido", () => {
    setSource(undefined);
    expect(() => resolveDataSource()).toThrow(DataSourceConfigError);
    setSource("producao");
    expect(() => resolveDataSource()).toThrow(/inválido/);
    setSource("api");
    expect(resolveDataSource()).toBe("api");
    setSource("demo");
    expect(resolveDataSource()).toBe("demo");
  });

  it("painel usa o adaptador HTTP no modo api e nunca cai para demo", () => {
    setSource("api");
    expect(getAdminGateway()).toBe(httpAdminGateway);
    setSource("demo");
    expect(() => getAdminGateway()).toThrow(DataSourceConfigError);
    setSource(undefined);
    expect(() => getAdminGateway()).toThrow(DataSourceConfigError);
  });

  it("checkout: cenários demo só pelo adaptador demo; carrinhos reais pelo adaptador real", () => {
    setSource("api");
    expect(getCheckoutGateway({ cartToken: "demo" })).toBe(demoCheckoutGateway);
    expect(getCheckoutGateway({ cartToken: "demo-indisponivel" })).toBe(demoCheckoutGateway);
    expect(getCheckoutGateway({ cartToken: "tok_real_123" })).toBe(liveCheckoutGateway);
    expect(getCheckoutGateway({ cartToken: "demonstracao" })).toBe(liveCheckoutGateway);
    expect(getCheckoutGateway({ attemptId: "tent_demo_abc" })).toBe(demoCheckoutGateway);
    expect(getCheckoutGateway({ attemptId: "0b6c…" })).toBe(liveCheckoutGateway);
    setSource(undefined);
    expect(() => getCheckoutGateway({ cartToken: "demo" })).toThrow(DataSourceConfigError);
  });

  it("carrinho real falha explicitamente em vez de mostrar dados demo", async () => {
    await expect(liveCheckoutGateway.getCheckout("tok_real_123")).rejects.toMatchObject({ code: "not_implemented" });
    await expect(liveCheckoutGateway.getStorefront()).rejects.toMatchObject({ code: "not_implemented" });
  });

  it("erro de configuração chega à interface como 'misconfigured'", () => {
    const error = toGatewayError(new DataSourceConfigError("faltou configurar"));
    expect(error.code).toBe("misconfigured");
    expect(error.message).toBe("faltou configurar");
  });
});
