import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema do banco do Velo Checkout (Postgres/Supabase).
 *
 * Tudo fica no schema `velo`, que não é exposto pela API REST do Supabase.
 * A migração de endurecimento também remove o acesso de `anon`/`authenticated`
 * e liga RLS em todas as tabelas: somente o servidor, conectado como dono do
 * schema, lê e escreve.
 *
 * Convenções:
 * - valores monetários em centavos (`bigint`);
 * - estados como `text` com `check`, para evoluir sem recriar tipos;
 * - tabelas "singleton" (`id = 1`) para a operação de loja única;
 * - chaves únicas pensadas para idempotência das próximas etapas
 *   (repasse de carrinho, sessões da Whop, webhooks e pedidos Shopify).
 */
export const velo = pgSchema("velo");

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const inList = (column: unknown, values: readonly string[]) =>
  sql`${column} in (${sql.join(
    values.map((v) => sql.raw(`'${v}'`)),
    sql`, `,
  )})`;

export const PAYMENT_ENVIRONMENTS = ["sandbox", "production"] as const;
export const VERIFICATION_STATUSES = ["not_started", "pending", "verified", "failed"] as const;
export const SHOPIFY_CONNECTION_STATUSES = ["disconnected", "connecting", "connected", "error"] as const;
export const WHOP_CONNECTION_STATUSES = ["disconnected", "connected", "error"] as const;
export const WEBHOOK_STATUSES = ["not_configured", "pending", "active", "failing"] as const;
export const CART_STATUSES = ["received", "validated", "rejected", "expired", "converted"] as const;
export const QUOTE_STATUSES = ["open", "locked", "superseded", "expired"] as const;
export const PAYMENT_ATTEMPT_STATUSES = [
  "created",
  "awaiting_payment",
  "processing",
  "paid",
  "failed",
  "expired",
  "canceled",
  "refunded",
] as const;
export const SHOPIFY_SYNC_STATUSES = ["not_started", "pending", "synced", "failed"] as const;
export const WEBHOOK_PROVIDERS = ["whop", "shopify"] as const;
export const WEBHOOK_EVENT_STATUSES = ["received", "processing", "processed", "ignored", "failed"] as const;

/* -------------------------------------------------------------------------- */
/* Acesso administrativo                                                      */
/* -------------------------------------------------------------------------- */

export const adminUsers = velo
  .table(
    "admin_users",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      email: text("email").notNull(),
      /** scrypt com parâmetros embutidos (ver src/server/auth/password.ts). */
      passwordHash: text("password_hash").notNull(),
      displayName: text("display_name"),
      isActive: boolean("is_active").notNull().default(true),
      lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
      ...timestamps,
    },
    (t) => [unique("admin_users_email_key").on(t.email), check("admin_users_email_lowercase", sql`${t.email} = lower(${t.email})`)],
  )
  .enableRLS();

