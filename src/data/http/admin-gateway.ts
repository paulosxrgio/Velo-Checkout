import type {
  AppearanceSettings,
  DomainSettings,
  OperationSettings,
  OperationSnapshot,
  Order,
  ShopifyConnection,
  WhopConnection,
} from "@/domain/types";
import { GatewayError, type AdminGateway, type GatewayErrorCode } from "../contracts";

/**
 * Adaptador do painel que conversa com as rotas autenticadas `/api/admin/*`.
 *
 * O cookie de sessão é httpOnly e segue automaticamente (mesma origem); o
 * navegador nunca manipula tokens ou credenciais. Sessão expirada (401)
 * leva à tela de login, preservando a página atual.
 */

type ErrorBody = { error?: { code?: string; message?: string; fieldErrors?: Record<string, string> } };

const CODE_BY_STATUS: Record<number, GatewayErrorCode> = {
  401: "unauthorized",
  404: "not_found",
  413: "validation",
  415: "validation",
  422: "validation",
  503: "misconfigured",
};

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  // Navegação completa de propósito: sessão expirada descarta todo o estado do cliente.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`/entrar?next=${encodeURIComponent(next)}`);
}

async function request<T>(path: string, init: { method?: "GET" | "PUT"; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: init.body === undefined ? { accept: "application/json" } : { accept: "application/json", "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new GatewayError("network", "Não foi possível se comunicar com o servidor. Verifique a conexão e tente novamente.");
  }

  const body = (await response.json().catch(() => null)) as ({ data?: T } & ErrorBody) | null;

  if (!response.ok) {
    const code = CODE_BY_STATUS[response.status] ?? "server";
    if (code === "unauthorized") redirectToLogin();
    throw new GatewayError(
      code,
      body?.error?.message ?? "Erro inesperado no servidor. Tente novamente em instantes.",
      body?.error?.fieldErrors,
    );
  }
  if (!body || !("data" in body)) throw new GatewayError("server", "Resposta inesperada do servidor.");
  return body.data as T;
}

export const httpAdminGateway: AdminGateway = {
  getSnapshot: () => request<OperationSnapshot>("/snapshot"),
  getShopifyConnection: () => request<ShopifyConnection>("/shopify"),
  getWhopConnection: () => request<WhopConnection>("/whop"),
  getDomainSettings: () => request<DomainSettings>("/domain"),
  saveCheckoutHostname: (hostname) => request<DomainSettings>("/domain", { method: "PUT", body: { hostname } }),
  getAppearance: () => request<AppearanceSettings>("/appearance"),
  saveAppearance: (appearance) => request<AppearanceSettings>("/appearance", { method: "PUT", body: appearance }),
  getSettings: () => request<OperationSettings>("/settings"),
  saveSettings: (settings) => request<OperationSettings>("/settings", { method: "PUT", body: settings }),
  listOrders: () => request<Order[]>("/orders"),
  getOrder: async (id) => {
    try {
      return await request<Order>(`/orders/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof GatewayError && error.code === "not_found") return null;
      throw error;
    }
  },
};
