"use client";

import { RefreshCw } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { KeyValue, KeyValueList } from "@/components/admin/key-value";
import { OrderTimeline } from "@/components/admin/order-timeline";
import { PageHeader } from "@/components/admin/page-header";
import { PaymentBadge, SyncBadge } from "@/components/admin/status";
import { ProductThumb } from "@/components/checkout/line-item";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo";
import { getAdminGateway } from "@/data";
import { formatDateTime, formatPhone, formatPostalCode } from "@/domain/format";
import { formatMoney } from "@/domain/money";
import { requiresAttention } from "@/domain/operation";
import type { Order } from "@/domain/types";
import { useResource } from "@/lib/use-resource";

function AmountRow({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "success" | "muted" }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className={strong ? "font-semibold text-ink" : "text-ink-soft"}>{label}</dt>
      <dd
        className={
          strong ? "text-lg font-semibold text-ink tabular-nums" : tone === "success" ? "text-success tabular-nums" : tone === "muted" ? "text-ink-muted" : "text-ink tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  const attention = requiresAttention(order);
  const paid = order.payment.status === "paid" || order.payment.status === "refunded";
  const { amounts } = order;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/pedidos", label: "Pedidos" }}
        title={order.reference}
        badges={
          <>
            <PaymentBadge status={order.payment.status} />
            <SyncBadge status={order.shopify.status} paid={paid} />
            {order.isDemo ? <DemoBadge /> : null}
          </>
        }
        description={`Criado em ${formatDateTime(order.createdAt)} · ${order.payment.environment === "production" ? "Produção" : "Sandbox"}`}
      />

      {attention ? (
        <Callout
          tone="warning"
          role="status"
          className="mb-6"
          title="Pagamento confirmado, pedido ainda não criado na Shopify"
          action={
            <>
              <Button size="sm" variant="secondary" disabled>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Tentar criar pedido novamente
              </Button>
              <span className="self-center text-[13px] text-ink-muted">Disponível com a integração Shopify.</span>
            </>
          }
        >
          <p>
            {order.shopify.status === "failed"
              ? `As tentativas automáticas falharam (${order.shopify.attempts}). É preciso agir para não atrasar o envio.`
              : `A criação está em andamento (tentativa ${order.shopify.attempts}). Se não concluir em alguns minutos, verifique o erro.`}
          </p>
          {order.shopify.lastError ? (
            <p className="mt-1">
              Último erro: <span className="font-medium text-ink">{order.shopify.lastError}</span>
            </p>
          ) : null}
        </Callout>
      ) : null}

      {order.payment.status === "failed" && order.payment.failureMessage ? (
        <Callout tone="danger" className="mb-6" title="Pagamento recusado">
          {order.payment.failureMessage}
        </Callout>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Itens e valores" />
            <CardBody>
              <ul className="space-y-4">
                {order.lines.map((line, index) => (
                  <li key={`${line.sku}-${index}`} className="flex items-center gap-3.5">
                    <ProductThumb src={line.image?.url} alt={line.image?.altText ?? line.title} quantity={line.quantity} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{line.title}</p>
                      <p className="text-[13px] text-ink-muted">
                        {line.variantTitle}
                        {line.sku ? ` · SKU ${line.sku}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-ink tabular-nums">{formatMoney(line.lineTotal)}</p>
                      <p className="text-xs text-ink-muted tabular-nums">
                        {line.quantity} × {formatMoney(line.unitPrice)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 border-t border-line pt-4">
                <AmountRow label="Subtotal" value={formatMoney(amounts.subtotal)} />
                {amounts.discount.amount > 0 ? (
                  <AmountRow label={`Desconto${order.discountCodes.length ? ` (${order.discountCodes.join(", ")})` : ""}`} value={`−${formatMoney(amounts.discount)}`} tone="success" />
                ) : null}
                <AmountRow label={`Frete · ${order.shippingTitle}`} value={amounts.shipping.amount === 0 ? "Grátis" : formatMoney(amounts.shipping)} />
                {amounts.taxes ? (
                  <AmountRow
                    label={amounts.taxes.title}
                    value={amounts.taxes.amount ? formatMoney(amounts.taxes.amount) : amounts.taxes.included ? "Inclusos no preço" : "—"}
                    tone="muted"
                  />
                ) : null}
                <div className="mt-2 border-t border-line pt-2">
                  <AmountRow label="Total" value={formatMoney(amounts.total)} strong />
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Linha do tempo" description="Eventos do checkout, da Whop e da Shopify, do mais recente ao mais antigo." />
            <CardBody>
              <OrderTimeline events={order.timeline} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="IDs de referência" as="h2" />
            <CardBody className="pt-2">
              <KeyValueList>
                <KeyValue label="Pedido interno" value={order.id} mono copy={order.id} />
                <KeyValue label="Carrinho" value={order.cartId} mono copy={order.cartId} />
                <KeyValue label="Tentativa" value={order.payment.attemptId} mono copy={order.payment.attemptId} />
                <KeyValue label="Sessão Whop" value={order.payment.whopSessionId} mono copy={order.payment.whopSessionId} />
                <KeyValue label="Pagamento Whop" value={order.payment.whopPaymentId} mono copy={order.payment.whopPaymentId} />
                <KeyValue label="Pedido Shopify" value={order.shopify.orderName} mono copy={order.shopify.orderId} empty="Não criado" />
              </KeyValueList>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cliente" as="h2" />
            <CardBody className="space-y-4 pt-3 text-sm">
              <div>
                <p className="font-medium text-ink">{order.customer.name}</p>
                <p className="break-words text-ink-soft">{order.customer.email}</p>
                {order.customer.phone ? <p className="text-ink-soft">{formatPhone(order.customer.phone)}</p> : null}
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">Entrega</p>
                <p className="mt-1 text-ink-soft">
                  {order.shippingAddress.street}, {order.shippingAddress.number}
                  {order.shippingAddress.complement ? ` · ${order.shippingAddress.complement}` : ""}
                  <br />
                  {order.shippingAddress.neighborhood} · {order.shippingAddress.city}/{order.shippingAddress.state}
                  <br />
                  CEP {formatPostalCode(order.shippingAddress.postalCode)}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const gateway = getAdminGateway();
  const resource = useResource(`admin:order:${orderId}`, () => gateway.getOrder(orderId));

  if (resource.status === "loading") return <AdminPageSkeleton cards={2} />;
  if (resource.status === "error") return <AdminLoadError message={resource.error.message} onRetry={resource.reload} />;
  if (!resource.data) {
    return (
      <>
        <PageHeader back={{ href: "/admin/pedidos", label: "Pedidos" }} title="Pedido não encontrado" />
        <Callout tone="neutral">Confira o link ou volte à lista de pedidos.</Callout>
      </>
    );
  }
  return <OrderDetail order={resource.data} />;
}
