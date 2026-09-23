import { money } from "@/domain/money";
import type {
  AppearanceSettings,
  DomainSettings,
  OperationSettings,
  Order,
  OrderEvent,
  PostalCodeLookup,
  Product,
  ProductVariant,
  ShippingAddress,
  ShopifyConnection,
  WhopConnection,
} from "@/domain/types";

/**
 * DADOS DE DEMONSTRAÇÃO.
 * Loja, produtos, preços, pedidos e IDs são fictícios. Domínios usam o TLD
 * reservado `.example` e IDs de referência carregam o marcador `demo`.
 */

export const DEMO_STORE_URL = "https://casaaurora.example";

/* ------------------------------- Catálogo -------------------------------- */

interface DemoCatalogItem {
  product: Product;
  variant: ProductVariant;
}

function catalogItem(
  key: string,
  title: string,
  variantTitle: string,
  options: [string, string][],
  price: number,
  extra: Partial<ProductVariant> = {},
): DemoCatalogItem {
  return {
    product: { id: `gid://shopify/Product/demo-${key}`, title, handle: key, vendor: "Casa Aurora" },
    variant: {
      id: `gid://shopify/ProductVariant/demo-${key}`,
      productId: `gid://shopify/Product/demo-${key}`,
      title: variantTitle,
      sku: `DEMO-${key.toUpperCase()}`,
      selectedOptions: options.map(([name, value]) => ({ name, value })),
      price: money(price),
      image: { url: `/demo/${key}.svg`, altText: `${title} — ${variantTitle}` },
      availableForSale: true,
      quantityAvailable: 8,
      ...extra,
    },
  };
}

export const DEMO_CATALOG = {
  luminaria: catalogItem(
    "luminaria",
    "Luminária de Mesa Arco",
    "Latão escovado / Bivolt",
    [["Acabamento", "Latão escovado"], ["Voltagem", "Bivolt"]],
    28990,
    { compareAtPrice: money(32990), quantityAvailable: 3 },
  ),
  manta: catalogItem("manta", "Manta de Tricô Chunky", "Areia / 1,2 × 1,6 m", [["Cor", "Areia"], ["Tamanho", "1,2 × 1,6 m"]], 21900),
  caneca: catalogItem(
    "caneca",
    "Caneca de Cerâmica Esmaltada",
    "Verde-oliva / 350 ml",
    [["Cor", "Verde-oliva"], ["Capacidade", "350 ml"]],
    5990,
    { quantityAvailable: null },
  ),
  vaso: catalogItem("vaso", "Vaso de Barro Moldado", "Terracota / Médio", [["Cor", "Terracota"], ["Tamanho", "Médio"]], 14500, {
    availableForSale: false,
    quantityAvailable: 0,
  }),
} satisfies Record<string, DemoCatalogItem>;

export type DemoCatalogKey = keyof typeof DEMO_CATALOG;

/* ------------------------------- Cenários -------------------------------- */

export interface DemoCartSeed {
  key: DemoCatalogKey;
  quantity: number;
  /** Preço do item quando foi adicionado ao carrinho na loja (para simular alteração). */
  previousPrice?: number;
}

export interface DemoScenario {
  token: string;
  label: string;
  description: string;
  lines: DemoCartSeed[];
  /** Simula link de checkout expirado ou inválido. */
  expired?: boolean;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    token: "demo",
    label: "Carrinho padrão",
    description: "Três produtos com variantes e quantidades diferentes.",
    lines: [
      { key: "luminaria", quantity: 1 },
      { key: "manta", quantity: 1 },
      { key: "caneca", quantity: 2 },
    ],
  },
  {
    token: "demo-indisponivel",
    label: "Item indisponível",
    description: "Um item esgotou depois de entrar no carrinho.",
    lines: [
      { key: "luminaria", quantity: 1 },
      { key: "vaso", quantity: 1 },
      { key: "caneca", quantity: 1 },
    ],
  },
  {
    token: "demo-preco-alterado",
    label: "Preço alterado",
    description: "O preço de um item mudou desde que foi adicionado.",
    lines: [
      { key: "manta", quantity: 1, previousPrice: 19900 },
      { key: "caneca", quantity: 2 },
    ],
  },
  { token: "demo-vazio", label: "Carrinho vazio", description: "Nenhum item para finalizar.", lines: [] },
  {
    token: "demo-expirado",
    label: "Link expirado",
    description: "O link de repasse do carrinho não é mais válido.",
    lines: [],
    expired: true,
  },
];

