"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";
import type { PaymentEnvironment } from "@/domain/types";
import { EmbedSkeleton } from "./embed-skeleton";

export interface WhopEmbedProps {
  sessionId: string;
  environment: PaymentEnvironment;
  returnUrl: string;
  prefillEmail?: string;
  accentColor?: string;
  onComplete: (result: { receiptId?: string }) => void;
  onPaymentError: (error: { message: string; code?: string }) => void;
}

/**
 * Checkout incorporado oficial da Whop (`@whop/checkout`).
 *
 * Só é renderizado quando o servidor devolver uma sessão real (`sessionId`).
 * Os dados de pagamento são digitados dentro do iframe da Whop: este app
 * nunca recebe números de cartão. `onComplete` apenas avisa que o comprador
 * concluiu o fluxo; a confirmação do pagamento vem do servidor.
 */
export default function WhopEmbed({
  sessionId,
  environment,
  returnUrl,
  prefillEmail,
  accentColor,
  onComplete,
  onPaymentError,
}: WhopEmbedProps) {
  return (
    <WhopCheckoutEmbed
      sessionId={sessionId}
      environment={environment}
      returnUrl={returnUrl}
      theme="light"
      locale="pt"
      prefill={prefillEmail ? { email: prefillEmail } : undefined}
      themeOptions={accentColor ? { accentColor } : undefined}
      onComplete={(_sessionId: string, receiptId: string | undefined) => onComplete({ receiptId })}
      onPaymentError={(error) => onPaymentError({ message: error.message, code: error.code })}
      fallback={<EmbedSkeleton />}
    />
  );
}
