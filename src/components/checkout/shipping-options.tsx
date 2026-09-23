"use client";

import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { formatDeliveryEstimate } from "@/domain/format";
import { formatMoney } from "@/domain/money";
import type { ShippingOptions as ShippingOptionsData } from "@/domain/types";
import { cn } from "@/lib/cn";

export function ShippingOptions({
  options,
  postalCodeReady,
  request,
  disabled,
  onSelect,
  onRetry,
}: {
  options: ShippingOptionsData | null;
  /** O CEP digitado está completo e corresponde ao cálculo exibido. */
  postalCodeReady: boolean;
  request: { status: "idle" | "loading" | "selecting" | "error"; error: string | null };
  disabled?: boolean;
  onSelect: (rateId: string) => void;
  onRetry: () => void;
}) {
  return (
    <fieldset className="min-w-0" aria-busy={request.status === "loading"}>
      <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <Truck className="size-4 text-ink-muted" aria-hidden="true" />
        Opções de entrega
      </legend>

      {request.status === "loading" ? (
        <div className="space-y-2" role="status">
          <span className="sr-only">Calculando frete…</span>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line px-4 py-4">
              <Skeleton className="size-4 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
          <p className="flex items-center gap-2 text-sm text-ink-muted" aria-hidden="true">
            <Spinner className="size-3.5" /> Calculando frete para o seu CEP…
          </p>
        </div>
      ) : request.status === "error" ? (
        <Callout
          tone="danger"
          role="alert"
          title="Não foi possível calcular o frete"
          action={
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          }
        >
          {request.error}
        </Callout>
      ) : !postalCodeReady || !options || options.status === "pending_address" ? (
        <p className="rounded-[var(--radius-control)] border border-dashed border-line-strong px-4 py-4 text-sm text-ink-muted">
          Informe o CEP para ver prazos e valores de entrega.
        </p>
      ) : options.status === "unavailable" ? (
        <Callout tone="warning" role="alert" title="Sem entrega para este CEP">
          {options.message ?? "Não há opções de entrega para o endereço informado."}
        </Callout>
      ) : (
        <div className="space-y-2">
          {options.rates.map((rate) => {
            const checked = rate.id === options.selectedRateId;
            const selecting = request.status === "selecting" && checked;
            return (
              <label
                key={rate.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                  checked ? "border-brand bg-brand-soft" : "border-line-strong hover:border-ink-muted/60",
                  disabled && "cursor-not-allowed opacity-70",
                )}
              >
                <input
                  type="radio"
                  name="shipping-rate"
                  value={rate.id}
                  checked={checked}
                  disabled={disabled || request.status === "selecting"}
                  onChange={() => onSelect(rate.id)}
                  className="size-4 shrink-0 accent-[var(--brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{rate.title}</span>
                  <span className="block text-[13px] text-ink-muted">
                    {formatDeliveryEstimate(rate.deliveryEstimate.minBusinessDays, rate.deliveryEstimate.maxBusinessDays)}
                  </span>
                </span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink tabular-nums">
                  {selecting ? <Spinner className="size-3.5 text-ink-muted" label="Atualizando frete" /> : null}
                  {rate.price.amount === 0 ? "Grátis" : formatMoney(rate.price)}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
