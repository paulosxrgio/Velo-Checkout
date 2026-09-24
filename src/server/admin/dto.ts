import { money } from "@/domain/money";
import type {
  AppearanceSettings,
  DnsRecordInstruction,
  DomainSettings,
  OperationSettings,
  Order,
  OrderEvent,
  PaymentStatus,
  ShopifyConnection,
  WhopConnection,
} from "@/domain/types";
import type { checkoutDomain, operationSettings, paymentAttempts, quotes, shopifyConnection, whopConnections } from "../db/schema";
import {
  storedAddressSchema,
  storedCustomerSchema,
  storedQuoteLineSchema,
  storedShippingRateSchema,
} from "../checkout/records";

/**
 * Conversão de linhas do banco para os tipos que o painel conhece.
 *
 * Cada função copia explicitamente os campos permitidos: colunas cifradas,
 * hashes, estados de OAuth e metadados internos nunca entram nas respostas.
 */

type SettingsRow = typeof operationSettings.$inferSelect;
type DomainRow = typeof checkoutDomain.$inferSelect;
type ShopifyRow = typeof shopifyConnection.$inferSelect;
type WhopRow = typeof whopConnections.$inferSelect;
type AttemptRow = typeof paymentAttempts.$inferSelect;
type QuoteRow = typeof quotes.$inferSelect;

/** A autenticação com a Whop ainda não foi implementada: a conexão aparece como "integração pendente". */
const WHOP_AUTH_IMPLEMENTED = false;

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : undefined);

export function toAppearance(row: SettingsRow): AppearanceSettings {
  return {
    storeName: row.storeName,
    logoUrl: row.logoDataUrl,
    primaryColor: row.primaryColor,
    supportText: row.supportText,
  };
}

export function toOperationSettings(row: SettingsRow): OperationSettings {
  return {
    environment: row.paymentEnvironment,
    operationName: row.operationName,
    alertEmail: row.alertEmail ?? "",
    storeUrl: row.storeUrl ?? "",
    currencyCode: row.currencyCode.trim(),
    timezone: row.timezone,
  };
}

/** Instruções de DNS: tipo e valor ficam pendentes até a hospedagem ser definida. */
export function dnsRecordsFor(hostname: string | null): DnsRecordInstruction[] {
  return [
    {
      type: null,
      name: hostname ? hostname.split(".")[0] : "checkout",
      value: null,
      purpose: "Aponta o subdomínio para a hospedagem do checkout. Tipo e valor serão informados pela hospedagem escolhida.",
    },
  ];
}

export function toDomainSettings(row: DomainRow): DomainSettings {
  return {
    hostname: row.hostname,
    dnsRecords: dnsRecordsFor(row.hostname),
    dnsStatus: row.dnsStatus,
    httpsStatus: row.httpsStatus,
    applePay: { status: row.applePayStatus, lastCheckedAt: iso(row.lastCheckedAt) },
    lastCheckedAt: iso(row.lastCheckedAt),
  };
}

export function toShopifyConnection(row: ShopifyRow): ShopifyConnection {
  return {
    status: row.status,
    shopDomain: row.shopDomain,
    installedAt: iso(row.installedAt),
    grantedScopes: [...row.grantedScopes],
    error: row.status === "error" && row.lastError ? { message: row.lastError, occurredAt: row.updatedAt.toISOString() } : undefined,
  };
}

export function toWhopConnection(row: WhopRow): WhopConnection {
  const status: WhopConnection["status"] =
    row.status === "connected" ? "connected" : row.status === "error" ? "error" : WHOP_AUTH_IMPLEMENTED ? "disconnected" : "integration_pending";
  return {
    status,
    account: row.companyId ? { id: row.companyId, name: row.accountName ?? row.companyId } : null,
    environment: row.environment,
    webhook: {
      status: row.webhookStatus,
      endpointUrl: row.webhookEndpointUrl,
      lastEventAt: iso(row.webhookLastEventAt),
    },
  };
}

function toPaymentStatus(status: AttemptRow["status"]): PaymentStatus {
  switch (status) {
    case "created":
    case "awaiting_payment":
      return "awaiting_payment";
    case "canceled":
      return "expired";
    default:
      return status;
  }
}

