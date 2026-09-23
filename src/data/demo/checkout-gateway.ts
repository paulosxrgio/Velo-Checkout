import { isLineUnavailable } from "@/domain/cart";
import { onlyDigits } from "@/domain/format";
import { money } from "@/domain/money";
import type {
  AppliedDiscount,
  Cart,
  CartLine,
  PaymentAttempt,
  PaymentAttemptStatus,
  Quote,
  ShippingOptions,
  ShippingRate,
  ShopifySyncStatus,
} from "@/domain/types";
import { GatewayError, type CheckoutGateway, type CheckoutState } from "../contracts";
import { getDemoStorefront } from "./admin-gateway";
import {
  DEMO_CATALOG,
  DEMO_COUPONS,
  DEMO_POSTAL_CODES,
  DEMO_SCENARIOS,
  DEMO_SHIPPING_RATES,
  DEMO_STORE_URL,
  DEMO_UNSERVED_POSTAL_CODE,
} from "./fixtures";
import { demoId, readDemo, simulateLatency, writeDemo } from "./storage";

/**
 * Adaptador demonstrativo do checkout.
 *
 * Simula no navegador o que o servidor fará: validar o carrinho, calcular a
 * cotação e criar a tentativa de pagamento. Serve apenas para desenhar e testar
 * as telas; nenhuma regra de preço aqui deve ser reaproveitada no cliente real.
 */

interface DemoCartState {
  token: string;
  cart: Cart;
  couponCode: string | null;
  shipping: ShippingOptions;
  quoteId: string;
}

const carts = new Map<string, DemoCartState>();

function seedCart(token: string): DemoCartState {
  const scenario = DEMO_SCENARIOS.find((s) => s.token === token);
  if (!scenario) throw new GatewayError("cart_not_found", "Não encontramos este carrinho. Volte à loja e tente finalizar a compra novamente.");
  if (scenario.expired) throw new GatewayError("cart_expired", "Este link de checkout expirou. Volte ao carrinho da loja para gerar um novo.");

  const lines: CartLine[] = scenario.lines.map((seed, index) => {
    const { product, variant } = DEMO_CATALOG[seed.key];
    const issues: CartLine["issues"] = [];
    if (!variant.availableForSale) issues.push({ kind: "unavailable" });
    if (seed.previousPrice !== undefined) issues.push({ kind: "price_changed", previousUnitPrice: money(seed.previousPrice) });
    return {
      id: `line_${index + 1}`,
      product,
      variant,
      quantity: seed.quantity,
      unitPrice: variant.price,
      lineTotal: money(variant.price.amount * seed.quantity),
      issues,
    };
  });

  const cart: Cart = {
    id: `cart_demo_${token}`,
    currencyCode: "BRL",
    lines,
    source: { platform: "shopify", storeDomain: "loja-demo.myshopify.com", cartUrl: `${DEMO_STORE_URL}/cart` },
    allowQuantityEdit: true,
    isDemo: true,
    updatedAt: new Date().toISOString(),
  };

  const state: DemoCartState = {
    token,
    cart,
    couponCode: null,
    shipping: { status: "pending_address", postalCode: null, rates: [], selectedRateId: null },
    quoteId: demoId("quote"),
  };
  carts.set(cart.id, state);
  return state;
}

function getState(cartId: string): DemoCartState {
  const state = carts.get(cartId);
  if (!state) throw new GatewayError("cart_expired", "Sua sessão de checkout expirou. Recarregue a página para continuar.");
  return state;
}

function computeQuote(state: DemoCartState): Quote {
  const { cart } = state;
  const currency = cart.currencyCode;
  const subtotal = cart.lines.filter((l) => !isLineUnavailable(l)).reduce((sum, l) => sum + l.lineTotal.amount, 0);
  const rate = state.shipping.rates.find((r) => r.id === state.shipping.selectedRateId) ?? null;

  const discounts: AppliedDiscount[] = [];
  const coupon = DEMO_COUPONS.find((c) => c.code === state.couponCode);
  if (coupon?.kind === "percentage") {
    discounts.push({ code: coupon.code, title: coupon.title, type: "percentage", amount: money(Math.round((subtotal * coupon.percent) / 100), currency) });
  } else if (coupon?.kind === "free_shipping") {
    discounts.push({ code: coupon.code, title: coupon.title, type: "free_shipping", amount: money(rate?.price.amount ?? 0, currency) });
  }
  const discountTotal = discounts.reduce((sum, d) => sum + d.amount.amount, 0);
  const shippingAmount = rate?.price.amount ?? 0;
  const now = new Date();

  return {
    id: state.quoteId,
    cartId: cart.id,
    currencyCode: currency,
    subtotal: money(subtotal, currency),
    discounts,
    discountTotal: money(discountTotal, currency),
    shipping: rate ? { rateId: rate.id, title: rate.title, amount: rate.price } : null,
    taxes: { title: "Impostos", amount: null, included: true },
    total: money(Math.max(0, subtotal - discountTotal + shippingAmount), currency),
    calculatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
  };
}

