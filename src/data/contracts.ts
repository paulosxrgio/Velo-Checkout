import type {
  AppearanceSettings,
  Cart,
  CustomerContact,
  DomainSettings,
  OperationSettings,
  OperationSnapshot,
  Order,
  PaymentAttempt,
  PostalCodeLookup,
  Quote,
  ShippingAddress,
  ShippingOptions,
  ShopifyConnection,
  StorefrontInfo,
  WhopConnection,
} from "@/domain/types";

/**
 * Contratos da camada de dados.
 *
 * As telas só conhecem estas interfaces. Hoje elas são implementadas pelo
 * adaptador demonstrativo (`src/data/demo`). Nas próximas etapas, um adaptador
 * HTTP chamará as rotas do servidor, que por sua vez falarão com a Shopify e a
 * Whop usando credenciais que nunca chegam ao navegador.
 */

export type GatewayErrorCode =
  | "cart_not_found"
  | "cart_expired"
  | "coupon_invalid"
  | "coupon_expired"
  | "coupon_not_applicable"
  | "shipping_unavailable"
  | "postal_code_not_found"
  | "line_unavailable"
  | "quantity_exceeds_stock"
  | "price_changes_pending"
  | "attempt_not_found"
  | "not_implemented"
  | "network";

export class GatewayError extends Error {
  constructor(
    public readonly code: GatewayErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export function toGatewayError(error: unknown): GatewayError {
  if (error instanceof GatewayError) return error;
  return new GatewayError("network", "Não foi possível se comunicar com o servidor. Tente novamente.");
}

export interface CheckoutState {
  cart: Cart;
  quote: Quote;
  shipping: ShippingOptions;
  storefront: StorefrontInfo;
  appliedCouponCode: string | null;
}

export interface CheckoutGateway {
  /** Identidade visual e links da loja (usada também em estados de erro e na confirmação). */
  getStorefront(): Promise<StorefrontInfo>;
  /** Carrega o carrinho recebido da Shopify pelo token de repasse. */
  getCheckout(cartToken: string): Promise<CheckoutState>;
  updateLineQuantity(input: { cartId: string; lineId: string; quantity: number }): Promise<CheckoutState>;
  removeLine(input: { cartId: string; lineId: string }): Promise<CheckoutState>;
  /** Registra que o comprador revisou preços alterados desde o carrinho. */
  acknowledgePriceChanges(cartId: string): Promise<CheckoutState>;
  applyCoupon(input: { cartId: string; code: string }): Promise<CheckoutState>;
  removeCoupon(cartId: string): Promise<CheckoutState>;
  lookupPostalCode(postalCode: string): Promise<PostalCodeLookup | null>;
  /** Calcula as opções de entrega para o endereço e pré-seleciona a mais econômica. */
  estimateShipping(input: { cartId: string; address: Pick<ShippingAddress, "postalCode" | "state" | "city"> }): Promise<CheckoutState>;
  selectShippingRate(input: { cartId: string; rateId: string }): Promise<CheckoutState>;
  /**
   * Cria uma tentativa de pagamento. No servidor real: revalida preços e estoque,
   * congela a cotação e cria a sessão de checkout na Whop.
   */
  createPaymentAttempt(input: {
    cartId: string;
    quoteId: string;
    contact: CustomerContact;
    address: ShippingAddress;
  }): Promise<PaymentAttempt>;
  /** Consulta o status de uma tentativa. Fonte da verdade para a página de confirmação. */
  getPaymentAttempt(attemptId: string): Promise<PaymentAttempt>;
}

export interface AdminGateway {
  getSnapshot(): Promise<OperationSnapshot>;
  getShopifyConnection(): Promise<ShopifyConnection>;
  getWhopConnection(): Promise<WhopConnection>;
  getDomainSettings(): Promise<DomainSettings>;
  saveCheckoutHostname(hostname: string): Promise<DomainSettings>;
  getAppearance(): Promise<AppearanceSettings>;
  saveAppearance(appearance: AppearanceSettings): Promise<AppearanceSettings>;
  getSettings(): Promise<OperationSettings>;
  saveSettings(settings: OperationSettings): Promise<OperationSettings>;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
}
