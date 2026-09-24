import { desc, eq } from "drizzle-orm";
import type { OperationSnapshot } from "@/domain/types";
import { ConfigError } from "../config";
import type { Database } from "../db/connection";
import { checkoutDomain, operationSettings, paymentAttempts, quotes, shopifyConnection, whopConnections } from "../db/schema";
import {
  toAppearance,
  toDomainSettings,
  toOperationSettings,
  toOrder,
  toShopifyConnection,
  toWhopConnection,
} from "./dto";
import type { AppearanceInput, SettingsInput } from "./schemas";

/**
 * Leituras e escritas do painel. Recebe o banco por parâmetro para ser
 * testável; quem chama (as rotas) já verificou a sessão do administrador.
 */

function missingSeed(table: string): never {
  throw new ConfigError(`A linha inicial de ${table} não existe. Rode \`npm run db:migrate\` neste banco.`);
}

export async function getSettingsRow(db: Database) {
  const [row] = await db.select().from(operationSettings).where(eq(operationSettings.id, 1)).limit(1);
  return row ?? missingSeed("velo.operation_settings");
}

export async function getDomainRow(db: Database) {
  const [row] = await db.select().from(checkoutDomain).where(eq(checkoutDomain.id, 1)).limit(1);
  return row ?? missingSeed("velo.checkout_domain");
}

export async function getShopifyRow(db: Database) {
  const [row] = await db.select().from(shopifyConnection).where(eq(shopifyConnection.id, 1)).limit(1);
  return row ?? missingSeed("velo.shopify_connection");
}

export async function getWhopRow(db: Database, environment: "sandbox" | "production") {
  const [row] = await db.select().from(whopConnections).where(eq(whopConnections.environment, environment)).limit(1);
  return row ?? missingSeed(`velo.whop_connections (${environment})`);
}

export async function getSnapshot(db: Database): Promise<OperationSnapshot> {
  const settings = await getSettingsRow(db);
  const [domain, shopify, whop] = await Promise.all([getDomainRow(db), getShopifyRow(db), getWhopRow(db, settings.paymentEnvironment)]);
  return {
    shopify: toShopifyConnection(shopify),
    whop: toWhopConnection(whop),
    domain: toDomainSettings(domain),
    appearance: toAppearance(settings),
    settings: toOperationSettings(settings),
    sandboxTestPassed: settings.sandboxTestPassedAt !== null,
    checkoutActive: settings.checkoutActive,
  };
}

export async function updateAppearance(db: Database, input: AppearanceInput, userId: string) {
  const [row] = await db
    .update(operationSettings)
    .set({
      storeName: input.storeName,
      logoDataUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      supportText: input.supportText,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(operationSettings.id, 1))
    .returning();
  return toAppearance(row ?? missingSeed("velo.operation_settings"));
}

/** Produção só é permitida com Shopify e Whop (produção) conectadas e verificadas. */
export async function canUseProduction(db: Database): Promise<boolean> {
  const [shopify, whop] = await Promise.all([getShopifyRow(db), getWhopRow(db, "production")]);
  return shopify.status === "connected" && whop.status === "connected";
}

export async function updateSettings(db: Database, input: SettingsInput, userId: string) {
  const [row] = await db
    .update(operationSettings)
    .set({
      paymentEnvironment: input.environment,
      operationName: input.operationName,
      alertEmail: input.alertEmail,
      storeUrl: input.storeUrl,
      timezone: input.timezone,
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(operationSettings.id, 1))
    .returning();
  return toOperationSettings(row ?? missingSeed("velo.operation_settings"));
}

/**
 * Salva o subdomínio. Ao trocar de endereço, todas as verificações voltam a
 * "não iniciada": nada fica marcado como verificado sem uma checagem real.
 */
export async function updateHostname(db: Database, hostname: string, userId: string) {
  const current = await getDomainRow(db);
  const changed = current.hostname !== hostname;
  const [row] = await db
    .update(checkoutDomain)
    .set({
      hostname,
      ...(changed ? { dnsStatus: "not_started", httpsStatus: "not_started", applePayStatus: "not_started", lastCheckedAt: null } : {}),
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(checkoutDomain.id, 1))
    .returning();
  return toDomainSettings(row ?? missingSeed("velo.checkout_domain"));
}

export async function listOrders(db: Database, limit = 200) {
  const rows = await db
    .select()
    .from(paymentAttempts)
    .leftJoin(quotes, eq(quotes.id, paymentAttempts.quoteId))
    .orderBy(desc(paymentAttempts.createdAt))
    .limit(limit);
  return rows.map((row) => toOrder(row.payment_attempts, row.quotes));
}

export async function getOrder(db: Database, id: string) {
  const [row] = await db
    .select()
    .from(paymentAttempts)
    .leftJoin(quotes, eq(quotes.id, paymentAttempts.quoteId))
    .where(eq(paymentAttempts.id, id))
    .limit(1);
  return row ? toOrder(row.payment_attempts, row.quotes) : null;
}
