"use client";

import { Minus, Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  max,
  pending,
  disabled,
  itemLabel,
  onChange,
}: {
  value: number;
  /** `null` quando não há limite de estoque conhecido. */
  max: number | null;
  pending?: boolean;
  disabled?: boolean;
  itemLabel: string;
  onChange: (value: number) => void;
}) {
  const atMax = max !== null && value >= max;
  const buttonClass =
    "flex size-9 items-center justify-center text-ink-soft transition-colors hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:text-ink-muted/50 disabled:hover:bg-transparent";

  return (
    <div
      role="group"
      aria-label={`Quantidade de ${itemLabel}`}
      className={cn(
        "inline-flex h-9 items-center overflow-hidden rounded-[var(--radius-control)] border border-line-strong bg-surface",
        disabled && "opacity-60",
      )}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value - 1)}
        disabled={disabled || pending || value <= 1}
        aria-label={`Diminuir quantidade de ${itemLabel}`}
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </button>
      <span className="flex w-9 items-center justify-center text-sm font-medium tabular-nums text-ink" aria-live="polite">
        {pending ? <Spinner className="size-3.5 text-ink-muted" label="Atualizando quantidade" /> : value}
      </span>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(value + 1)}
        disabled={disabled || pending || atMax}
        aria-label={atMax ? `Quantidade máxima disponível de ${itemLabel}` : `Aumentar quantidade de ${itemLabel}`}
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
