"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, Globe, Rocket, Store, TriangleAlert } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { OrdersList } from "@/components/admin/orders-list";
import { PageHeader } from "@/components/admin/page-header";
import { SetupProgress } from "@/components/admin/setup-steps";
import { shopifyConnectionMeta, StatusBadge, verificationMeta, whopConnectionMeta } from "@/components/admin/status";
import { buttonStyles } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo";
import { getAdminGateway } from "@/data";
import { buildActivationChecklist, buildSetupSteps, requiresAttention } from "@/domain/operation";
import { useResource } from "@/lib/use-resource";

function ConnectionTile({
  href,
  icon,
  title,
  status,
  detail,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  status: ReactNode;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-line-strong"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-ink-soft">{icon}</span>
          {title}
        </span>
        <ArrowRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
      <div>{status}</div>
      <p className="text-[13px] text-ink-muted">{detail}</p>
    </Link>
  );
}

export function OverviewPage() {
  const gateway = getAdminGateway();
  const snapshot = useResource("admin:snapshot", () => gateway.getSnapshot());
  const orders = useResource("admin:orders", () => gateway.listOrders());

  if (snapshot.status === "loading") return <AdminPageSkeleton cards={3} />;
  if (snapshot.status === "error") return <AdminLoadError message={snapshot.error.message} onRetry={snapshot.reload} />;

  const data = snapshot.data;
  const steps = buildSetupSteps(data);
  const nextStep = steps.find((s) => s.state === "todo") ?? steps.find((s) => s.state !== "done");
  const checklist = buildActivationChecklist(data);
  const pendingChecks = checklist.filter((c) => c.required && c.status !== "ok");
  const attention = orders.data?.filter(requiresAttention) ?? [];
  const hasDemoOrders = orders.data?.some((order) => order.isDemo) ?? false;

  return (
    <>
      <PageHeader title="Visão geral" description="Estado das conexões, do domínio e dos pedidos recentes do checkout." />

      <div className="space-y-6">
        <Card>
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <Rocket className="size-4 text-accent" aria-hidden="true" />
                Checkout ainda não ativado
              </p>
              <div className="mt-3 max-w-md">
                <SetupProgress steps={steps} />
              </div>
              {nextStep ? (
                <p className="mt-2 text-[13px] text-ink-muted">
                  Próximo passo: <span className="font-medium text-ink-soft">{nextStep.title}</span>
                </p>
              ) : null}
            </div>
            <Link href="/admin/configuracao" className={buttonStyles({ variant: "primary" })}>
              Continuar configuração
            </Link>
          </CardBody>
        </Card>

        <section aria-labelledby="connections-title">
          <h2 id="connections-title" className="sr-only">
            Conexões
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ConnectionTile
              href="/admin/shopify"
              icon={<Store className="size-4" aria-hidden="true" />}
              title="Shopify"
              status={<StatusBadge meta={shopifyConnectionMeta[data.shopify.status]} />}
              detail={data.shopify.shopDomain ?? "Nenhuma loja conectada."}
            />
            <ConnectionTile
              href="/admin/whop"
              icon={<CreditCard className="size-4" aria-hidden="true" />}
              title="Whop"
              status={<StatusBadge meta={whopConnectionMeta[data.whop.status]} />}
              detail={`Ambiente ${data.whop.environment === "production" ? "de produção" : "sandbox"} · webhook não configurado`}
            />
            <ConnectionTile
              href="/admin/dominio"
              icon={<Globe className="size-4" aria-hidden="true" />}
              title="Domínio"
              status={
                data.domain.hostname ? (
                  <StatusBadge meta={verificationMeta[data.domain.httpsStatus]} />
                ) : (
                  <StatusBadge meta={{ label: "Não configurado", tone: "neutral" }} />
                )
              }
              detail={data.domain.hostname ?? "Defina o subdomínio do checkout."}
            />
          </div>
        </section>

        {attention.length ? (
          <Callout
            tone="warning"
            title={`${attention.length} ${attention.length === 1 ? "pedido pago ainda não foi criado" : "pedidos pagos ainda não foram criados"} na Shopify`}
            action={
              <Link href="/admin/pedidos?filtro=atencao" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Ver pedidos
              </Link>
            }
          >
            O comprador já pagou. Verifique o motivo para não atrasar o envio.
            {hasDemoOrders ? <DemoBadge className="ml-1 align-middle">Dados de demonstração</DemoBadge> : null}
          </Callout>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader
              title="Pedidos recentes"
              description="Últimas tentativas de compra no checkout."
              action={hasDemoOrders ? <DemoBadge>Dados de demonstração</DemoBadge> : undefined}
            />
            <div className="mt-4 border-t border-line">
              {orders.status === "loading" ? (
                <p className="px-6 py-8 text-sm text-ink-muted">Carregando pedidos…</p>
              ) : orders.status === "error" ? (
                <div className="p-5">
                  <AdminLoadError message={orders.error.message} onRetry={orders.reload} />
                </div>
              ) : orders.data.length === 0 ? (
                <p className="px-5 py-8 text-sm text-ink-muted sm:px-6">
                  Nenhum pedido ainda. As tentativas de compra aparecem aqui quando o checkout real estiver ativo.
                </p>
              ) : (
                <OrdersList orders={orders.data.slice(0, 5)} compact />
              )}
            </div>
            <div className="border-t border-line px-5 py-3 sm:px-6">
              <Link href="/admin/pedidos" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                Ver todos os pedidos <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Configuração pendente"
              description={`${pendingChecks.length} itens obrigatórios antes de ativar.`}
              icon={<TriangleAlert className="size-4 text-warning" aria-hidden="true" />}
            />
            <CardBody>
              <ul className="space-y-3">
                {pendingChecks.map((item) => (
                  <li key={item.id} className="text-sm">
                    {item.href ? (
                      <Link href={item.href} className="font-medium text-ink hover:underline">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{item.label}</span>
                    )}
                    <p className="text-[13px] text-ink-muted">
                      {item.status === "integration_pending" ? "Integração pendente · " : ""}
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
