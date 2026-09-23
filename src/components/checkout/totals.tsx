import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/spinner";
import { formatMoney } from "@/domain/money";
import type { Quote } from "@/domain/types";
import { cn } from "@/lib/cn";

function Row({
  label,
  value,
  busy,
  muted,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  busy?: boolean;
  muted?: boolean;
  tone?: "success";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn("text-right tabular-nums", muted ? "text-ink-muted" : "text-ink", tone === "success" && "text-success")}>
        {busy ? <Skeleton className="inline-block h-4 w-16 align-middle" /> : value}
      </dd>
    </div>
  );
}

/**
 * Discriminação dos valores da cotação. Apenas exibe o que o servidor calculou.
 */
export function TotalsBreakdown({
  quote,
  itemCount,
  busy,
  className,
}: {
  quote: Quote;
  itemCount: number;
  busy: boolean;
  className?: string;
}) {
  return (
    <div className={className} aria-busy={busy}>
      <dl className="space-y-2.5">
        <Row label={`Subtotal · ${itemCount} ${itemCount === 1 ? "item" : "itens"}`} value={formatMoney(quote.subtotal)} busy={busy} />
        {quote.discounts.map((discount) => (
          <Row
            key={discount.code}
            label={
              <>
                Desconto <span className="font-medium text-ink">{discount.code}</span>
              </>
            }
            value={`−${formatMoney(discount.amount)}`}
            busy={busy}
            tone="success"
          />
        ))}
        <Row
          label={quote.shipping ? `Frete · ${quote.shipping.title}` : "Frete"}
          value={quote.shipping ? (quote.shipping.amount.amount === 0 ? "Grátis" : formatMoney(quote.shipping.amount)) : "Informe o CEP"}
          muted={!quote.shipping}
          busy={busy}
        />
        {quote.taxes ? (
          <Row
            label={quote.taxes.title}
            value={
              quote.taxes.included
                ? quote.taxes.amount
                  ? `Inclui ${formatMoney(quote.taxes.amount)}`
                  : "Inclusos no preço"
                : quote.taxes.amount
                  ? formatMoney(quote.taxes.amount)
                  : "—"
            }
            muted={quote.taxes.included}
            busy={busy}
          />
        ) : null}
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <span className="text-base font-semibold text-ink">Total</span>
        <span className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-ink-muted">{quote.currencyCode}</span>
          {busy ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <span className="text-2xl font-semibold tracking-[-0.02em] text-ink tabular-nums">{formatMoney(quote.total)}</span>
          )}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {busy ? "Atualizando valores do pedido." : `Total do pedido: ${formatMoney(quote.total)}.`}
      </p>
    </div>
  );
}
