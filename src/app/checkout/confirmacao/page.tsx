import type { Metadata } from "next";
import { PaymentStatusExperience } from "@/features/checkout/payment-status-experience";

export const metadata: Metadata = { title: "Status do pagamento" };

/**
 * Página de retorno após o pagamento. Consulta o status da tentativa na camada
 * de dados (servidor); parâmetros da URL nunca são tratados como confirmação.
 */
export default async function ConfirmationPage({ searchParams }: PageProps<"/checkout/confirmacao">) {
  const { tentativa } = await searchParams;
  const attemptId = typeof tentativa === "string" && tentativa ? tentativa : null;
  return <PaymentStatusExperience key={attemptId ?? "sem-tentativa"} attemptId={attemptId} />;
}
