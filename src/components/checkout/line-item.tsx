"use client";

import Image from "next/image";
import { CircleAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPriceChange, getStockLimit, isLineUnavailable } from "@/domain/cart";
import { formatMoney } from "@/domain/money";
import type { CartLine } from "@/domain/types";
import { cn } from "@/lib/cn";
import { QuantityStepper } from "./quantity-stepper";

export function ProductThumb({
  src,
  alt,
  quantity,
  dimmed,
  size = "md",
}: {
  src?: string;
  alt: string;
  quantity?: number;
  dimmed?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className={cn("relative shrink-0", size === "md" ? "size-16" : "size-12")}>
      <div className={cn("relative size-full overflow-hidden rounded-lg border border-line bg-muted", dimmed && "opacity-50 grayscale")}>
        {src ? <Image src={src} alt={alt} fill sizes="64px" unoptimized={src.endsWith(".svg")} className="object-cover" /> : null}
      </div>
      {quantity !== undefined ? (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-soft px-1.5 text-[11px] font-semibold text-white tabular-nums">
          <span className="sr-only">Quantidade: </span>
          {quantity}
        </span>
      ) : null}
    </div>
  );
}

export function LineItem({
  line,
  editable,
  pending,
  error,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine;
  editable: boolean;
  pending: boolean;
  error?: string;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const unavailable = isLineUnavailable(line);
  const priceChange = getPriceChange(line);
  const stockLimit = getStockLimit(line);
  const label = `${line.product.title} (${line.variant.title})`;

  return (
    <li className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
      <ProductThumb
        src={line.variant.image?.url}
        alt={line.variant.image?.altText ?? line.product.title}
        quantity={editable ? undefined : line.quantity}
        dimmed={unavailable}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-sm leading-snug font-medium text-ink", unavailable && "text-ink-muted")}>{line.product.title}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">{line.variant.title}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("text-sm font-medium text-ink tabular-nums", unavailable && "text-ink-muted line-through")}>
              {formatMoney(line.lineTotal)}
            </p>
            {line.quantity > 1 && !unavailable ? (
              <p className="text-xs text-ink-muted tabular-nums">{formatMoney(line.unitPrice)} cada</p>
            ) : null}
          </div>
        </div>

        {unavailable ? (
          <div className="mt-2">
            <Badge tone="danger" size="sm" dot>
              Indisponível
            </Badge>
          </div>
        ) : null}

        {priceChange ? (
          <p className="mt-2 text-[13px] text-warning">
            Preço atualizado: de <span className="line-through">{formatMoney(priceChange.previousUnitPrice)}</span> por{" "}
            <strong className="font-semibold">{formatMoney(line.unitPrice)}</strong>
          </p>
        ) : null}

        {editable ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {!unavailable ? (
              <QuantityStepper
                value={line.quantity}
                max={stockLimit}
                pending={pending}
                itemLabel={label}
                onChange={onQuantityChange}
              />
            ) : null}
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors disabled:opacity-50",
                unavailable ? "text-danger hover:bg-danger-soft" : "text-ink-muted hover:bg-muted hover:text-ink",
              )}
              aria-label={`Remover ${label}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Remover
            </button>
            {stockLimit !== null && !unavailable && line.quantity >= stockLimit ? (
              <span className="text-xs text-ink-muted">Máximo disponível: {stockLimit}</span>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] text-danger">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
