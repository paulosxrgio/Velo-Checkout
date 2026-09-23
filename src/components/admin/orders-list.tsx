import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { formatDateTime } from "@/domain/format";
import { formatMoney } from "@/domain/money";
import { requiresAttention } from "@/domain/operation";
import type { Order } from "@/domain/types";
import { cn } from "@/lib/cn";
import { PaymentBadge, SyncBadge } from "./status";

function isPaid(order: Order) {
  return order.payment.status === "paid" || order.payment.status === "refunded";
}

function AttentionFlag() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
      <TriangleAlert className="size-3.5" aria-hidden="true" />
      Pago, pedido não criado
    </span>
  );
}

/**
 * Lista de pedidos: tabela no desktop e cartões no celular.
 * `compact` usa sempre os cartões, para espaços estreitos como a visão geral.
 */
export function OrdersList({ orders, compact }: { orders: Order[]; compact?: boolean }) {
  return (
    <>
      {!compact ? (
      <table className="hidden w-full text-left text-sm md:table">
        <caption className="sr-only">Pedidos</caption>
        <thead>
          <tr className="border-b border-line text-xs font-medium tracking-wide text-ink-muted uppercase">
            <th scope="col" className="py-3 pr-4 pl-5 font-medium sm:pl-6">Pedido</th>
            <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
            <th scope="col" className="px-4 py-3 font-medium">Pagamento</th>
            <th scope="col" className="px-4 py-3 font-medium">Shopify</th>
            <th scope="col" className="py-3 pr-5 pl-4 font-medium sm:pr-6">Data</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => {
            const attention = requiresAttention(order);
            return (
              <tr key={order.id} className={cn("group relative transition-colors hover:bg-muted/50", attention && "bg-warning-soft/50")}>
                <td className={cn("py-3.5 pr-4 pl-5 sm:pl-6", attention && "shadow-[inset_3px_0_0_var(--color-warning)]")}>
                  <Link href={`/admin/pedidos/${order.id}`} className="font-medium text-ink after:absolute after:inset-0 hover:underline">
                    {order.reference}
                  </Link>
                  {attention ? (
                    <div className="mt-0.5">
                      <AttentionFlag />
                    </div>
                  ) : null}
                </td>
                <td className="max-w-48 px-4 py-3.5">
                  <p className="truncate text-ink">{order.customer.name}</p>
                  <p className="truncate text-xs text-ink-muted">{order.customer.email}</p>
                </td>
                <td className="px-4 py-3.5 text-right font-medium text-ink tabular-nums">{formatMoney(order.amounts.total)}</td>
                <td className="px-4 py-3.5">
                  <PaymentBadge status={order.payment.status} />
                </td>
                <td className="px-4 py-3.5">
                  <SyncBadge status={order.shopify.status} paid={isPaid(order)} />
                </td>
                <td className="py-3.5 pr-5 pl-4 whitespace-nowrap text-ink-muted sm:pr-6">{formatDateTime(order.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      ) : null}

      <ul className={cn("divide-y divide-line", !compact && "md:hidden")}>
        {orders.map((order) => {
          const attention = requiresAttention(order);
          return (
            <li key={order.id}>
              <Link
                href={`/admin/pedidos/${order.id}`}
                className={cn("flex items-start gap-3 px-5 py-4 hover:bg-muted/50", attention && "bg-warning-soft/50 shadow-[inset_3px_0_0_var(--color-warning)]")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-ink">{order.reference}</p>
                    <p className="font-medium text-ink tabular-nums">{formatMoney(order.amounts.total)}</p>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-ink-muted">
                    {order.customer.name} · {formatDateTime(order.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PaymentBadge status={order.payment.status} />
                    <SyncBadge status={order.shopify.status} paid={isPaid(order)} />
                  </div>
                  {attention ? (
                    <div className="mt-2">
                      <AttentionFlag />
                    </div>
                  ) : null}
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