export const adminSessions = velo
  .table(
    "admin_sessions",
    {
      /** SHA-256 (hex) do token do cookie. O token em si nunca é gravado. */
      id: text("id").primaryKey(),
      userId: uuid("user_id")
        .notNull()
        .references(() => adminUsers.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
      lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      userAgent: text("user_agent"),
      ipAddress: text("ip_address"),
    },
    (t) => [index("admin_sessions_user_idx").on(t.userId), index("admin_sessions_expires_idx").on(t.expiresAt)],
  )
  .enableRLS();

export const adminLoginAttempts = velo
  .table(
    "admin_login_attempts",
    {
      id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
      email: text("email").notNull(),
      ipAddress: text("ip_address"),
      succeeded: boolean("succeeded").notNull(),
      attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      index("admin_login_attempts_email_idx").on(t.email, t.attemptedAt),
      index("admin_login_attempts_ip_idx").on(t.ipAddress, t.attemptedAt),
    ],
  )
  .enableRLS();

/* -------------------------------------------------------------------------- */
/* Configuração da operação (loja única)                                      */
/* -------------------------------------------------------------------------- */

export const operationSettings = velo
  .table(
    "operation_settings",
    {
      id: smallint("id").primaryKey().default(1),
      operationName: text("operation_name").notNull().default(""),
      alertEmail: text("alert_email"),
      storeUrl: text("store_url"),
      currencyCode: char("currency_code", { length: 3 }).notNull().default("BRL"),
      timezone: text("timezone").notNull().default("America/Sao_Paulo"),
      paymentEnvironment: text("payment_environment").$type<(typeof PAYMENT_ENVIRONMENTS)[number]>().notNull().default("sandbox"),
      storeName: text("store_name").notNull().default(""),
      /** Data URL do logotipo (até ~300 KB). Mover para storage de arquivos quando houver upload real. */
      logoDataUrl: text("logo_data_url"),
      primaryColor: text("primary_color").notNull().default("#1f4d3a"),
      supportText: text("support_text").notNull().default(""),
      /** Só pode ser ativado depois de uma compra de teste confirmada no servidor. */
      checkoutActive: boolean("checkout_active").notNull().default(false),
      sandboxTestPassedAt: timestamp("sandbox_test_passed_at", { withTimezone: true }),
      updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
      ...timestamps,
    },
    (t) => [
      check("operation_settings_singleton", sql`${t.id} = 1`),
      check("operation_settings_environment", inList(t.paymentEnvironment, PAYMENT_ENVIRONMENTS)),
      check("operation_settings_primary_color", sql`${t.primaryColor} ~ '^#[0-9a-f]{6}$'`),
      check("operation_settings_currency", sql`${t.currencyCode} ~ '^[A-Z]{3}$'`),
      check("operation_settings_activation_requires_test", sql`not ${t.checkoutActive} or ${t.sandboxTestPassedAt} is not null`),
    ],
  )
  .enableRLS();

export const checkoutDomain = velo
  .table(
    "checkout_domain",
    {
      id: smallint("id").primaryKey().default(1),
      hostname: text("hostname"),
      dnsStatus: text("dns_status").$type<(typeof VERIFICATION_STATUSES)[number]>().notNull().default("not_started"),
      httpsStatus: text("https_status").$type<(typeof VERIFICATION_STATUSES)[number]>().notNull().default("not_started"),
      applePayStatus: text("apple_pay_status").$type<(typeof VERIFICATION_STATUSES)[number]>().notNull().default("not_started"),
      lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
      updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
      ...timestamps,
    },
    (t) => [
      check("checkout_domain_singleton", sql`${t.id} = 1`),
      unique("checkout_domain_hostname_key").on(t.hostname),
      check("checkout_domain_hostname_lowercase", sql`${t.hostname} = lower(${t.hostname})`),
      check("checkout_domain_dns_status", inList(t.dnsStatus, VERIFICATION_STATUSES)),
      check("checkout_domain_https_status", inList(t.httpsStatus, VERIFICATION_STATUSES)),
      check("checkout_domain_apple_pay_status", inList(t.applePayStatus, VERIFICATION_STATUSES)),
      // Nada é "verificado" sem um subdomínio e uma verificação registrada.
      check(
        "checkout_domain_verified_requires_check",
        sql`(${t.dnsStatus} <> 'verified' and ${t.httpsStatus} <> 'verified' and ${t.applePayStatus} <> 'verified')
          or (${t.hostname} is not null and ${t.lastCheckedAt} is not null)`,
      ),
    ],
  )
  .enableRLS();

/* -------------------------------------------------------------------------- */
/* Conexões                                                                   */
/* -------------------------------------------------------------------------- */

export const shopifyConnection = velo
  .table(
    "shopify_connection",
    {
      id: smallint("id").primaryKey().default(1),
      shopDomain: text("shop_domain"),
      status: text("status").$type<(typeof SHOPIFY_CONNECTION_STATUSES)[number]>().notNull().default("disconnected"),
      grantedScopes: text("granted_scopes").array().notNull().default(sql`'{}'::text[]`),
      /** Token de acesso cifrado com AES-256-GCM (ver src/server/security/secret-box.ts). */
      accessTokenCiphertext: text("access_token_ciphertext"),
      /** Hash do `state` do OAuth em andamento, para validar o retorno. */
      oauthStateHash: text("oauth_state_hash"),
      oauthStateExpiresAt: timestamp("oauth_state_expires_at", { withTimezone: true }),
      installedAt: timestamp("installed_at", { withTimezone: true }),
      uninstalledAt: timestamp("uninstalled_at", { withTimezone: true }),
      lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
      lastError: text("last_error"),
      ...timestamps,
    },
    (t) => [
      check("shopify_connection_singleton", sql`${t.id} = 1`),
      check("shopify_connection_status", inList(t.status, SHOPIFY_CONNECTION_STATUSES)),
      check("shopify_connection_shop_domain", sql`${t.shopDomain} ~ '^[a-z0-9][a-z0-9-]*\\.myshopify\\.com$'`),
      // Conectada somente com token guardado e verificação real registrada.
      check(
        "shopify_connection_connected_requires_verification",
        sql`${t.status} <> 'connected' or (${t.shopDomain} is not null and ${t.accessTokenCiphertext} is not null and ${t.lastVerifiedAt} is not null)`,
      ),
    ],
  )
  .enableRLS();

export const whopConnections = velo
  .table(
    "whop_connections",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      environment: text("environment").$type<(typeof PAYMENT_ENVIRONMENTS)[number]>().notNull(),
      status: text("status").$type<(typeof WHOP_CONNECTION_STATUSES)[number]>().notNull().default("disconnected"),
      companyId: text("company_id"),
      accountName: text("account_name"),
      apiKeyCiphertext: text("api_key_ciphertext"),
      webhookSecretCiphertext: text("webhook_secret_ciphertext"),
      webhookEndpointUrl: text("webhook_endpoint_url"),
      webhookStatus: text("webhook_status").$type<(typeof WEBHOOK_STATUSES)[number]>().notNull().default("not_configured"),
      webhookLastEventAt: timestamp("webhook_last_event_at", { withTimezone: true }),
      lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
      lastError: text("last_error"),
      ...timestamps,
    },
    (t) => [
      unique("whop_connections_environment_key").on(t.environment),
      check("whop_connections_environment", inList(t.environment, PAYMENT_ENVIRONMENTS)),
      check("whop_connections_status", inList(t.status, WHOP_CONNECTION_STATUSES)),
      check("whop_connections_webhook_status", inList(t.webhookStatus, WEBHOOK_STATUSES)),
      check(
        "whop_connections_connected_requires_verification",
        sql`${t.status} <> 'connected' or (${t.apiKeyCiphertext} is not null and ${t.companyId} is not null and ${t.lastVerifiedAt} is not null)`,
      ),
      check(
        "whop_connections_webhook_active_requires_event",
        sql`${t.webhookStatus} <> 'active' or (${t.webhookSecretCiphertext} is not null and ${t.webhookLastEventAt} is not null)`,
      ),
    ],
  )
  .enableRLS();