function buildTimeline(attempt: AttemptRow): OrderEvent[] {
  const events: OrderEvent[] = [
    { id: "created", at: attempt.createdAt.toISOString(), title: "Tentativa de pagamento criada", tone: "neutral", source: "sistema" },
  ];
  if (attempt.whopCheckoutSessionId) {
    events.push({ id: "session", at: attempt.createdAt.toISOString(), title: "Sessão de pagamento criada", description: attempt.whopCheckoutSessionId, tone: "info", source: "whop" });
  }
  if (attempt.paidAt) {
    events.push({ id: "paid", at: attempt.paidAt.toISOString(), title: "Pagamento confirmado via webhook", description: attempt.whopPaymentId ?? undefined, tone: "success", source: "whop" });
  }
  if (attempt.status === "failed") {
    events.push({ id: "failed", at: attempt.updatedAt.toISOString(), title: "Pagamento recusado", description: attempt.failureMessage ?? undefined, tone: "danger", source: "whop" });
  }
  if (attempt.shopifySyncStatus === "synced" && attempt.shopifySyncedAt) {
    events.push({ id: "synced", at: attempt.shopifySyncedAt.toISOString(), title: "Pedido criado na Shopify", description: attempt.shopifyOrderName ?? undefined, tone: "success", source: "shopify" });
  } else if (attempt.shopifySyncStatus === "failed") {
    events.push({ id: "sync-failed", at: attempt.updatedAt.toISOString(), title: "Falha ao criar pedido na Shopify", description: attempt.shopifyLastError ?? undefined, tone: "danger", source: "shopify" });
  } else if (attempt.shopifySyncStatus === "pending") {
    events.push({ id: "sync-pending", at: attempt.updatedAt.toISOString(), title: "Criação do pedido na Shopify em andamento", description: `Tentativa ${attempt.shopifySyncAttempts}`, tone: "warning", source: "sistema" });
  }
  return events;
}

export function toOrder(attempt: AttemptRow, quote: QuoteRow | null): Order {
  const currency = attempt.currencyCode.trim();
  const customer = storedCustomerSchema.safeParse(attempt.customer);
  const address = storedAddressSchema.safeParse(attempt.shippingAddress);
  const lines = storedQuoteLineSchema.array().safeParse(quote?.lineItems ?? []);
  const shipping = storedShippingRateSchema.nullable().safeParse(quote?.shippingRate ?? null);

  return {
    id: attempt.id,
    reference: `VC-${attempt.orderNumber}`,
    createdAt: attempt.createdAt.toISOString(),
    customer: {
      name: customer.success ? customer.data.fullName : "—",
      email: attempt.customerEmail,
      phone: customer.success ? customer.data.phone : undefined,
    },
    shippingAddress: address.success
      ? address.data
      : { postalCode: "", street: "—", number: "", complement: "", neighborhood: "", city: "", state: "", countryCode: "BR" },
    lines: (lines.success ? lines.data : []).map((line) => ({
      title: line.title,
      variantTitle: line.variantTitle,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: money(line.unitPrice, currency),
      lineTotal: money(line.lineTotal, currency),
      image: line.imageUrl ? { url: line.imageUrl, altText: line.imageAlt ?? line.title } : undefined,
    })),
    amounts: {
      subtotal: money(quote?.subtotalAmount ?? attempt.amount, currency),
      discount: money(quote?.discountAmount ?? 0, currency),
      shipping: money(quote?.shippingAmount ?? 0, currency),
      taxes: quote
        ? { title: "Impostos", included: quote.taxesIncluded, amount: quote.taxesIncluded && quote.taxAmount === 0 ? null : money(quote.taxAmount, currency) }
        : null,
      total: money(attempt.amount, currency),
    },
    discountCodes: quote ? [...quote.discountCodes] : [],
    shippingTitle: shipping.success && shipping.data ? shipping.data.title : "—",
    cartId: attempt.cartId,
    payment: {
      status: toPaymentStatus(attempt.status),
      environment: attempt.environment,
      attemptId: attempt.id,
      whopSessionId: attempt.whopCheckoutSessionId ?? undefined,
      whopPaymentId: attempt.whopPaymentId ?? undefined,
      paidAt: iso(attempt.paidAt),
      failureMessage: attempt.failureMessage ?? undefined,
    },
    shopify: {
      status: attempt.shopifySyncStatus,
      orderId: attempt.shopifyOrderId ?? undefined,
      orderName: attempt.shopifyOrderName ?? undefined,
      attempts: attempt.shopifySyncAttempts,
      lastError: attempt.shopifyLastError ?? undefined,
      syncedAt: iso(attempt.shopifySyncedAt),
    },
    timeline: buildTimeline(attempt),
    isDemo: false,
  };
}
