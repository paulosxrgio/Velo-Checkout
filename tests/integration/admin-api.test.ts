import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as appearanceRoute from "@/app/api/admin/appearance/route";
import * as domainRoute from "@/app/api/admin/domain/route";
import * as orderRoute from "@/app/api/admin/orders/[id]/route";
import * as ordersRoute from "@/app/api/admin/orders/route";
import * as settingsRoute from "@/app/api/admin/settings/route";
import * as shopifyRoute from "@/app/api/admin/shopify/route";
import * as snapshotRoute from "@/app/api/admin/snapshot/route";
import * as whopRoute from "@/app/api/admin/whop/route";
import * as loginRoute from "@/app/api/auth/login/route";
import * as logoutRoute from "@/app/api/auth/logout/route";
import { MAX_FAILURES_PER_EMAIL } from "@/server/auth/login";
import { hashPassword } from "@/server/auth/password";
import { adminSessions, adminUsers, carts, checkoutDomain, paymentAttempts, quotes, shopifyConnection, whopConnections } from "@/server/db/schema";
import { sealSecret } from "@/server/security/secret-box";
import { connectTestDatabase, hasTestDatabase, resetDatabase, testDatabaseUrl } from "../support/database";

const ORIGIN = "http://localhost:3000";
const PASSWORD = "senha-de-teste-bem-longa";

type Handler = (request: NextRequest, context: never) => Promise<Response>;

function call(handler: Handler, path: string, init: { method?: string; cookie?: string; body?: unknown; origin?: string | null; contentType?: string; context?: unknown } = {}) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  if (init.body !== undefined) headers.set("content-type", init.contentType ?? "application/json");
  const request = new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
  return handler(request, (init.context ?? {}) as never);
}

const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function login(email: string, password = PASSWORD) {
  return call(loginRoute.POST as Handler, "/api/auth/login", { method: "POST", body: { email, password } });
}