/* -------------------------------------------------------------------------- */
/* Checkout: carrinhos, cotações e tentativas de pagamento                    */
/* -------------------------------------------------------------------------- */

export const carts = velo
  .table(
    "carts",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      /** SHA-256 do token de repasse vindo da loja. Único: o mesmo repasse nunca gera dois carrinhos. */
      handoffTokenHash: text("handoff_token_hash").notNull(),
      shopDomain: text("shop_domain"),
      shopifyCartToken: text("shopify_cart_token"),
      currencyCode: char("currency_code", { length: 3 }).notNull(),
      /** Itens como recebidos (variante, quantidade, preço informado). Preços confiáveis ficam na cotação. */
      lineItems: jsonb("line_items").notNull().default(sql`'[]'::jsonb`),
      status: text("status").$type<(typeof CART_STATUSES)[number]>().notNull().default("received"),
      rejectionReason: text("rejection_reason"),
      receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
      validatedAt: timestamp("validated_at", { withTimezone: true }),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      ...timestamps,
    },
    (t) => [
      unique("carts_handoff_token_hash_key").on(t.handoffTokenHash),
      check("carts_status", inList(t.status, CART_STATUSES)),
      check("carts_currency", sql`${t.currencyCode} ~ '^[A-Z]{3}$'`),
      index("carts_status_expires_idx").on(t.status, t.expiresAt),
    ],
  )
  .enableRLS();

