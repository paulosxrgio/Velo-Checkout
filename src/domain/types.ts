/**
 * Tipos de domínio do Velo Checkout.
 *
 * Estes tipos descrevem o contrato entre as telas e a camada de dados. Eles não
 * dependem de onde os dados vêm (demonstração, API própria, Shopify ou Whop),
 * para que o adaptador demonstrativo possa ser trocado por chamadas reais sem
 * refazer as telas.
 */

/* -------------------------------------------------------------------------- */
/* Valores                                                                    */
/* -------------------------------------------------------------------------- */

/** Valor monetário em unidades menores (centavos), evitando erros de ponto flutuante. */
export interface Money {
  amount: number;
  /** Código ISO 4217, ex.: "BRL". */
  currencyCode: string;
}

export type PaymentEnvironment = "sandbox" | "production";

/* -------------------------------------------------------------------------- */
/* Catálogo                                                                   */
/* -------------------------------------------------------------------------- */

export interface ProductImage {
  url: string;
  altText: string;
}

export interface Product {
  /** ID global da Shopify, ex.: "gid://shopify/Product/123". */
  id: string;
  title: string;
  handle: string;
  vendor?: string;
}

export interface ProductVariant {
  /** ID global da Shopify, ex.: "gid://shopify/ProductVariant/456". */
  id: string;
  productId: string;
  /** Título combinado das opções, ex.: "Latão / Bivolt". */
  title: string;
  sku?: string;
  selectedOptions: { name: string; value: string }[];
  price: Money;
  compareAtPrice?: Money;
  image?: ProductImage;
  availableForSale: boolean;
  /** `null` quando a loja não controla o estoque da variante. */
  quantityAvailable: number | null;
}

/* -------------------------------------------------------------------------- */
/* Carrinho e cotação                                                         */
/* -------------------------------------------------------------------------- */

export type CartLineIssue =
  | { kind: "unavailable" }
  | { kind: "insufficient_stock"; quantityAvailable: number }
  | { kind: "price_changed"; previousUnitPrice: Money };

export interface CartLine {
  id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  /** Preço unitário vigente, sempre validado no servidor. */
  unitPrice: Money;
  lineTotal: Money;
  issues: CartLineIssue[];
}

export interface Cart {
  id: string;
  currencyCode: string;
  lines: CartLine[];
  /** Origem do carrinho, usada para levar o comprador de volta à loja. */
  source: {
    platform: "shopify";
    /** Domínio myshopify.com da loja. */
    storeDomain: string;
    /** URL pública do carrinho (`/cart`) na vitrine. */
    cartUrl: string;
  };
  allowQuantityEdit: boolean;
  isDemo: boolean;
  updatedAt: string;
}

export interface AppliedDiscount {
  code: string;
  title: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  amount: Money;
}

export interface TaxSummary {
  title: string;
  /** `null` quando os impostos estão embutidos e a loja não os discrimina. */
  amount: Money | null;
  /** `true` quando os impostos já estão embutidos nos preços. */
  included: boolean;
}

export interface ShippingRate {
  id: string;
  title: string;
  description?: string;
  deliveryEstimate: { minBusinessDays: number; maxBusinessDays: number };
  price: Money;
}

/** Opções de entrega calculadas pelo servidor para o endereço informado. */
export interface ShippingOptions {
  status: "pending_address" | "available" | "unavailable";
  /** CEP (somente dígitos) para o qual as opções foram calculadas. */
  postalCode: string | null;
  rates: ShippingRate[];
  selectedRateId: string | null;
  message?: string;
}

/**
 * Cotação: a composição de valores calculada pelo servidor.
 * O cliente apenas exibe estes números; nunca os calcula de forma confiável.
 */
export interface Quote {
  id: string;
  cartId: string;
  currencyCode: string;
  subtotal: Money;
  discounts: AppliedDiscount[];
  discountTotal: Money;
  shipping: { rateId: string; title: string; amount: Money } | null;
  taxes: TaxSummary | null;
  total: Money;
  calculatedAt: string;
  expiresAt: string;
}

/* -------------------------------------------------------------------------- */
/* Comprador                                                                  */
/* -------------------------------------------------------------------------- */

export interface CustomerContact {
  email: string;
  fullName: string;
  /** Somente dígitos, com DDD. */
  phone: string;
  /** CPF, somente dígitos. */
  taxId: string;
}

export interface ShippingAddress {
  /** CEP, somente dígitos. */
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  /** Sigla da UF. */
  state: string;
  countryCode: "BR";
}