/* -------------------------- Frete, CEP e cupons --------------------------- */

export const DEMO_SHIPPING_RATES = [
  { id: "demo-economica", title: "Entrega econômica", minBusinessDays: 6, maxBusinessDays: 9, price: 2490 },
  { id: "demo-expressa", title: "Entrega expressa", minBusinessDays: 2, maxBusinessDays: 4, price: 4250 },
];

/** CEP que simula "sem entrega disponível". */
export const DEMO_UNSERVED_POSTAL_CODE = "99999999";

export const DEMO_POSTAL_CODES: Record<string, PostalCodeLookup> = {
  "01310100": {
    postalCode: "01310100",
    street: "Avenida Paulista",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
  },
};

export type DemoCoupon =
  | { code: string; kind: "percentage"; percent: number; title: string }
  | { code: string; kind: "free_shipping"; title: string }
  | { code: string; kind: "expired"; expiredOn: string };

export const DEMO_COUPONS: DemoCoupon[] = [
  { code: "BEMVINDO10", kind: "percentage", percent: 10, title: "10% na primeira compra" },
  { code: "FRETEGRATIS", kind: "free_shipping", title: "Frete grátis" },
  { code: "EXPIRADO", kind: "expired", expiredOn: "31/08" },
];

/* --------------------------- Configuração padrão -------------------------- */

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  storeName: "Casa Aurora",
  logoUrl: null,
  primaryColor: "#1f4d3a",
  supportText: "Dúvidas sobre o pedido? Escreva para atendimento@casaaurora.example",
};

export const DEFAULT_SETTINGS: OperationSettings = {
  environment: "sandbox",
  operationName: "Casa Aurora",
  alertEmail: "operacao@casaaurora.example",
  storeUrl: DEMO_STORE_URL,
  currencyCode: "BRL",
  timezone: "America/Sao_Paulo",
};

export const DEFAULT_SHOPIFY: ShopifyConnection = {
  status: "disconnected",
  shopDomain: null,
  grantedScopes: [],
};

export const DEFAULT_WHOP: WhopConnection = {
  status: "integration_pending",
  account: null,
  environment: "sandbox",
  webhook: { status: "not_configured", endpointUrl: null },
};

export function defaultDomainSettings(hostname: string | null): DomainSettings {
  const label = hostname ? hostname.split(".")[0] : "checkout";
  return {
    hostname,
    dnsRecords: [
      {
        type: null,
        name: label,
        value: null,
        purpose: "Aponta o subdomínio para a hospedagem do checkout. Tipo e valor serão informados pela hospedagem escolhida.",
      },
    ],
    dnsStatus: "not_started",
    httpsStatus: "not_started",
    applePay: { status: "not_started" },
  };
}

/* ------------------------------- Pedidos ---------------------------------- */

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const DEMO_ADDRESS: ShippingAddress = {
  postalCode: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "Apto 42",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  countryCode: "BR",
};

function orderLine(key: DemoCatalogKey, quantity: number) {
  const { product, variant } = DEMO_CATALOG[key];
  return {
    title: product.title,
    variantTitle: variant.title,
    sku: variant.sku,
    quantity,
    unitPrice: variant.price,
    lineTotal: money(variant.price.amount * quantity),
    image: variant.image,
  };
}

interface DemoOrderSeed {
  n: number;
  minutes: number;
  customer: Order["customer"];
  lines: [DemoCatalogKey, number][];
  shipping: number;
  discount?: number;
  coupon?: string;
  payment: Order["payment"]["status"];
  shopify: Order["shopify"]["status"];
  shopifyAttempts?: number;
  shopifyError?: string;
  failureMessage?: string;
}

