"use client";

import { useState } from "react";
import { CreditCard, Plug, Webhook } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { KeyValue, KeyValueList } from "@/components/admin/key-value";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, webhookStatusMeta, whopConnectionMeta } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getAdminGateway, toGatewayError } from "@/data";
import type { PaymentEnvironment } from "@/domain/types";
import { useResource } from "@/lib/use-resource";

const FLOW = [
  { title: "Sessão criada no servidor", body: "Com o total validado, o servidor cria a sessão de checkout na Whop." },
  { title: "Comprador paga na Whop", body: "O formulário seguro da Whop aparece incorporado no checkout." },
  { title: "Webhook confirma", body: "O pagamento só é considerado aprovado quando o evento da Whop é validado no servidor." },
  { title: "Pedido na Shopify", body: "Após a confirmação, o pedido é criado na loja." },
];

export function WhopPage() {
  const gateway = getAdminGateway();
  const connection = useResource("admin:whop", () => gateway.getWhopConnection());
  const settings = useResource("admin:settings", () => gateway.getSettings());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (connection.status === "loading" || settings.status === "loading") return <AdminPageSkeleton cards={3} />;
  if (connection.status === "error") return <AdminLoadError message={connection.error.message} onRetry={connection.reload} />;
  if (settings.status === "error") return <AdminLoadError message={settings.error.message} onRetry={settings.reload} />;

  const whop = connection.data;
  const connected = whop.status === "connected";

  async function changeEnvironment(environment: PaymentEnvironment) {
    if (!settings.data) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const next = await gateway.saveSettings({ ...settings.data, environment });
      settings.setData(next);
      connection.setData({ ...whop, environment: next.environment });
      setSaved(true);
    } catch (error) {
      const failure = toGatewayError(error);
      setSaveError(failure.fieldErrors?.environment ?? failure.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Whop" description="Conta que processa os pagamentos do checkout e envia a confirmação de cada compra." />

      <div className="space-y-6">
        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <CreditCard className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Conexão da conta"
            action={<StatusBadge meta={whopConnectionMeta[whop.status]} />}
          />
          <CardBody className="space-y-5">
            {whop.status === "integration_pending" ? (
              <Callout tone="warning" title="Integração pendente">
                A forma de autenticação com a Whop será definida na etapa de backend. Até lá, nenhuma conta é conectada e nenhum pagamento é
                processado por este painel.
              </Callout>
            ) : null}
            <KeyValueList>
              <KeyValue label="Conta conectada" value={whop.account?.name} empty="Nenhuma" />
              <KeyValue label="ID da conta" value={whop.account?.id} mono copy={whop.account?.id} empty="—" />
              <KeyValue label="Ambiente" value={whop.environment === "production" ? "Produção" : "Sandbox"} />
            </KeyValueList>
          </CardBody>
          <CardFooter className="justify-between">
            <p className="text-[13px] text-ink-muted">A ação será habilitada quando a autenticação estiver implementada.</p>
            <Button variant="primary" disabled>
              <Plug className="size-4" aria-hidden="true" />
              Conectar conta Whop
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader title="Modo de operação" description="Define onde as sessões de pagamento serão criadas." />
          <CardBody className="space-y-4">
            <SegmentedControl
              label="Ambiente"
              hideLabel
              value={whop.environment}
              onChange={(value) => void changeEnvironment(value)}
              options={[
                { value: "sandbox", label: "Sandbox (testes)" },
                { value: "production", label: "Produção", disabled: !connected },
              ]}
            />
            <p className="text-sm text-ink-muted" aria-live="polite">
              {saving ? "Salvando…" : saveError ? saveError : saved ? "Preferência salva no servidor." : null}
            </p>
            <ul className="space-y-1.5 text-sm text-ink-soft">
              <li>
                <strong className="font-medium text-ink">Sandbox:</strong> simula pagamentos sem movimentar dinheiro. Apple Pay e Google Pay não aparecem
                no sandbox.
              </li>
              <li>
                <strong className="font-medium text-ink">Produção:</strong> cobranças reais. Liberado somente com a conta conectada e o teste em sandbox
                concluído.
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <Webhook className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Webhook de pagamentos"
            description="Canal pelo qual a Whop avisa o servidor sobre pagamentos aprovados, recusados e reembolsados."
            action={<StatusBadge meta={webhookStatusMeta[whop.webhook.status]} />}
          />
          <CardBody>
            <KeyValueList>
              <KeyValue label="URL do endpoint" value={whop.webhook.endpointUrl} mono copy={whop.webhook.endpointUrl ?? undefined} empty="Gerada na etapa de backend" />
              <KeyValue label="Último evento" value={whop.webhook.lastEventAt} empty="Nenhum evento recebido" />
            </KeyValueList>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Como o pagamento é confirmado" />
          <CardBody>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FLOW.map((step, index) => (
                <li key={step.title} className="rounded-[var(--radius-control)] border border-line bg-muted/40 p-4">
                  <span className="text-xs font-semibold text-accent">Passo {index + 1}</span>
                  <p className="mt-1 text-sm font-medium text-ink">{step.title}</p>
                  <p className="mt-1 text-[13px] text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
