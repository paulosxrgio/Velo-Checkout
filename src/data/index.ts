import type { AdminGateway, CheckoutGateway } from "./contracts";
import { demoAdminGateway } from "./demo/admin-gateway";
import { demoCheckoutGateway } from "./demo/checkout-gateway";

/**
 * Ponto único de troca da fonte de dados.
 * Para integrar as APIs reais, implemente os contratos em `src/data/http`
 * e selecione-os aqui a partir de `NEXT_PUBLIC_DATA_SOURCE`.
 */
export const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "demo";

export const isDemoData = dataSource === "demo";

export function getCheckoutGateway(): CheckoutGateway {
  return demoCheckoutGateway;
}

export function getAdminGateway(): AdminGateway {
  return demoAdminGateway;
}

export type { AdminGateway, CheckoutGateway, CheckoutState } from "./contracts";
export { GatewayError, toGatewayError } from "./contracts";
