import { GatewayError, type CheckoutGateway } from "../contracts";

/**
 * Checkout com carrinhos reais da Shopify.
 *
 * A leitura do carrinho, a cotação no servidor e a sessão da Whop ficam para
 * as próximas etapas. Até lá, este adaptador falha de forma explícita — ele
 * nunca recorre aos dados demonstrativos.
 */

function unavailable(): never {
  throw new GatewayError(
    "not_implemented",
    "O checkout com carrinhos reais ainda não está disponível. Volte à loja e tente novamente mais tarde.",
  );
}

export const liveCheckoutGateway: CheckoutGateway = {
  getStorefront: async () => unavailable(),
  getCheckout: async (cartToken) => {
    if (!cartToken) throw new GatewayError("cart_not_found", "Não encontramos este carrinho. Volte à loja e tente finalizar a compra novamente.");
    return unavailable();
  },
  updateLineQuantity: async () => unavailable(),
  removeLine: async () => unavailable(),
  acknowledgePriceChanges: async () => unavailable(),
  applyCoupon: async () => unavailable(),
  removeCoupon: async () => unavailable(),
  lookupPostalCode: async () => unavailable(),
  estimateShipping: async () => unavailable(),
  selectShippingRate: async () => unavailable(),
  createPaymentAttempt: async () => unavailable(),
  getPaymentAttempt: async () => {
    throw new GatewayError("attempt_not_found", "Não encontramos esta tentativa de pagamento.");
  },
};
