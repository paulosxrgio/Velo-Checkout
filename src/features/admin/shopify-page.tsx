"use client";

import { useState } from "react";
import { ExternalLink, KeyRound, ShieldCheck, Store } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { KeyValue, KeyValueList } from "@/components/admin/key-value";
import { PageHeader } from "@/components/admin/page-header";
import { shopifyConnectionMeta, StatusBadge } from "@/components/admin/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/demo";
import { TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { getAdminGateway } from "@/data";
import { formatDate } from "@/domain/format";
import type { ShopifyConnection, ShopifyConnectionStatus } from "@/domain/types";
import { isValidMyshopifyDomain } from "@/domain/validation";
import { useResource } from "@/lib/use-resource";

/** Permissões previstas. A lista final é exibida pela própria Shopify na tela de autorização. */
const SCOPES = [
  { scope: "read_products", title: "Produtos e variantes", purpose: "Validar no servidor títulos, variantes, preços e imagens recebidos do carrinho.", required: true },
  { scope: "read_inventory", title: "Estoque", purpose: "Conferir a disponibilidade dos itens antes de cobrar.", required: true },
  { scope: "read_orders", title: "Leitura de pedidos", purpose: "Consultar pedidos criados pelo checkout e evitar duplicidade.", required: true },
  { scope: "write_orders", title: "Criação de pedidos", purpose: "Criar o pedido na Shopify depois que o pagamento for confirmado.", required: true },
  {
    scope: "write_draft_orders",
    title: "Pedidos em rascunho",
    purpose: "Opcional: calcular frete, descontos e impostos com as regras da própria loja, se essa abordagem for adotada.",
    required: false,
  },
];

const EXAMPLE_CONNECTION: Record<ShopifyConnectionStatus, ShopifyConnection> = {
  disconnected: { status: "disconnected", shopDomain: null, grantedScopes: [] },
  connecting: { status: "connecting", shopDomain: "loja-exemplo.myshopify.com", grantedScopes: [] },
  connected: {
    status: "connected",
    shopDomain: "loja-exemplo.myshopify.com",
    shopName: "Loja de exemplo",
    installedAt: "2026-09-01T12:00:00.000Z",
    grantedScopes: SCOPES.filter((s) => s.required).map((s) => s.scope),
  },
  error: {
    status: "error",
    shopDomain: "loja-exemplo.myshopify.com",
    grantedScopes: [],
    error: { message: "A autorização foi cancelada na Shopify antes de ser concluída.", occurredAt: "2026-09-01T12:00:00.000Z" },
  },
};

function ConnectionBody({ connection, preview }: { connection: ShopifyConnection; preview: boolean }) {
  const [domain, setDomain] = useState("");
  const [touched, setTouched] = useState(false);
  const domainError = touched && domain && !isValidMyshopifyDomain(domain) ? "Use o domínio original da loja, terminado em .myshopify.com." : undefined;

  switch (connection.status) {
    case "connecting":
      return (
        <CardBody>
          <div className="flex items-start gap-3 rounded-[var(--radius-control)] border border-info-line bg-info-soft p-4" role="status">
            <Spinner className="mt-0.5 size-5 text-info" />
            <div className="text-sm">
              <p className="font-medium text-ink">Aguardando autorização na Shopify</p>
              <p className="mt-0.5 text-ink-soft">
                Conclua a instalação na página da Shopify para <span className="font-medium">{connection.shopDomain}</span>. Esta tela é
                atualizada quando a autorização for recebida pelo servidor.
              </p>
            </div>
          </div>
        </CardBody>
      );
    case "connected":
      return (
        <CardBody>
          <KeyValueList>
            <KeyValue label="Loja" value={connection.shopName} />
            <KeyValue label="Domínio" value={connection.shopDomain} mono />
            <KeyValue label="Instalado em" value={connection.installedAt ? formatDate(connection.installedAt) : undefined} />
            <KeyValue label="Permissões concedidas" value={`${connection.grantedScopes.length} de ${SCOPES.filter((s) => s.required).length} obrigatórias`} />
          </KeyValueList>
        </CardBody>
      );
    case "error":
      return (
        <CardBody>
          <Callout tone="danger" title="A conexão não foi concluída">
            {connection.error?.message} Nenhum dado da loja foi acessado. Tente conectar novamente.
          </Callout>
        </CardBody>
      );
    default:
      return (
        <CardBody className="space-y-4">
          <TextField
            label="Domínio da loja"
            placeholder="minha-loja.myshopify.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value.trim().toLowerCase())}
            onBlur={() => setTouched(true)}
            error={domainError}
            hint="É o domínio original da loja, terminado em .myshopify.com — não o domínio personalizado."
            autoComplete="off"
            spellCheck={false}
            disabled={preview}
          />
          <p className="flex items-start gap-2 text-[13px] text-ink-muted">
            <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Você nunca precisará colar tokens ou senhas aqui. A autorização acontece na própria Shopify e as credenciais ficam somente no servidor.
          </p>
        </CardBody>
      );
  }
}

export function ShopifyPage() {
  const gateway = getAdminGateway();
  const resource = useResource("admin:shopify", () => gateway.getShopifyConnection());
  const [previewState, setPreviewState] = useState<ShopifyConnectionStatus | "real">("real");

  if (resource.status === "loading") return <AdminPageSkeleton />;
  if (resource.status === "error") return <AdminLoadError message={resource.error.message} onRetry={resource.reload} />;

  const preview = previewState !== "real";
  const connection = preview ? EXAMPLE_CONNECTION[previewState] : resource.data;

  return (
    <>
      <PageHeader
        title="Shopify"
        description="Conecte a loja para que o checkout valide produtos e preços no servidor e crie pedidos após o pagamento confirmado."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <Store className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Conexão da loja"
            description={preview ? "Exemplo ilustrativo do estado selecionado." : "Estado atual da conexão."}
            action={<StatusBadge meta={shopifyConnectionMeta[connection.status]} />}
          />
          <ConnectionBody key={`${previewState}`} connection={connection} preview={preview} />
          <CardFooter className="justify-between">
            <p className="text-[13px] text-ink-muted">
              {connection.status === "connected"
                ? "Desconectar interrompe a validação de carrinhos e a criação de pedidos."
                : "Disponível na etapa de backend: o botão abrirá a tela oficial de autorização da Shopify."}
            </p>
            {connection.status === "connected" ? (
              <Button variant="danger" disabled>
                Desconectar
              </Button>
            ) : connection.status === "connecting" ? (
              <Button variant="secondary" disabled>
                Cancelar
              </Button>
            ) : (
              <Button variant="primary" disabled>
                <ExternalLink className="size-4" aria-hidden="true" />
                {connection.status === "error" ? "Tentar novamente" : "Conectar loja"}
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-demo-line bg-demo-soft/50 p-4">
          <SegmentedControl
            label="Visualizar estados da conexão"
            value={previewState}
            onChange={setPreviewState}
            size="sm"
            options={[
              { value: "real", label: "Atual" },
              { value: "disconnected", label: "Desconectado" },
              { value: "connecting", label: "Conectando" },
              { value: "connected", label: "Conectado" },
              { value: "error", label: "Erro" },
            ]}
          />
          <DemoBadge>Apenas visualização</DemoBadge>
        </div>

        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <ShieldCheck className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Permissões necessárias"
            description="O que o app pedirá à loja e por quê. A Shopify exibirá a lista exata na tela de autorização."
          />
          <CardBody>
            <ul className="divide-y divide-line">
              {SCOPES.map((scope) => (
                <li key={scope.scope} className="flex flex-col gap-1.5 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
                  <code className="w-44 shrink-0 font-mono text-[13px] text-ink">{scope.scope}</code>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {scope.title}
                      {!scope.required ? <Badge size="sm">Opcional</Badge> : null}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-muted">{scope.purpose}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Callout tone="info" title="Dados protegidos de clientes" className="mt-5">
              Pedidos incluem nome, e-mail, telefone e endereço do comprador. Fora de lojas de desenvolvimento, a Shopify oculta esses campos até que o
              app atenda aos requisitos de dados protegidos de clientes e seja aprovado.
            </Callout>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