export const quotes = velo
  .table(
    "quotes",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      cartId: uuid("cart_id")
        .notNull()
        .references(() => carts.id, { onDelete: "cascade" }),
      version: integer("version").notNull(),
      status: text("status").$type<(typeof QUOTE_STATUSES)[number]>().notNull().default("open"),
      currencyCode: char("currency_code", { length: 3 }).notNull(),
      subtotalAmount: bigint("subtotal_amount", { mode: "number" }).notNull(),
      discountAmount: bigint("discount_amount", { mode: "number" }).notNull().default(0),
      shippingAmount: bigint("shipping_amount", { mode: "number" }).notNull().default(0),
      taxAmount: bigint("tax_amount", { mode: "number" }).notNull().default(0),
      taxesIncluded: boolean("taxes_included").notNull().default(true),
      totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
      discountCodes: text("discount_codes").array().notNull().default(sql`'{}'::text[]`),
      shippingRate: jsonb("shipping_rate"),
      lineItems: jsonb("line_items").notNull(),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      lockedAt: timestamp("locked_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
      unique("quotes_cart_version_key").on(t.cartId, t.version),
      // No máximo uma cotação aberta por carrinho.
      uniqueIndex("quotes_one_open_per_cart").on(t.cartId).where(sql`${t.status} = 'open'`),
      check("quotes_status", inList(t.status, QUOTE_STATUSES)),
      check(
        "quotes_amounts_non_negative",
        sql`${t.subtotalAmount} >= 0 and ${t.discountAmount} >= 0 and ${t.shippingAmount} >= 0 and ${t.taxAmount} >= 0 and ${t.totalAmount} >= 0`,
      ),
      // O total precisa bater com as parcelas: nenhuma cotação inconsistente é gravada.
      check(
        "quotes_total_matches_parts",
        sql`${t.totalAmount} = ${t.subtotalAmount} - ${t.discountAmount} + ${t.shippingAmount} + case when ${t.taxesIncluded} then 0 else ${t.taxAmount} end`,
      ),
      check("quotes_locked_requires_timestamp", sql`${t.status} <> 'locked' or ${t.lockedAt} is not null`),
    ],
  )
  .enableRLS();

