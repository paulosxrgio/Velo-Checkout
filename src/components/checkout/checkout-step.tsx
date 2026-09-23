import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepState = "active" | "complete" | "locked";

/** Seção numerada do checkout de uma página. */
export function CheckoutStep({
  id,
  number,
  title,
  description,
  state,
  action,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: StepState;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-px flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
              state === "complete" && "bg-brand text-brand-fg",
              state === "active" && "border-2 border-brand text-brand",
              state === "locked" && "bg-muted text-ink-muted",
            )}
          >
            {state === "complete" ? <Check className="size-4" strokeWidth={2.5} /> : state === "locked" ? <Lock className="size-3.5" /> : number}
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              <span className="sr-only">Etapa {number}: </span>
              {title}
              {state === "complete" ? <span className="sr-only"> (concluída)</span> : null}
            </h2>
            {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className="px-5 pt-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
    </section>
  );
}
