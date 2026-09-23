"use client";

import dynamic from "next/dynamic";
import type { PaymentSession } from "@/domain/types";
import { DemoPaymentPanel, type DemoOutcome } from "./demo-payment-panel";
import { EmbedSkeleton } from "./embed-skeleton";

// Carregado sob demanda: o código da Whop só é baixado quando existir uma sessão real.
const WhopEmbed = dynamic(() => import("./whop-embed"), { ssr: false, loading: () => <EmbedSkeleton /> });

export interface WhopCheckoutSlotProps {
  session: PaymentSession;
  prefillEmail?: string;
  accentColor?: string;
  onComplete: (result: { receiptId?: string }) => void;
  onPaymentError: (error: { message: string; code?: string }) => void;
  /** Somente demonstração: simula o resultado sem a Whop. */
  onDemoOutcome?: (outcome: DemoOutcome) => Promise<void>;
}

/**
 * Fronteira isolada entre o checkout e o provedor de pagamento.
 * Recebe a sessão criada pelo servidor e decide o que renderizar.
 */
export function WhopCheckoutSlot({ session, prefillEmail, accentColor, onComplete, onPaymentError, onDemoOutcome }: WhopCheckoutSlotProps) {
  if (session.kind === "whop_embed") {
    return (
      <WhopEmbed
        sessionId={session.sessionId}
        environment={session.environment}
        returnUrl={session.returnUrl}
        prefillEmail={prefillEmail}
        accentColor={accentColor}
        onComplete={onComplete}
        onPaymentError={onPaymentError}
      />
    );
  }

  return <DemoPaymentPanel onSimulate={onDemoOutcome ?? (async () => undefined)} />;
}