function snapshot(state: DemoCartState): CheckoutState {
  state.quoteId = demoId("quote");
  // Cópia profunda para que a UI nunca altere o estado "do servidor" por referência.
  return structuredClone({
    cart: state.cart,
    quote: computeQuote(state),
    shipping: state.shipping,
    storefront: getDemoStorefront(),
    appliedCouponCode: state.couponCode,
  });
}

/* ------------------------- Tentativas de pagamento ------------------------ */

export type DemoPaymentOutcome = "paid" | "declined" | "pending" | "failed_after_submit";

interface StoredAttempt {
  attempt: PaymentAttempt;
  outcome: DemoPaymentOutcome | null;
  polls: number;
}

const ATTEMPTS_KEY = "attempts";

function readAttempts(): Record<string, StoredAttempt> {
  return readDemo<Record<string, StoredAttempt>>(ATTEMPTS_KEY, {}, "session");
}

function saveAttempt(stored: StoredAttempt) {
  const all = readAttempts();
  all[stored.attempt.id] = stored;
  writeDemo(ATTEMPTS_KEY, all, "session");
}

function withStatus(attempt: PaymentAttempt, status: PaymentAttemptStatus, order?: ShopifySyncStatus): PaymentAttempt {
  const next: PaymentAttempt = { ...attempt, status, updatedAt: new Date().toISOString() };
  if (status === "failed") {
    next.failure = { code: "payment_failed", message: "A operadora não aprovou o pagamento. Nenhum valor foi cobrado." };
  }
  if (order) next.order = { status: order, name: order === "synced" ? "#1049" : undefined };
  return next;
}

/** Roteiro de status que o "servidor" demonstrativo devolve a cada consulta. */
function advance(stored: StoredAttempt): PaymentAttempt {
  const { attempt, outcome, polls } = stored;
  switch (outcome) {
    case "paid":
      return withStatus(attempt, "paid", polls < 1 ? "pending" : "synced");
    case "pending":
      if (polls < 3) return withStatus(attempt, "processing");
      return withStatus(attempt, "paid", polls < 4 ? "pending" : "synced");
    case "failed_after_submit":
      return polls < 2 ? withStatus(attempt, "processing") : withStatus(attempt, "failed");
    default:
      return withStatus(attempt, "awaiting_payment");
  }
}

/**
 * SOMENTE DEMONSTRAÇÃO: registra o resultado que o painel simulado escolheu.
 * No fluxo real, o resultado vem da Whop (webhook validado no servidor).
 */
export async function simulateDemoPaymentOutcome(attemptId: string, outcome: DemoPaymentOutcome): Promise<void> {
  await simulateLatency(500, 900);
  const stored = readAttempts()[attemptId];
  if (!stored) throw new GatewayError("attempt_not_found", "Tentativa de pagamento não encontrada.");
  // Recusa no formulário: a Whop permite tentar de novo na mesma sessão.
  if (outcome === "declined") return;
  saveAttempt({ ...stored, outcome, polls: 0 });
}

/* -------------------------------- Gateway -------------------------------- */

