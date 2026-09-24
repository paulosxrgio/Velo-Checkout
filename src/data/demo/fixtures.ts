import { money } from "@/domain/money";
import type { PostalCodeLookup, Product, ProductVariant, StorefrontInfo } from "@/domain/types";

/**
 * DADOS DE DEMONSTRAÇÃO DO CHECKOUT.
 * Loja, produtos, preços e IDs são fictícios. Domínios usam o TLD reservado
 * `.example` e IDs carregam o marcador `demo`.
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

/* ----------------------------- Loja fictícia ------------------------------ */

/** Identidade fixa da loja de demonstração: não lê nem mistura configurações reais. */
export const DEMO_STOREFRONT: StorefrontInfo = {
  appearance: {
    storeName: "Casa Aurora",
    logoUrl: null,
    primaryColor: "#1f4d3a",
    supportText: "Dúvidas sobre o pedido? Escreva para atendimento@casaaurora.example",
  },
  storeUrl: DEMO_STORE_URL,
  policies: [
    { title: "Trocas e devoluções", url: `${DEMO_STORE_URL}/policies/refund-policy` },
    { title: "Privacidade", url: `${DEMO_STORE_URL}/policies/privacy-policy` },
    { title: "Termos de serviço", url: `${DEMO_STORE_URL}/policies/terms-of-service` },
  ],
};

export const DEMO_CHECKOUT_TIPS = [
  "Cupons: BEMVINDO10 (10% de desconto), FRETEGRATIS (frete grátis) e EXPIRADO (cupom vencido).",
  "CEP 01310-100 preenche o endereço automaticamente; outros CEPs pedem preenchimento manual.",
  "CEP 99999-999 simula uma região sem entrega.",
  "CPF de teste válido: 529.982.247-25.",
];