function buildTimeline(seed: DemoOrderSeed, ids: { attempt: string; session: string; payment: string }): OrderEvent[] {
  const t = (offset: number) => minutesAgo(seed.minutes - offset);
  const events: OrderEvent[] = [
    { id: "e1", at: t(0), title: "Carrinho recebido da loja", description: `${seed.lines.length} itens validados com a Shopify`, tone: "neutral", source: "sistema" },
    { id: "e2", at: t(2), title: "Cotação calculada", description: "Preços, frete e descontos confirmados no servidor", tone: "neutral", source: "sistema" },
    { id: "e3", at: t(3), title: "Sessão de pagamento criada", description: ids.session, tone: "info", source: "whop" },
  ];
  if (seed.payment === "awaiting_payment" || seed.payment === "expired") {
    if (seed.payment === "expired") {
      events.push({ id: "e4", at: t(33), title: "Sessão expirada", description: "O comprador não concluiu o pagamento", tone: "neutral", source: "sistema" });
    }
    return events;
  }
  if (seed.payment === "processing") {
    events.push({ id: "e4", at: t(4), title: "Pagamento enviado pelo comprador", description: "Aguardando confirmação da Whop", tone: "info", source: "comprador" });
    return events;
  }
  if (seed.payment === "failed") {
    events.push({ id: "e4", at: t(4), title: "Pagamento recusado", description: seed.failureMessage, tone: "danger", source: "whop" });
    return events;
  }
  events.push({ id: "e4", at: t(4), title: "Pagamento confirmado via webhook", description: ids.payment, tone: "success", source: "whop" });
  if (seed.shopify === "synced") {
    events.push({ id: "e5", at: t(5), title: "Pedido criado na Shopify", description: `#${seed.n}`, tone: "success", source: "shopify" });
  } else if (seed.shopify === "failed") {
    events.push(
      { id: "e5", at: t(5), title: "Falha ao criar pedido na Shopify", description: seed.shopifyError, tone: "danger", source: "shopify" },
      { id: "e6", at: t(20), title: "Novas tentativas esgotadas", description: `${seed.shopifyAttempts} tentativas sem sucesso. Ação manual necessária.`, tone: "danger", source: "sistema" },
    );
  } else {
    events.push({ id: "e5", at: t(5), title: "Criação do pedido na Shopify em andamento", description: `Tentativa ${seed.shopifyAttempts ?? 1} — aguardando resposta`, tone: "warning", source: "sistema" });
  }
  if (seed.payment === "refunded") {
    events.push({ id: "e7", at: t(90), title: "Reembolso registrado", description: "Reembolso total processado pela Whop", tone: "neutral", source: "whop" });
  }
  return events;
}

function buildOrder(seed: DemoOrderSeed): Order {
  const lines = seed.lines.map(([key, qty]) => orderLine(key, qty));
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal.amount, 0);
  const discount = seed.discount ?? 0;
  const total = subtotal - discount + seed.shipping;
  const suffix = String(seed.n);
  const ids = {
    attempt: `tent_demo_${suffix}`,
    session: `ch_demo_${suffix}`,
    payment: `pay_demo_${suffix}`,
  };
  const paid = seed.payment === "paid" || seed.payment === "refunded";
  return {
    id: `ord_demo_${suffix}`,
    reference: `VC-${seed.n}`,
    createdAt: minutesAgo(seed.minutes),
    customer: seed.customer,
    shippingAddress: DEMO_ADDRESS,
    lines,
    amounts: {
      subtotal: money(subtotal),
      discount: money(discount),
      shipping: money(seed.shipping),
      taxes: { title: "Impostos", amount: null, included: true },
      total: money(total),
    },
    discountCodes: seed.coupon ? [seed.coupon] : [],
    shippingTitle: seed.shipping === 4250 ? "Entrega expressa" : seed.shipping === 0 ? "Entrega econômica (frete grátis)" : "Entrega econômica",
    cartId: `cart_demo_${suffix}`,
    payment: {
      status: seed.payment,
      environment: "sandbox",
      attemptId: ids.attempt,
      whopSessionId: ids.session,
      whopPaymentId: paid || seed.payment === "failed" ? ids.payment : undefined,
      paidAt: paid ? minutesAgo(seed.minutes - 4) : undefined,
      failureMessage: seed.failureMessage,
    },
    shopify: {
      status: seed.shopify,
      orderId: seed.shopify === "synced" ? `gid://shopify/Order/demo-${suffix}` : undefined,
      orderName: seed.shopify === "synced" ? `#${seed.n}` : undefined,
      attempts: seed.shopifyAttempts ?? (seed.shopify === "synced" ? 1 : 0),
      lastError: seed.shopifyError,
      syncedAt: seed.shopify === "synced" ? minutesAgo(seed.minutes - 5) : undefined,
    },
    timeline: buildTimeline(seed, ids),
    isDemo: true,
  };
}

