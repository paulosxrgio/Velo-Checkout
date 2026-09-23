import type { Metadata } from "next";
import { CheckoutExperience } from "@/features/checkout/checkout-experience";

export const metadata: Metadata = { title: "Finalizar compra" };

/**
 * Checkout do comprador. Recebe o token de repasse do carrinho da Shopify em
 * `?carrinho=`. Na demonstração, tokens como `demo` e `demo-indisponivel`
 * selecionam cenários fictícios.
 */
export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const { carrinho } = await searchParams;
  const cartToken = typeof carrinho === "string" && carrinho ? carrinho : null;
  return <CheckoutExperience key={cartToken ?? "sem-carrinho"} cartToken={cartToken} />;
}
