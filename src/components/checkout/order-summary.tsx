"use client";

import { useId, useState } from "react";
import { ArrowLeft, ChevronDown, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/spinner";
import { itemCount } from "@/domain/cart";
import { formatMoney } from "@/domain/money";
import type { Cart, Quote } from "@/domain/types";
import { cn } from "@/lib/cn";
import { CouponForm } from "./coupon-form";
import { LineItem } from "./line-item";
import { TotalsBreakdown } from "./totals";

export interface OrderSummaryProps {
  cart: Cart;
  quote: Quote;
  /** Bloqueia edição (ex.: durante o pagamento). */
  locked: boolean;
  recalculating: boolean;
  pendingLines: Record<string, boolean>;
  lineErrors: Record<string, string>;
  coupon: { status: "idle" | "applying" | "removing"; error: string | null };
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemoveLine: (lineId: string) => void;
  onApplyCoupon: (code: string) => Promise<boolean>;
  onRemoveCoupon: () => void;
}

export function OrderSummary(props: OrderSummaryProps) {
  const { cart, quote, locked, recalculating, pendingLines, lineErrors, coupon } = props;
  const editable = cart.allowQuantityEdit && !locked;
  const appliedCoupon = quote.discounts.find((d) => d.code) ?? null;

  return (
    <div>
      <ul aria-label="Itens do pedido">
        {cart.lines.map((line) => (
          <LineItem
            key={line.id}
            line={line}
            editable={editable}
            pending={Boolean(pendingLines[line.id])}
            error={lineErrors[line.id]}
            onQuantityChange={(quantity) => props.onQuantityChange(line.id, quantity)}
            onRemove={() => props.onRemoveLine(line.id)}
          />
        ))}
      </ul>

      <div className="mt-5 border-t border-line pt-5">
        <CouponForm
          applied={appliedCoupon}
          status={coupon.status}
          error={coupon.error}
          disabled={locked}
          onApply={props.onApplyCoupon}
          onRemove={props.onRemoveCoupon}
        />
      </div>

      <TotalsBreakdown quote={quote} itemCount={itemCount(cart)} busy={recalculating} className="mt-5 border-t border-line pt-5" />

      <a
        href={cart.source.cartUrl}
        className="mt-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar ao carrinho da loja
      </a>
    </div>
  );
}

/** Painel lateral fixo no desktop. */
export function SummaryAside(props: OrderSummaryProps) {
  return (
    <section aria-labelledby="summary-title" className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
      <h2 id="summary-title" className="mb-5 text-base font-semibold tracking-[-0.01em] text-ink">
        Resumo do pedido
      </h2>
      <OrderSummary {...props} />
    </section>
  );
}

/** Resumo recolhível exibido no topo em telas pequenas. */
export function MobileSummary(props: OrderSummaryProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const count = itemCount(props.cart);

  return (
    <section aria-label="Resumo do pedido" className="border-b border-line bg-surface lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 text-left sm:px-6"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-brand">
          <ShoppingBag className="size-4" aria-hidden="true" />
          {open ? "Ocultar resumo" : "Ver resumo"} · {count} {count === 1 ? "item" : "itens"}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-ink tabular-nums">
          {props.recalculating ? <Skeleton className="h-5 w-20" /> : formatMoney(props.quote.total)}
        </span>
      </button>
      <div id={panelId} hidden={!open} className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
        <OrderSummary {...props} />
      </div>
    </section>
  );
}
