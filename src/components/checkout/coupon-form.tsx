"use client";

import { useId, useState, type FormEvent } from "react";
import { ChevronDown, TicketPercent, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import type { AppliedDiscount } from "@/domain/types";
import { cn } from "@/lib/cn";

export function CouponForm({
  applied,
  status,
  error,
  disabled,
  onApply,
  onRemove,
}: {
  applied: AppliedDiscount | null;
  status: "idle" | "applying" | "removing";
  error: string | null;
  disabled?: boolean;
  onApply: (code: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const panelId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await onApply(code);
    if (ok) {
      setCode("");
      setOpen(false);
    }
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-success-line bg-success-soft px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <TicketPercent className="size-4 shrink-0 text-success" aria-hidden="true" />
          <span className="min-w-0 truncate">
            <span className="font-semibold text-ink">{applied.code}</span>
            <span className="text-ink-soft"> · {applied.title}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || status !== "idle"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-white/60 hover:text-ink disabled:opacity-50"
          aria-label={`Remover cupom ${applied.code}`}
        >
          {status === "removing" ? <Spinner className="size-4" label="Removendo cupom" /> : <X className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open || Boolean(error)}
        aria-controls={panelId}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-50"
      >
        <TicketPercent className="size-4" aria-hidden="true" />
        Adicionar cupom de desconto
        <ChevronDown className={cn("size-4 transition-transform", (open || error) && "rotate-180")} aria-hidden="true" />
      </button>
      <form id={panelId} hidden={!(open || error)} onSubmit={submit} className="mt-3 flex items-start gap-2" noValidate>
        <TextField
          label="Cupom de desconto"
          containerClassName="flex-1 [&_label]:sr-only"
          placeholder="Código do cupom"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          error={error ?? undefined}
          disabled={disabled}
          className="h-11 uppercase placeholder:normal-case"
        />
        <Button type="submit" variant="secondary" loading={status === "applying"} loadingLabel="Aplicando" disabled={disabled} className="h-11">
          Aplicar
        </Button>
      </form>
    </div>
  );
}
