"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { OrdersList } from "@/components/admin/orders-list";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getAdminGateway } from "@/data";
import { requiresAttention } from "@/domain/operation";
import type { Order } from "@/domain/types";
import { useResource } from "@/lib/use-resource";

type Filter = "todos" | "atencao" | "pagos" | "pendentes" | "nao-pagos";

const FILTERS: { value: Filter; label: string; test: (o: Order) => boolean }[] = [
  { value: "todos", label: "Todos", test: () => true },
  { value: "atencao", label: "Exigem atenção", test: requiresAttention },
  { value: "pagos", label: "Pagos", test: (o) => o.payment.status === "paid" },
  { value: "pendentes", label: "Pendentes", test: (o) => o.payment.status === "processing" || o.payment.status === "awaiting_payment" },
  { value: "nao-pagos", label: "Não pagos", test: (o) => ["failed", "expired", "refunded"].includes(o.payment.status) },
];

function isFilter(value: string | null): value is Filter {
  return FILTERS.some((f) => f.value === value);
}

export function OrdersPage() {
  const gateway = getAdminGateway();
  const router = useRouter();
  const params = useSearchParams();
  const resource = useResource("admin:orders", () => gateway.listOrders());
  const filterParam = params.get("filtro");
  const filter: Filter = isFilter(filterParam) ? filterParam : "todos";
  const [query, setQuery] = useState("");

  const orders = useMemo(() => resource.data ?? [], [resource.data]);
  const attention = orders.filter(requiresAttention);
  const filtered = useMemo(() => {
    const test = FILTERS.find((f) => f.value === filter)?.test ?? (() => true);
    const q = query.trim().toLowerCase();
    return orders.filter(
      (o) => test(o) && (!q || [o.reference, o.customer.name, o.customer.email].some((field) => field.toLowerCase().includes(q))),
    );
  }, [orders, filter, query]);

  function setFilter(value: Filter) {
    router.replace(value === "todos" ? "/admin/pedidos" : `/admin/pedidos?filtro=${value}`, { scroll: false });
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Tentativas de compra com o status do pagamento na Whop e da criação do pedido na Shopify."
        badges={orders.some((order) => order.isDemo) ? <DemoBadge>Dados de demonstração</DemoBadge> : undefined}
      />

      {resource.status === "loading" ? (
        <AdminPageSkeleton cards={1} />
      ) : resource.status === "error" ? (
        <AdminLoadError message={resource.error.message} onRetry={resource.reload} />
      ) : (
        <div className="space-y-5">
          {attention.length ? (
            <Callout
              tone="warning"
              title={`Pagamento confirmado, pedido ainda não criado (${attention.length})`}
              action={
                filter !== "atencao" ? (
                  <Button size="sm" variant="secondary" onClick={() => setFilter("atencao")}>
                    Mostrar só esses pedidos
                  </Button>
                ) : null
              }
            >
              O comprador já pagou, mas o pedido não existe na Shopify. Verifique o erro no detalhe de cada pedido para não atrasar o envio.
            </Callout>
          ) : null}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SegmentedControl
              label="Filtrar pedidos"
              hideLabel
              size="sm"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({
                value: f.value,
                label: (
                  <span>
                    {f.label} <span className="text-ink-muted tabular-nums">{orders.filter(f.test).length}</span>
                  </span>
                ),
              }))}
            />
            <div className="relative lg:w-72">
              <label htmlFor="orders-search" className="sr-only">
                Buscar pedidos
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                id="orders-search"
                type="search"
                placeholder="Buscar por pedido, nome ou e-mail"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-control)] border border-line-strong bg-surface pr-3 pl-9 text-base outline-none focus:border-focus sm:text-sm"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            {filtered.length ? (
              <OrdersList orders={filtered} />
            ) : (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-ink">{orders.length ? "Nenhum pedido encontrado" : "Nenhum pedido ainda"}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {orders.length
                    ? "Ajuste o filtro ou a busca."
                    : "As tentativas de compra aparecem aqui quando o checkout real estiver ativo."}
                </p>
              </div>
            )}
          </Card>
          <p className="text-[13px] text-ink-muted" aria-live="polite">
            {filtered.length} de {orders.length} pedidos
          </p>
        </div>
      )}
    </>
  );
}
