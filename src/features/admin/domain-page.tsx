"use client";

import { useState, type FormEvent } from "react";
import { Globe, LockKeyhole, Wallet } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { DnsRecordsTable } from "@/components/admin/dns-records";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, verificationMeta } from "@/components/admin/status";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { getAdminGateway, toGatewayError } from "@/data";
import type { DomainSettings, VerificationStatus } from "@/domain/types";
import { isValidCheckoutHostname } from "@/domain/validation";
import { useResource } from "@/lib/use-resource";

function HostnameForm({ domain, onSaved }: { domain: DomainSettings; onSaved: (next: DomainSettings) => void }) {
  const gateway = getAdminGateway();
  const [hostname, setHostname] = useState(domain.hostname ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = hostname.trim().toLowerCase() !== (domain.hostname ?? "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const value = hostname.trim().toLowerCase();
    if (!isValidCheckoutHostname(value)) {
      setError("Informe um subdomínio completo, como checkout.minhaloja.com.");
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      onSaved(await gateway.saveCheckoutHostname(value));
      setMessage("Subdomínio salvo neste navegador (demonstração). A verificação começará quando o backend existir.");
    } catch (e) {
      setError(toGatewayError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <CardBody className="space-y-3">
        <TextField
          label="Subdomínio do checkout"
          placeholder="checkout.minhaloja.com"
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          error={error}
          hint="Use um subdomínio do domínio da marca. A vitrine continua na Shopify; apenas o checkout usará este endereço."
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
        />
        <p className="text-sm text-ink-muted" aria-live="polite">
          {message}
        </p>
      </CardBody>
      <CardFooter>
        <Button type="submit" variant="primary" loading={saving} loadingLabel="Salvando…" disabled={!dirty}>
          Salvar subdomínio
        </Button>
      </CardFooter>
    </form>
  );
}

function VerificationRow({ title, description, status }: { title: string; description: string; status: VerificationStatus }) {
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge meta={verificationMeta[status]} size="sm" />
        <Button size="sm" variant="secondary" disabled title="Disponível quando o backend de verificação existir">
          Verificar agora
        </Button>
      </div>
    </li>
  );
}

export function DomainPage() {
  const gateway = getAdminGateway();
  const resource = useResource("admin:domain", () => gateway.getDomainSettings());

  if (resource.status === "loading") return <AdminPageSkeleton cards={3} />;
  if (resource.status === "error") return <AdminLoadError message={resource.error.message} onRetry={resource.reload} />;

  const domain = resource.data;

  return (
    <>
      <PageHeader title="Domínio" description="Endereço da marca em que o comprador verá o checkout, com HTTPS e verificação para Apple Pay." />

      <div className="space-y-6">
        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <Globe className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Endereço do checkout"
          />
          <HostnameForm domain={domain} onSaved={resource.setData} />
        </Card>

        <Card>
          <CardHeader
            title="Registros DNS"
            description="Crie estes registros no provedor de DNS do seu domínio quando os valores estiverem disponíveis."
            action={<StatusBadge meta={verificationMeta[domain.dnsStatus]} />}
          />
          <CardBody className="space-y-4">
            <Callout tone="info">
              Tipo e valor dependem da hospedagem escolhida para o checkout e serão preenchidos aqui. Não crie registros com valores provisórios.
            </Callout>
            <DnsRecordsTable records={domain.dnsRecords} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <LockKeyhole className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Verificações"
          />
          <CardBody>
            <ul className="divide-y divide-line">
              <VerificationRow
                title="DNS"
                description={domain.hostname ? `${domain.hostname} aponta para a hospedagem do checkout.` : "Defina o subdomínio primeiro."}
                status={domain.dnsStatus}
              />
              <VerificationRow title="Certificado HTTPS" description="Certificado válido emitido para o subdomínio." status={domain.httpsStatus} />
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-ink-soft">
                <Wallet className="size-4.5" aria-hidden="true" />
              </span>
            }
            title="Apple Pay no checkout incorporado"
            description="Para exibir Apple Pay no checkout incorporado, o domínio precisa ser registrado e verificado na Whop."
            action={<StatusBadge meta={verificationMeta[domain.applePay.status]} />}
          />
          <CardBody className="space-y-3 text-sm text-ink-soft">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>No painel da Whop, abra as configurações de checkout e a opção de Apple Pay para checkout incorporado.</li>
              <li>Adicione o subdomínio do checkout como domínio de pagamento.</li>
              <li>Conclua a verificação pelo método indicado pela Whop (registros DNS ou arquivo hospedado no domínio).</li>
            </ol>
            <p className="text-[13px] text-ink-muted">
              Opcional para ativar o checkout. Apple Pay não aparece no ambiente sandbox. Confirme os passos na documentação da Whop ao configurar.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