export const paymentAttempts = velo
  .table(
    "payment_attempts",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      /** Número sequencial exibido à operação (ex.: VC-1001). */
      orderNumber: bigint("order_number", { mode: "number" }).notNull().generatedAlwaysAsIdentity({ startWith: 1001 }),
      cartId: uuid("cart_id")
        .notNull()
        .references(() => carts.id, { onDelete: "restrict" }),
      quoteId: uuid("quote_id")
        .notNull()
        .references(() => quotes.id, { onDelete: "restrict" }),
      /** Chave enviada pelo cliente ao iniciar o pagamento: repetir o pedido não cria outra sessão. */
      idempotencyKey: text("idempotency_key").notNull(),
      provider: text("provider").notNull().default("whop"),
      environment: text("environment").$type<(typeof PAYMENT_ENVIRONMENTS)[number]>().notNull(),
      status: text("status").$type<(typeof PAYMENT_ATTEMPT_STATUSES)[number]>().notNull().default("created"),
      amount: bigint("amount", { mode: "number" }).notNull(),
      currencyCode: char("currency_code", { length: 3 }).notNull(),
      whopCheckoutSessionId: text("whop_checkout_session_id"),
      whopPaymentId: text("whop_payment_id"),
      customerEmail: text("customer_email").notNull(),
      /** Nome, telefone e CPF do comprador (dados pessoais: acesso restrito ao servidor). */
      customer: jsonb("customer").notNull(),
      shippingAddress: jsonb("shipping_address").notNull(),
      failureCode: text("failure_code"),
      failureMessage: text("failure_message"),
      paidAt: timestamp("paid_at", { withTimezone: true }),
      expiresAt: timestamp("expires_at", { withTimezone: true }),
      shopifySyncStatus: text("shopify_sync_status").$type<(typeof SHOPIFY_SYNC_STATUSES)[number]>().notNull().default("not_started"),
      shopifyOrderId: text("shopify_order_id"),
      shopifyOrderName: text("shopify_order_name"),
      shopifySyncAttempts: integer("shopify_sync_attempts").notNull().default(0),
      shopifyLastError: text("shopify_last_error"),
      shopifySyncedAt: timestamp("shopify_synced_at", { withTimezone: true }),
      ...timestamps,
    },
    (t) => [
      unique("payment_attempts_order_number_key").on(t.orderNumber),
      unique("payment_attempts_idempotency_key_key").on(t.idempotencyKey),
      unique("payment_attempts_whop_session_key").on(t.whopCheckoutSessionId),
      unique("payment_attempts_whop_payment_key").on(t.whopPaymentId),
      unique("payment_attempts_shopify_order_key").on(t.shopifyOrderId),
      // Uma única tentativa em andamento por cotação.
      uniqueIndex("payment_attempts_one_active_per_quote")
        .on(t.quoteId)
        .where(sql`${t.status} in ('created', 'awaiting_payment', 'processing')`),
      index("payment_attempts_status_idx").on(t.status, t.createdAt),
      index("payment_attempts_sync_idx").on(t.shopifySyncStatus),
      check("payment_attempts_provider", sql`${t.provider} = 'whop'`),
      check("payment_attempts_environment", inList(t.environment, PAYMENT_ENVIRONMENTS)),
      check("payment_attempts_status", inList(t.status, PAYMENT_ATTEMPT_STATUSES)),
      check("payment_attempts_sync_status", inList(t.shopifySyncStatus, SHOPIFY_SYNC_STATUSES)),
      check("payment_attempts_amount_positive", sql`${t.amount} > 0`),
      // "Pago" exige confirmação registrada do provedor.
      check(
        "payment_attempts_paid_requires_confirmation",
        sql`${t.status} not in ('paid', 'refunded') or (${t.paidAt} is not null and ${t.whopPaymentId} is not null)`,
      ),
      // Sincronização com a Shopify só começa depois do pagamento confirmado.
      check(
        "payment_attempts_sync_requires_payment",
        sql`${t.shopifySyncStatus} = 'not_started' or ${t.status} in ('paid', 'refunded')`,
      ),
      check(
        "payment_attempts_synced_requires_order",
        sql`${t.shopifySyncStatus} <> 'synced' or (${t.shopifyOrderId} is not null and ${t.shopifySyncedAt} is not null)`,
      ),
    ],
  )
  .enableRLS();

/* -------------------------------------------------------------------------- */
/* Webhooks                                                                   */
/* -------------------------------------------------------------------------- */

export const webhookEvents = velo
  .table(
    "webhook_events",
    {
      id: uuid("id").primaryKey().defaultRandom(),
      provider: text("provider").$type<(typeof WEBHOOK_PROVIDERS)[number]>().notNull(),
      /** ID do evento no provedor. Único por provedor: reentregas não são processadas duas vezes. */
      providerEventId: text("provider_event_id").notNull(),
      eventType: text("event_type").notNull(),
      payload: jsonb("payload").notNull(),
      payloadSha256: text("payload_sha256").notNull(),
      signatureVerified: boolean("signature_verified").notNull().default(false),
      status: text("status").$type<(typeof WEBHOOK_EVENT_STATUSES)[number]>().notNull().default("received"),
      attempts: integer("attempts").notNull().default(0),
      lastError: text("last_error"),
      paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "set null" }),
      receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
      processedAt: timestamp("processed_at", { withTimezone: true }),
    },
    (t) => [
      unique("webhook_events_provider_event_key").on(t.provider, t.providerEventId),
      index("webhook_events_status_idx").on(t.status, t.receivedAt),
      check("webhook_events_provider", inList(t.provider, WEBHOOK_PROVIDERS)),
      check("webhook_events_status", inList(t.status, WEBHOOK_EVENT_STATUSES)),
      // Nada é processado sem assinatura verificada.
      check("webhook_events_processed_requires_signature", sql`${t.status} <> 'processed' or ${t.signatureVerified}`),
    ],
  )
  .enableRLS();
