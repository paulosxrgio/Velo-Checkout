import type { AdminGateway, CheckoutGateway } from "./contracts";
import { demoCheckoutGateway } from "./demo/checkout-gateway";
import { httpAdminGateway } from "./http/admin-gateway";
import { liveCheckoutGateway } from "./live/checkout-gateway";
import { DataSourceConfigError, isDemoAttemptId, isDemoCartToken, resolveDataSource } from "./source";

/**
 * Único ponto de escolha da fonte de dados (ver src/data/source.ts).
 *
 * - Painel: somente o adaptador HTTP autenticado. No modo "demo" não há painel.
 * - Checkout: cenários `demo*` usam o adaptador demonstrativo (sempre rotulado);
 *   qualquer outro carrinho usa o adaptador real. No modo "demo", tudo é demonstração.
 *
 * Configuração ausente ou inválida lança `DataSourceConfigError`; nunca há
 * recaída silenciosa para dados demonstrativos.
 */

export function getAdminGateway(): AdminGateway {
  const source = resolveDataSource();
  if (source === "api") return httpAdminGateway;
  throw new DataSourceConfigError(
    'O painel exige NEXT_PUBLIC_DATA_SOURCE="api" com o banco configurado. O modo "demo" oferece apenas o checkout de demonstração.',
  );
}

export type CheckoutReference = { cartToken: string | null } | { attemptId: string | null };

/** Indica se a referência pertence aos cenários de demonstração. */
export function isDemoCheckout(reference: CheckoutReference): boolean {
  if (resolveDataSource() === "demo") return true;
  return "cartToken" in reference ? isDemoCartToken(reference.cartToken) : isDemoAttemptId(reference.attemptId);
}

/** Modo do checkout para a referência, sem lançar exceção (para decidir o que renderizar). */
export function checkoutMode(reference: CheckoutReference): { ok: true; demo: boolean } | { ok: false; message: string } {
  try {
    return { ok: true, demo: isDemoCheckout(reference) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Configuração inválida." };
  }
}

export function getCheckoutGateway(reference: CheckoutReference): CheckoutGateway {
  return isDemoCheckout(reference) ? demoCheckoutGateway : liveCheckoutGateway;
}

export type { AdminGateway, CheckoutGateway, CheckoutState } from "./contracts";
export { GatewayError, toGatewayError } from "./contracts";
export { DataSourceConfigError, isDemoCartToken, peekDataSource, resolveDataSource } from "./source";
