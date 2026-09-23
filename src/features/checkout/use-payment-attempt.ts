"use client";

import { useEffect, useState } from "react";
import { getCheckoutGateway, toGatewayError, type GatewayError } from "@/data";
import type { PaymentAttempt } from "@/domain/types";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLING_MS = 5 * 60_000;

export interface PaymentAttemptView {
  phase: "missing" | "loading" | "ready" | "error";
  attempt?: PaymentAttempt;
  error?: GatewayError;
  checkedAt?: string;
  /** Há nova consulta agendada. */
  polling: boolean;
  /** O limite de consultas automáticas foi atingido sem estado final. */
  timedOut: boolean;
}

/** Status que ainda podem mudar e justificam nova consulta. */
export function isSettling(attempt: PaymentAttempt): boolean {
  if (attempt.status === "awaiting_payment" || attempt.status === "processing") return true;
  return attempt.status === "paid" && attempt.order?.status === "pending";
}

/**
 * Consulta o status de uma tentativa de pagamento no servidor, repetindo em
 * intervalos enquanto o estado não for final. É a única fonte de verdade da
 * página de confirmação: voltar da Whop não confirma nada por si só.
 */
export function usePaymentAttempt(attemptId: string | null) {
  const [view, setView] = useState<PaymentAttemptView>({
    phase: attemptId ? "loading" : "missing",
    polling: false,
    timedOut: false,
  });
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!attemptId) return;
    const gateway = getCheckoutGateway();
    const startedAt = Date.now();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      timer = setTimeout(check, POLL_INTERVAL_MS);
    }

    function check() {
      gateway.getPaymentAttempt(attemptId as string).then(
        (attempt) => {
          if (cancelled) return;
          const settling = isSettling(attempt);
          const withinWindow = Date.now() - startedAt < MAX_POLLING_MS;
          setView({
            phase: "ready",
            attempt,
            checkedAt: new Date().toISOString(),
            polling: settling && withinWindow,
            timedOut: settling && !withinWindow,
          });
          if (settling && withinWindow) schedule();
        },
        (error: unknown) => {
          if (cancelled) return;
          setView((previous) => ({
            ...previous,
            phase: previous.attempt ? "ready" : "error",
            error: toGatewayError(error),
            polling: false,
          }));
        },
      );
    }

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId, round]);

  return {
    ...view,
    refresh: () => {
      setView((previous) => ({ ...previous, error: undefined, timedOut: false, polling: true }));
      setRound((r) => r + 1);
    },
  };
}
