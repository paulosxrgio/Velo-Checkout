import { sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/server/db/connection";
import { carts, operationSettings, paymentAttempts, quotes, shopifyConnection, webhookEvents, whopConnections } from "@/server/db/schema";
import { connectTestDatabase, hasTestDatabase, resetDatabase, testDatabaseUrl } from "../support/database";

/** Código do Postgres na causa do erro lançado pelo Drizzle. */
function pgCode(error: unknown): string | undefined {
  return ((error as { cause?: { code?: string } }).cause ?? (error as { code?: string })).code;
}

async function expectViolation(promise: Promise<unknown>, code: "23505" | "23514") {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, "a operação deveria ter sido recusada pelo banco").not.toBeNull();
  expect(pgCode(error)).toBe(code);
}

describe.skipIf(!hasTestDatabase)("migrações e restrições do banco", () => {
  const { db, client } = hasTestDatabase ? connectTestDatabase() : ({} as ReturnType<typeof connectTestDatabase>);

  beforeAll(async () => {
    await resetDatabase(db);
  });
  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterAll(async () => {
    await client.end({ timeout: 5 });
  });

  it("reaplicar as migrações não altera nada (reprodutíveis e idempotentes)", async () => {
    await runMigrations(testDatabaseUrl);
    const rows = await db.execute<{ total: number }>(sql`select count(*)::int as total from drizzle.__drizzle_migrations`);
    expect(rows[0].total).toBe(2);
  });

  it("cria as linhas iniciais de configuração da loja única", async () => {
    const [settings] = await db.select().from(operationSettings);
    expect(settings).toMatchObject({ id: 1, paymentEnvironment: "sandbox", checkoutActive: false });
    const whop = await db.select({ environment: whopConnections.environment, status: whopConnections.status }).from(whopConnections);
    expect(whop).toEqual(
      expect.arrayContaining([
        { environment: "sandbox", status: "disconnected" },
        { environment: "production", status: "disconnected" },
      ]),
    );
    await expectViolation(db.insert(operationSettings).values({ id: 2 }), "23514");
  });

  it("liga RLS em todas as tabelas e nega acesso aos papéis públicos do Supabase", async () => {
    const withoutRls = await db.execute(
      sql`select relname from pg_class where relnamespace = 'velo'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    expect(withoutRls).toHaveLength(0);

    const roles = await db.execute<{ rolname: string }>(sql`select rolname from pg_roles where rolname in ('anon', 'authenticated')`);
    for (const { rolname } of roles) {
      const [privileges] = await db.execute<{ usage: boolean; select: boolean }>(
        sql`select has_schema_privilege(${rolname}, 'velo', 'USAGE') as usage,
                   has_table_privilege(${rolname}, 'velo.operation_settings', 'SELECT') as select`,
      );
      expect(privileges).toEqual({ usage: false, select: false });
    }
  });

  it("não permite marcar conexões como ativas sem verificação real", async () => {
    await expectViolation(db.update(shopifyConnection).set({ status: "connected", shopDomain: "loja.myshopify.com" }), "23514");
    await expectViolation(db.update(whopConnections).set({ status: "connected", companyId: "biz_x" }), "23514");
    await expectViolation(db.update(whopConnections).set({ webhookStatus: "active" }), "23514");
    await expectViolation(db.update(operationSettings).set({ checkoutActive: true }), "23514");
    await expectViolation(db.execute(sql`update velo.checkout_domain set hostname = 'checkout.loja.com', dns_status = 'verified'`), "23514");
  });

  it("garante idempotência e consistência de carrinhos, cotações, tentativas e webhooks", async () => {
    const expiresAt = new Date(Date.now() + 3_600_000);
    const [cart] = await db.insert(carts).values({ handoffTokenHash: "hash-1", currencyCode: "BRL", expiresAt }).returning();
    await expectViolation(db.insert(carts).values({ handoffTokenHash: "hash-1", currencyCode: "BRL", expiresAt }), "23505");

    const quoteBase = { cartId: cart.id, currencyCode: "BRL", subtotalAmount: 10000, shippingAmount: 1500, lineItems: [], expiresAt };
    await expectViolation(db.insert(quotes).values({ ...quoteBase, version: 1, totalAmount: 99999 }), "23514");
    const [quote] = await db.insert(quotes).values({ ...quoteBase, version: 1, totalAmount: 11500 }).returning();
    await expectViolation(db.insert(quotes).values({ ...quoteBase, version: 2, totalAmount: 11500 }), "23505");

    const attempt = {
      cartId: cart.id,
      quoteId: quote.id,
      environment: "sandbox" as const,
      amount: 11500,
      currencyCode: "BRL",
      customerEmail: "comprador@exemplo.com",
      customer: { fullName: "Comprador Teste" },
      shippingAddress: {},
    };
    const [first] = await db.insert(paymentAttempts).values({ ...attempt, idempotencyKey: "idem-1" }).returning();
    expect(first.orderNumber).toBe(1001);
    await expectViolation(db.insert(paymentAttempts).values({ ...attempt, idempotencyKey: "idem-1", status: "failed" }), "23505");
    await expectViolation(db.insert(paymentAttempts).values({ ...attempt, idempotencyKey: "idem-2" }), "23505");
    await expectViolation(db.update(paymentAttempts).set({ status: "paid" }), "23514");
    await expectViolation(db.update(paymentAttempts).set({ shopifySyncStatus: "pending" }), "23514");

    const event = { provider: "whop" as const, providerEventId: "evt_1", eventType: "payment.succeeded", payload: {}, payloadSha256: "x" };
    await db.insert(webhookEvents).values(event);
    await expectViolation(db.insert(webhookEvents).values(event), "23505");
    await expectViolation(db.update(webhookEvents).set({ status: "processed" }), "23514");
  });
});
