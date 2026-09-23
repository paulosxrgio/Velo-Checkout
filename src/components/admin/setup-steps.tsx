import Link from "next/link";
import { ArrowRight, Check, Lock, Plug } from "lucide-react";
import type { SetupStep } from "@/domain/types";
import { cn } from "@/lib/cn";
import { setupStateMeta, StatusBadge } from "./status";

function StepMarker({ step, index }: { step: SetupStep; index: number }) {
  const base = "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold";
  if (step.state === "done") return <span className={cn(base, "bg-success text-white")}><Check className="size-4" strokeWidth={2.5} aria-hidden="true" /></span>;
  if (step.state === "integration_pending") return <span className={cn(base, "border border-warning-line bg-warning-soft text-warning")}><Plug className="size-4" aria-hidden="true" /></span>;
  if (step.state === "blocked") return <span className={cn(base, "border border-line bg-muted text-ink-muted")}><Lock className="size-3.5" aria-hidden="true" /></span>;
  return <span className={cn(base, "border-2 border-accent bg-surface text-accent")}>{index + 1}</span>;
}

/** Etapas da configuração guiada em formato de trilha vertical. */
export function SetupStepList({ steps }: { steps: SetupStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last ? <span aria-hidden="true" className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-line-strong" /> : null}
            <StepMarker step={step} index={index} />
            <div className="min-w-0 flex-1 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink-muted">Etapa {index + 1}</p>
                  <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
                </div>
                <StatusBadge meta={setupStateMeta[step.state]} size="sm" />
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">{step.description}</p>
              {step.note ? <p className="mt-2 text-[13px] text-ink-muted">{step.note}</p> : null}
              {step.cta ? (
                <Link
                  href={step.cta.href}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-accent hover:text-accent-strong hover:underline"
                >
                  {step.cta.label}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function SetupProgress({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.state === "done").length;
  const pct = Math.round((done / steps.length) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">
          {done} de {steps.length} etapas concluídas
        </span>
        <span className="text-ink-muted tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        aria-label="Progresso da configuração"
      >
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}