export const demoCheckoutGateway: CheckoutGateway = {
  async getStorefront() {
    await simulateLatency(150, 300);
    return getDemoStorefront();
  },

  async getCheckout(cartToken) {
    await simulateLatency(500, 900);
    return snapshot(seedCart(cartToken));
  },

  async updateLineQuantity({ cartId, lineId, quantity }) {
    await simulateLatency();
    const state = getState(cartId);
    const line = state.cart.lines.find((l) => l.id === lineId);
    if (!line) throw new GatewayError("cart_not_found", "Item não encontrado no carrinho.");
    if (isLineUnavailable(line)) throw new GatewayError("line_unavailable", "Este item está indisponível.");
    const limit = line.variant.quantityAvailable;
    if (limit !== null && quantity > limit) {
      throw new GatewayError("quantity_exceeds_stock", `Temos apenas ${limit} ${limit === 1 ? "unidade disponível" : "unidades disponíveis"} deste item.`);
    }
    line.quantity = Math.max(1, quantity);
    line.lineTotal = money(line.unitPrice.amount * line.quantity, line.unitPrice.currencyCode);
    return snapshot(state);
  },

  async removeLine({ cartId, lineId }) {
    await simulateLatency();
    const state = getState(cartId);
    state.cart.lines = state.cart.lines.filter((l) => l.id !== lineId);
    return snapshot(state);
  },

  async acknowledgePriceChanges(cartId) {
    await simulateLatency(250, 500);
    const state = getState(cartId);
    for (const line of state.cart.lines) line.issues = line.issues.filter((i) => i.kind !== "price_changed");
    return snapshot(state);
  },

  async applyCoupon({ cartId, code }) {
    await simulateLatency(600, 1000);
    const state = getState(cartId);
    const normalized = code.trim().toUpperCase();
    const coupon = DEMO_COUPONS.find((c) => c.code === normalized);
    if (!coupon) throw new GatewayError("coupon_invalid", "Cupom não encontrado. Confira o código e tente novamente.");
    if (coupon.kind === "expired") throw new GatewayError("coupon_expired", `Este cupom expirou em ${coupon.expiredOn}.`);
    state.couponCode = coupon.code;
    return snapshot(state);
  },

  async removeCoupon(cartId) {
    await simulateLatency(250, 500);
    const state = getState(cartId);
    state.couponCode = null;
    return snapshot(state);
  },

  async lookupPostalCode(postalCode) {
    await simulateLatency(300, 600);
    return DEMO_POSTAL_CODES[onlyDigits(postalCode)] ?? null;
  },

  async estimateShipping({ cartId, address }) {
    await simulateLatency(700, 1200);
    const state = getState(cartId);
    const postalCode = onlyDigits(address.postalCode);
    if (postalCode === DEMO_UNSERVED_POSTAL_CODE) {
      state.shipping = {
        status: "unavailable",
        postalCode,
        rates: [],
        selectedRateId: null,
        message: "Ainda não entregamos neste CEP. Confira o número ou use outro endereço.",
      };
      return snapshot(state);
    }
    const rates: ShippingRate[] = DEMO_SHIPPING_RATES.map((r) => ({
      id: r.id,
      title: r.title,
      deliveryEstimate: { minBusinessDays: r.minBusinessDays, maxBusinessDays: r.maxBusinessDays },
      price: money(r.price, state.cart.currencyCode),
    }));
    const previous = state.shipping.selectedRateId;
    const cheapest = [...rates].sort((a, b) => a.price.amount - b.price.amount)[0];
    state.shipping = {
      status: "available",
      postalCode,
      rates,
      selectedRateId: rates.some((r) => r.id === previous) ? previous : cheapest.id,
    };
    return snapshot(state);
  },

  async selectShippingRate({ cartId, rateId }) {
    await simulateLatency(300, 600);
    const state = getState(cartId);
    if (!state.shipping.rates.some((r) => r.id === rateId)) {
      throw new GatewayError("shipping_unavailable", "Esta opção de entrega não está mais disponível. Escolha outra.");
    }
    state.shipping = { ...state.shipping, selectedRateId: rateId };
    return snapshot(state);
  },

  async createPaymentAttempt({ cartId, quoteId, contact, address }) {
    await simulateLatency(900, 1400);
    const state = getState(cartId);
    if (state.cart.lines.some(isLineUnavailable)) {
      throw new GatewayError("line_unavailable", "Remova os itens indisponíveis para continuar.");
    }
    if (state.cart.lines.some((l) => l.issues.some((i) => i.kind === "price_changed"))) {
      throw new GatewayError("price_changes_pending", "Confirme os novos preços antes de pagar.");
    }
    if (state.shipping.status !== "available" || state.shipping.postalCode !== onlyDigits(address.postalCode) || !state.shipping.selectedRateId) {
      throw new GatewayError("shipping_unavailable", "Escolha uma opção de entrega para o CEP informado.");
    }
    const quote = computeQuote(state);
    quote.id = quoteId;
    const now = new Date().toISOString();
    const attempt: PaymentAttempt = {
      id: demoId("tent"),
      cartId,
      quoteId,
      status: "awaiting_payment",
      amount: quote.total,
      session: { kind: "demo" },
      checkoutUrl: `/checkout?carrinho=${encodeURIComponent(state.token)}`,
      receipt: {
        email: contact.email,
        lines: state.cart.lines.map((l) => ({
          title: l.product.title,
          variantTitle: l.variant.title,
          quantity: l.quantity,
          image: l.variant.image,
          lineTotal: l.lineTotal,
        })),
        quote,
        shippingAddress: address,
      },
      createdAt: now,
      updatedAt: now,
      isDemo: true,
    };
    saveAttempt({ attempt, outcome: null, polls: 0 });
    return structuredClone(attempt);
  },

  async getPaymentAttempt(attemptId) {
    await simulateLatency(400, 800);
    const stored = readAttempts()[attemptId];
    if (!stored) {
      throw new GatewayError("attempt_not_found", "Não encontramos esta tentativa de pagamento.");
    }
    const current = advance(stored);
    saveAttempt({ ...stored, polls: stored.polls + 1 });
    return current;
  },
};