const ORDER_SEEDS: DemoOrderSeed[] = [
  {
    n: 1048,
    minutes: 14,
    customer: { name: "Marina Couto", email: "marina.couto@email.example", phone: "11987654321" },
    lines: [["luminaria", 1], ["caneca", 2]],
    shipping: 2490,
    payment: "paid",
    shopify: "pending",
    shopifyAttempts: 2,
  },
  {
    n: 1047,
    minutes: 52,
    customer: { name: "Rafael Nogueira", email: "rafael.n@email.example" },
    lines: [["manta", 1]],
    shipping: 4250,
    payment: "paid",
    shopify: "synced",
  },
  {
    n: 1046,
    minutes: 71,
    customer: { name: "Júlia Andrade", email: "julia.andrade@email.example" },
    lines: [["caneca", 4]],
    shipping: 2490,
    payment: "processing",
    shopify: "not_started",
  },
  {
    n: 1045,
    minutes: 128,
    customer: { name: "Carlos Menezes", email: "c.menezes@email.example" },
    lines: [["luminaria", 1]],
    shipping: 4250,
    payment: "failed",
    shopify: "not_started",
    failureMessage: "Pagamento recusado pelo emissor do cartão.",
  },
  {
    n: 1044,
    minutes: 205,
    customer: { name: "Beatriz Lima", email: "bia.lima@email.example", phone: "21998765432" },
    lines: [["manta", 1], ["caneca", 1]],
    shipping: 0,
    coupon: "FRETEGRATIS",
    payment: "paid",
    shopify: "failed",
    shopifyAttempts: 5,
    shopifyError: "Variante não encontrada na Shopify (produto removido após o pagamento).",
  },
  {
    n: 1043,
    minutes: 390,
    customer: { name: "Eduardo Prado", email: "eduardo.prado@email.example" },
    lines: [["luminaria", 1], ["manta", 1]],
    shipping: 2490,
    discount: 5089,
    coupon: "BEMVINDO10",
    payment: "paid",
    shopify: "synced",
  },
  {
    n: 1042,
    minutes: 610,
    customer: { name: "Fernanda Rocha", email: "fe.rocha@email.example" },
    lines: [["caneca", 2]],
    shipping: 2490,
    payment: "expired",
    shopify: "not_started",
  },
  {
    n: 1041,
    minutes: 1460,
    customer: { name: "Gustavo Reis", email: "gustavo.reis@email.example" },
    lines: [["manta", 2]],
    shipping: 4250,
    payment: "refunded",
    shopify: "synced",
  },
];

export function buildDemoOrders(): Order[] {
  return ORDER_SEEDS.map(buildOrder);
}

export const DEMO_CHECKOUT_TIPS = [
  "Cupons: BEMVINDO10 (10% de desconto), FRETEGRATIS (frete grátis) e EXPIRADO (cupom vencido).",
  "CEP 01310-100 preenche o endereço automaticamente; outros CEPs pedem preenchimento manual.",
  "CEP 99999-999 simula uma região sem entrega.",
  "CPF de teste válido: 529.982.247-25.",
];