async function loginCookie(email: string) {
  const response = await login(email);
  expect(response.status).toBe(200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = /velo_session=([^;]+)/.exec(setCookie);
  expect(match, "cookie de sessão ausente").not.toBeNull();
  return { cookie: `velo_session=${match![1]}`, token: match![1], setCookie };
}

describe.skipIf(!hasTestDatabase)("APIs do painel", () => {
  const { db, client } = hasTestDatabase ? connectTestDatabase() : ({} as ReturnType<typeof connectTestDatabase>);

  beforeAll(() => {
    process.env.DATABASE_URL = testDatabaseUrl;
  });
  beforeEach(async () => {
    await resetDatabase(db);
    const passwordHash = await hashPassword(PASSWORD);
    await db.insert(adminUsers).values([
      { email: "ana@loja.example", passwordHash },
      { email: "bruno@loja.example", passwordHash },
      { email: "inativo@loja.example", passwordHash, isActive: false },
    ]);
  });
  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  const readEndpoints: [string, Handler, unknown?][] = [
    ["/api/admin/snapshot", snapshotRoute.GET as Handler],
    ["/api/admin/shopify", shopifyRoute.GET as Handler],
    ["/api/admin/whop", whopRoute.GET as Handler],
    ["/api/admin/domain", domainRoute.GET as Handler],
    ["/api/admin/appearance", appearanceRoute.GET as Handler],
    ["/api/admin/settings", settingsRoute.GET as Handler],
    ["/api/admin/orders", ordersRoute.GET as Handler],
    ["/api/admin/orders/x", orderRoute.GET as Handler, idContext("x")],
  ];
  const writeEndpoints: [string, Handler][] = [
    ["/api/admin/domain", domainRoute.PUT as Handler],
    ["/api/admin/appearance", appearanceRoute.PUT as Handler],
    ["/api/admin/settings", settingsRoute.PUT as Handler],
  ];

  it("recusa todas as APIs sem sessão ou com sessão forjada", async () => {
    const forged = `velo_session=${randomBytes(32).toString("base64url")}`;
    for (const cookie of [undefined, forged, "velo_session=nao-e-um-token"]) {
      for (const [path, handler, context] of readEndpoints) {
        const response = await call(handler, path, { cookie, context });
        expect(response.status, `${path} com cookie ${cookie}`).toBe(401);
      }
      for (const [path, handler] of writeEndpoints) {
        const response = await call(handler, path, { method: "PUT", cookie, body: {} });
        expect(response.status, `PUT ${path} com cookie ${cookie}`).toBe(401);
      }
    }
  });

  it("autentica com cookie httpOnly e guarda apenas o hash do token", async () => {
    const { token, setCookie } = await loginCookie("ANA@loja.example");
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Path=\//);
    const sessions = await db.select({ id: adminSessions.id }).from(adminSessions);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).not.toBe(token);
    expect(sessions[0].id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("dá a mesma resposta para senha errada, e-mail inexistente e usuário inativo", async () => {
    for (const [email, password] of [
      ["ana@loja.example", "senha-incorreta-123"],
      ["ninguem@loja.example", PASSWORD],
      ["inativo@loja.example", PASSWORD],
    ]) {
      const response = await login(email, password);
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: { code: "invalid_credentials", message: "E-mail ou senha incorretos." } });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });

  it("persiste aparência, domínio e configurações entre sessões (navegadores) diferentes", async () => {
    const browserA = await loginCookie("ana@loja.example");
    const browserB = await loginCookie("bruno@loja.example");

    const appearance = { storeName: "Casa Nova", logoUrl: null, primaryColor: "#2A5DB0", supportText: "Atendimento 9h–18h" };
    const saved = await call(appearanceRoute.PUT as Handler, "/api/admin/appearance", { method: "PUT", cookie: browserA.cookie, body: appearance });
    expect(saved.status).toBe(200);

    const settings = {
      environment: "sandbox",
      operationName: "Casa Nova",
      alertEmail: "ops@casanova.example",
      storeUrl: "https://casanova.example/",
      currencyCode: "BRL",
      timezone: "America/Recife",
    };
    expect((await call(settingsRoute.PUT as Handler, "/api/admin/settings", { method: "PUT", cookie: browserA.cookie, body: settings })).status).toBe(200);
    expect(
      (await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie: browserA.cookie, body: { hostname: "Checkout.CasaNova.example" } })).status,
    ).toBe(200);

    const seenByB = await (await call(snapshotRoute.GET as Handler, "/api/admin/snapshot", { cookie: browserB.cookie })).json();
    expect(seenByB.data.appearance).toEqual({ ...appearance, primaryColor: "#2a5db0" });
    expect(seenByB.data.settings).toMatchObject({ operationName: "Casa Nova", storeUrl: "https://casanova.example", timezone: "America/Recife" });
    expect(seenByB.data.domain).toMatchObject({ hostname: "checkout.casanova.example", dnsStatus: "not_started", httpsStatus: "not_started" });
  });

  it("valida entradas no servidor e recusa campos que o painel não pode alterar", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    const base = { storeName: "Loja", logoUrl: null, primaryColor: "#1f4d3a", supportText: "" };

    const extra = await call(appearanceRoute.PUT as Handler, "/api/admin/appearance", { method: "PUT", cookie, body: { ...base, checkoutActive: true } });
    expect(extra.status).toBe(422);

    const badColor = await call(appearanceRoute.PUT as Handler, "/api/admin/appearance", { method: "PUT", cookie, body: { ...base, primaryColor: "verde" } });
    expect(badColor.status).toBe(422);
    expect((await badColor.json()).error.fieldErrors).toHaveProperty("primaryColor");

    const production = await call(settingsRoute.PUT as Handler, "/api/admin/settings", {
      method: "PUT",
      cookie,
      body: { environment: "production", operationName: "Loja", alertEmail: "a@b.co", storeUrl: "https://loja.example", timezone: "America/Sao_Paulo" },
    });
    expect(production.status).toBe(422);
    expect((await production.json()).error.fieldErrors).toHaveProperty("environment");

    const shopifyDomain = await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie, body: { hostname: "loja.myshopify.com" } });
    expect(shopifyDomain.status).toBe(422);

    const malformed = await call(appearanceRoute.PUT as Handler, "/api/admin/appearance", { method: "PUT", cookie, body: "{ não é json" });
    expect(malformed.status).toBe(400);
  });

  it("recusa escritas de outra origem, sem origem ou fora de JSON (CSRF)", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    const body = { hostname: "checkout.loja.example" };
    expect((await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie, body, origin: "https://malicioso.example" })).status).toBe(403);
    expect((await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie, body, origin: null })).status).toBe(403);
    expect((await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie, body: JSON.stringify(body), contentType: "text/plain" })).status).toBe(415);
    expect((await call(loginRoute.POST as Handler, "/api/auth/login", { method: "POST", body: { email: "ana@loja.example", password: PASSWORD }, origin: "https://malicioso.example" })).status).toBe(403);
    const [domain] = await db.select().from(checkoutDomain);
    expect(domain.hostname).toBeNull();
  });

  it("nunca devolve segredos, hashes ou dados sensíveis nas respostas", async () => {
    const key = randomBytes(32);
    const sealedToken = sealSecret("shpat_valor_ficticio", "shopify:access_token", key);
    const sealedKey = sealSecret("whop_chave_ficticia", "whop:api_key", key);
    await db.update(shopifyConnection).set({ accessTokenCiphertext: sealedToken, oauthStateHash: "estado-oauth-hash" });
    await db.update(whopConnections).set({ apiKeyCiphertext: sealedKey, webhookSecretCiphertext: sealedKey });

    const expiresAt = new Date(Date.now() + 3_600_000);
    const [cart] = await db.insert(carts).values({ handoffTokenHash: "h", currencyCode: "BRL", expiresAt }).returning();
    const [quote] = await db
      .insert(quotes)
      .values({ cartId: cart.id, version: 1, currencyCode: "BRL", subtotalAmount: 5000, totalAmount: 5000, lineItems: [], expiresAt })
      .returning();
    const [attempt] = await db
      .insert(paymentAttempts)
      .values({
        cartId: cart.id,
        quoteId: quote.id,
        idempotencyKey: "k1",
        environment: "sandbox",
        amount: 5000,
        currencyCode: "BRL",
        customerEmail: "comprador@exemplo.com",
        customer: { fullName: "Comprador Teste", phone: "11999999999", taxId: "52998224725" },
        shippingAddress: { postalCode: "01310100", street: "Av", number: "1", complement: "", neighborhood: "B", city: "SP", state: "SP", countryCode: "BR" },
      })
      .returning();

    const { cookie } = await loginCookie("ana@loja.example");
    const [user] = await db.select({ passwordHash: adminUsers.passwordHash }).from(adminUsers).where(eq(adminUsers.email, "ana@loja.example"));

    const bodies: string[] = [];
    for (const [path, handler, context] of [...readEndpoints.slice(0, 7), ["/api/admin/orders/id", orderRoute.GET as Handler, idContext(attempt.id)] as const]) {
      const response = await call(handler, path, { cookie, context });
      expect(response.status, path).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      bodies.push(await response.text());
    }
    const all = bodies.join("\n");
    for (const forbidden of [sealedToken, sealedKey, "shpat_valor_ficticio", "estado-oauth-hash", user.passwordHash, "52998224725", "ciphertext", "passwordHash", "oauthState"]) {
      expect(all).not.toContain(forbidden);
    }
    expect(JSON.parse(bodies[6]).data[0]).toMatchObject({ reference: "VC-1001", customer: { name: "Comprador Teste" }, isDemo: false });
  });

  it("mantém as conexões desconectadas: nada é marcado como ativo pelo painel", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    const snapshot = (await (await call(snapshotRoute.GET as Handler, "/api/admin/snapshot", { cookie })).json()).data;
    expect(snapshot.shopify.status).toBe("disconnected");
    expect(snapshot.whop.status).toBe("integration_pending");
    expect(snapshot.whop.webhook.status).toBe("not_configured");
    expect(snapshot.checkoutActive).toBe(false);
  });

  it("zera as verificações quando o subdomínio muda", async () => {
    await db.update(checkoutDomain).set({ hostname: "checkout.antigo.example", dnsStatus: "verified", httpsStatus: "verified", lastCheckedAt: new Date() });
    const { cookie } = await loginCookie("ana@loja.example");
    const response = await call(domainRoute.PUT as Handler, "/api/admin/domain", { method: "PUT", cookie, body: { hostname: "checkout.novo.example" } });
    expect((await response.json()).data).toMatchObject({ hostname: "checkout.novo.example", dnsStatus: "not_started", httpsStatus: "not_started" });
  });

  it("logout revoga a sessão no servidor", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    expect((await call(settingsRoute.GET as Handler, "/api/admin/settings", { cookie })).status).toBe(200);
    const out = await call(logoutRoute.POST as Handler, "/api/auth/logout", { method: "POST", cookie });
    expect(out.status).toBe(200);
    expect((await call(settingsRoute.GET as Handler, "/api/admin/settings", { cookie })).status).toBe(401);
  });

  it("encerra sessões inativas há mais de 12 horas", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    await db.update(adminSessions).set({ lastSeenAt: new Date(Date.now() - 13 * 3_600_000) });
    expect((await call(settingsRoute.GET as Handler, "/api/admin/settings", { cookie })).status).toBe(401);
    expect(await db.select().from(adminSessions)).toHaveLength(0);
  });

  it("bloqueia o login após falhas repetidas, mesmo com a senha certa", async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++) {
      expect((await login("ana@loja.example", "senha-errada-qualquer")).status).toBe(401);
    }
    const blocked = await login("ana@loja.example");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("responde 404 para pedido inexistente ou ID inválido", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    for (const id of ["nao-e-uuid", "00000000-0000-4000-8000-000000000000"]) {
      expect((await call(orderRoute.GET as Handler, `/api/admin/orders/${id}`, { cookie, context: idContext(id) })).status).toBe(404);
    }
  });

  it("falha de forma clara (503) quando DATABASE_URL não está configurada", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    delete process.env.DATABASE_URL;
    try {
      const response = await call(settingsRoute.GET as Handler, "/api/admin/settings", { cookie });
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.error.code).toBe("misconfigured");
      expect(body.error.message).toMatch(/DATABASE_URL/);
    } finally {
      process.env.DATABASE_URL = testDatabaseUrl;
    }
  });

  it("sem migrações aplicadas, orienta a rodar db:migrate", async () => {
    const { cookie } = await loginCookie("ana@loja.example");
    await db.execute(sql`alter table velo.operation_settings rename to operation_settings_tmp`);
    try {
      const response = await call(settingsRoute.GET as Handler, "/api/admin/settings", { cookie });
      expect(response.status).toBe(503);
      expect((await response.json()).error.message).toMatch(/db:migrate/);
    } finally {
      await db.execute(sql`alter table velo.operation_settings_tmp rename to operation_settings`);
    }
  });
});