export interface PostalCodeLookup {
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/* -------------------------------------------------------------------------- */
/* Pagamento                                                                  */
/* -------------------------------------------------------------------------- */

export type PaymentAttemptStatus =
  /** Sessão criada; comprador ainda não concluiu o pagamento. */
  | "awaiting_payment"
  /** Pagamento enviado; aguardando confirmação do provedor (webhook). */
  | "processing"
  /** Confirmado pelo servidor a partir do provedor de pagamento. */
  | "paid"
  | "failed"
  | "expired";

/**
 * Sessão de pagamento que o frontend recebe do servidor.
 * `whop_embed` carrega o ID de uma sessão criada no servidor pela API da Whop,
 * usado pelo componente `WhopCheckoutEmbed` (prop `sessionId`).
 */
export type PaymentSession =
  | {
      kind: "whop_embed";
      sessionId: string;
      environment: PaymentEnvironment;
      /** URL para onde a Whop devolve o comprador após fluxos de autorização externos. */
      returnUrl: string;
    }
  | { kind: "demo" };

export type ShopifySyncStatus = "not_started" | "pending" | "synced" | "failed";

export interface PaymentAttemptLine {
  title: string;
  variantTitle: string;
  quantity: number;
  image?: ProductImage;
  lineTotal: Money;
}

export interface PaymentAttempt {
  id: string;
  cartId: string;
  quoteId: string;
  status: PaymentAttemptStatus;
  amount: Money;
  session: PaymentSession;
  failure?: { code: string; message: string };
  /** URL para o comprador retomar o checkout (nova tentativa ou sessão expirada). */
  checkoutUrl: string;
  /** Estado do pedido na Shopify, quando o pagamento já foi confirmado. */
  order?: { status: ShopifySyncStatus; name?: string };
  /** Resumo para a página de confirmação. */
  receipt: {
    email: string;
    lines: PaymentAttemptLine[];
    quote: Quote;
    shippingAddress: ShippingAddress;
  };
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
}

/* -------------------------------------------------------------------------- */
/* Loja, aparência e operação                                                 */
/* -------------------------------------------------------------------------- */

export interface AppearanceSettings {
  storeName: string;
  /** Data URL ou URL pública do logotipo. */
  logoUrl: string | null;
  /** Cor principal em hexadecimal, ex.: "#1f4d3a". */
  primaryColor: string;
  /** Texto curto de suporte exibido no checkout. */
  supportText: string;
}

export interface StorefrontInfo {
  appearance: AppearanceSettings;
  storeUrl: string;
  policies: { title: string; url: string }[];
}

export interface OperationSettings {
  environment: PaymentEnvironment;
  operationName: string;
  alertEmail: string;
  storeUrl: string;
  currencyCode: string;
  timezone: string;
}

/* -------------------------------------------------------------------------- */
/* Conexões                                                                   */
/* -------------------------------------------------------------------------- */

export type ShopifyConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ShopifyConnection {
  status: ShopifyConnectionStatus;
  /** Domínio `*.myshopify.com`. */
  shopDomain: string | null;
  shopName?: string;
  installedAt?: string;
  grantedScopes: string[];
  error?: { message: string; occurredAt: string };
}

export type WhopConnectionStatus =
  /** A autenticação real com a Whop ainda não foi implementada. */
  | "integration_pending"
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type WebhookStatus = "not_configured" | "pending" | "active" | "failing";

export interface WhopConnection {
  status: WhopConnectionStatus;
  account: { name: string; id: string } | null;
  environment: PaymentEnvironment;
  webhook: {
    status: WebhookStatus;
    /** Endpoint próprio que receberá os eventos (definido na etapa de backend). */
    endpointUrl: string | null;
    lastEventAt?: string;
  };
}

export type VerificationStatus = "not_started" | "pending" | "verified" | "failed";

export interface DnsRecordInstruction {
  /** `null` enquanto o provedor de hospedagem não informar o tipo definitivo. */
  type: "CNAME" | "A" | "AAAA" | "TXT" | null;
  name: string;
  /** `null` enquanto o valor real não for conhecido. */
  value: string | null;
  purpose: string;
}

export interface DomainSettings {
  hostname: string | null;
  dnsRecords: DnsRecordInstruction[];
  dnsStatus: VerificationStatus;
  httpsStatus: VerificationStatus;
  applePay: { status: VerificationStatus; lastCheckedAt?: string };
  lastCheckedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Pedidos                                                                    */
/* -------------------------------------------------------------------------- */

export type PaymentStatus = "awaiting_payment" | "processing" | "paid" | "failed" | "refunded" | "expired";

export type OrderEventTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface OrderEvent {
  id: string;
  at: string;
  title: string;
  description?: string;
  tone: OrderEventTone;
  source: "comprador" | "whop" | "shopify" | "sistema";
}

export interface OrderLine {
  title: string;
  variantTitle: string;
  sku?: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image?: ProductImage;
}

export interface Order {
  id: string;
  /** Referência interna exibida à operação, ex.: "VC-1042". */
  reference: string;
  createdAt: string;
  customer: { name: string; email: string; phone?: string };
  shippingAddress: ShippingAddress;
  lines: OrderLine[];
  amounts: {
    subtotal: Money;
    discount: Money;
    shipping: Money;
    taxes: TaxSummary | null;
    total: Money;
  };
  discountCodes: string[];
  shippingTitle: string;
  cartId: string;
  payment: {
    status: PaymentStatus;
    environment: PaymentEnvironment;
    attemptId: string;
    whopSessionId?: string;
    whopPaymentId?: string;
    paidAt?: string;
    failureMessage?: string;
  };
  shopify: {
    status: ShopifySyncStatus;
    orderId?: string;
    orderName?: string;
    attempts: number;
    lastError?: string;
    syncedAt?: string;
  };
  timeline: OrderEvent[];
  isDemo: boolean;
}

/* -------------------------------------------------------------------------- */
/* Configuração guiada                                                        */
/* -------------------------------------------------------------------------- */

export type SetupStepId = "shopify" | "whop" | "domain" | "appearance" | "test" | "activate";

export type SetupStepState = "done" | "todo" | "integration_pending" | "blocked";

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  state: SetupStepState;
  /** Ação principal da etapa, quando houver. */
  cta?: { label: string; href: string };
  note?: string;
}

export type ChecklistItemStatus = "ok" | "pending" | "integration_pending" | "optional";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: ChecklistItemStatus;
  required: boolean;
  href?: string;
}

/** Fotografia do estado da operação, usada para derivar configuração e avisos. */
export interface OperationSnapshot {
  shopify: ShopifyConnection;
  whop: WhopConnection;
  domain: DomainSettings;
  appearance: AppearanceSettings;
  settings: OperationSettings;
  /** Pedido de teste concluído em sandbox, confirmado pelo servidor. */
  sandboxTestPassed: boolean;
  checkoutActive: boolean;
}
