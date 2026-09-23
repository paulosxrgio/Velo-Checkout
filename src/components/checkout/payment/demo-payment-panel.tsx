"use client";

import { useState } from "react";
import { CircleCheck, CircleX, Clock, FlaskConical, ShieldAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

export type DemoOutcome = "paid" | "declined" | "pending" | "failed_after_submit";

const outcomes: { value: DemoOutcome; label: string; description: string; icon: typeof CircleCheck; tone: string }[] = [
  { value: "paid", label: "Aprovado", description: "Vai para a confirmação", icon: CircleCheck, tone: "text-success" },
  { value: "declined", label: "Recusado", description: "Erro no formulário", icon: CircleX, tone: "text-danger" },
  { value: "pending", label: "Pendente", description: "Confirma após alguns segundos", icon: Clock, tone: "text-warning" },
  { value: "failed_after_submit", label: "Falha posterior", description: "Recusado após o envio", icon: ShieldAlert, tone: "text-danger" },
];

/**
 * Espaço reservado para o checkout da Whop enquanto a integração real não existe.
 * Não exibe campos de cartão: apenas permite simular o resultado para navegar pelos estados.
 */
export function DemoPaymentPanel({ onSimulate }: { onSimulate: (outcome: DemoOutcome) => Promise<void> }) {
  const [running, setRunning] = useState<DemoOutcome | null>(null);

  async function simulate(outcome: DemoOutcome) {
    setRunning(outcome);
    try {
      await onSimulate(outcome);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-control)] border-2 border-dashed border-demo-line bg-demo-soft/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-demo shadow-[var(--shadow-card)]">
          <FlaskConical className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Área do checkout Whop · demonstração</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            Quando a integração estiver ativa, o formulário seguro da Whop aparece aqui. Os dados de pagamento são digitados
            diretamente na Whop. Nada é cobrado nesta demonstração.
          </p>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[13px] font-medium text-ink-soft">Simular resultado do pagamento</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;
            return (
              <button
                key={outcome.value}
                type="button"
                disabled={running !== null}
                onClick={() => simulate(outcome.value)}
                className="flex min-h-12 items-center gap-2.5 rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-demo-line disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running === outcome.value ? (
                  <Spinner className="size-4 shrink-0 text-ink-muted" label="Simulando" />
                ) : (
                  <Icon className={cn("size-4 shrink-0", outcome.tone)} aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    <span className="sr-only">Simular: </span>
                    {outcome.label}
                  </span>
                  <span className="block text-xs text-ink-muted">{outcome.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
