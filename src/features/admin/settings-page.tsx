"use client";

import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { ActivationChecklist } from "@/components/admin/activation-checklist";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getAdminGateway, toGatewayError } from "@/data";
import { buildActivationChecklist, canActivate } from "@/domain/operation";
import type { OperationSettings, OperationSnapshot } from "@/domain/types";
import { SUPPORTED_TIMEZONES, isHttpsUrl, isValidEmail } from "@/domain/validation";
import { useResource } from "@/lib/use-resource";



function SettingsForm({ snapshot, onSaved }: { snapshot: OperationSnapshot; onSaved: (settings: OperationSettings) => void }) {
  const gateway = getAdminGateway();
  const [draft, setDraft] = useState(snapshot.settings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors = {
    operationName: draft.operationName.trim() ? serverErrors.operationName : "Informe um nome para a operação.",
    alertEmail: isValidEmail(draft.alertEmail) ? serverErrors.alertEmail : "Informe um e-mail válido para alertas.",
    storeUrl: isHttpsUrl(draft.storeUrl.trim()) ? serverErrors.storeUrl : "Use o endereço completo com https://.",
  };
  const invalid = Object.values(errors).some(Boolean);
  const dirty = JSON.stringify(draft) !== JSON.stringify(snapshot.settings);
  const integrationsConnected = snapshot.shopify.status === "connected" && snapshot.whop.status === "connected";

  function update<K extends keyof OperationSettings>(field: K, value: OperationSettings[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatus(null);
    setServerErrors({});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (invalid) return;
    setSaving(true);
    try {
      const next = await gateway.saveSettings({ ...draft, operationName: draft.operationName.trim(), storeUrl: draft.storeUrl.trim().replace(/\/$/, "") });
      onSaved(next);
      setDraft(next);
      setStatus("Configurações salvas no servidor.");
    } catch (error) {
      const failure = toGatewayError(error);
      setServerErrors(failure.fieldErrors ?? {});
      setStatus(failure.fieldErrors?.environment ?? failure.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Ambiente" description="Onde as sessões de pagamento serão criadas." />
        <CardBody className="space-y-3">
          <SegmentedControl
            label="Ambiente"
            hideLabel
            value={draft.environment}
            onChange={(value) => update("environment", value)}
            options={[
              { value: "sandbox", label: "Sandbox (testes)" },
              { value: "production", label: "Produção", disabled: !integrationsConnected },
            ]}
          />
          <p className="text-[13px] text-ink-muted">
            {integrationsConnected ? "Produção realiza cobranças reais." : "Produção fica disponível depois que Shopify e Whop estiverem conectadas."}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Operação" description="Informações básicas usadas no painel e nos alertas." />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Nome da operação"
            value={draft.operationName}
            onChange={(e) => update("operationName", e.target.value)}
            error={showErrors ? errors.operationName : undefined}
          />
          <TextField
            label="E-mail para alertas"
            type="email"
            inputMode="email"
            value={draft.alertEmail}
            onChange={(e) => update("alertEmail", e.target.value)}
            error={showErrors ? errors.alertEmail : undefined}
            hint="Recebe avisos como pagamento confirmado sem pedido criado."
          />
          <TextField
            label="Endereço da loja"
            type="url"
            inputMode="url"
            value={draft.storeUrl}
            onChange={(e) => update("storeUrl", e.target.value)}
            error={showErrors ? errors.storeUrl : undefined}
            hint="Usado nos links de retorno ao carrinho e às políticas."
          />
          <SelectField label="Fuso horário" value={draft.timezone} onChange={(e) => update("timezone", e.target.value)}>
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </SelectField>
          <TextField label="Moeda" value={draft.currencyCode} readOnly hint="Definida pela moeda da loja na Shopify." />
        </CardBody>
        <CardFooter className="justify-between">
          <p className="text-sm text-ink-muted" aria-live="polite">
            {status}
          </p>
          <Button type="submit" variant="primary" loading={saving} loadingLabel="Salvando…" disabled={!dirty}>
            Salvar configurações
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function SettingsPage() {
  const gateway = getAdminGateway();
  const snapshot = useResource("admin:snapshot", () => gateway.getSnapshot());

  if (snapshot.status === "loading") return <AdminPageSkeleton cards={3} />;
  if (snapshot.status === "error") return <AdminLoadError message={snapshot.error.message} onRetry={snapshot.reload} />;

  const data = snapshot.data;
  const checklist = buildActivationChecklist(data);
  const ready = canActivate(checklist);
  const pendingRequired = checklist.filter((c) => c.required && c.status !== "ok").length;

  return (
    <>
      <PageHeader title="Configurações" description="Ambiente, dados da operação e verificação final antes de ativar o checkout." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <SettingsForm snapshot={data} onSaved={(settings) => snapshot.setData({ ...data, settings })} />

        <Card className="lg:sticky lg:top-10">
          <CardHeader title="Checklist antes de ativar" description={`${pendingRequired} itens obrigatórios pendentes.`} />
          <CardBody className="pt-2">
            <ActivationChecklist items={checklist} />
          </CardBody>
          <CardFooter className="flex-col items-stretch">
            <Button variant="primary" fullWidth disabled={!ready} aria-describedby="settings-activate-reason">
              <Lock className="size-4" aria-hidden="true" />
              Ativar checkout
            </Button>
            <Callout tone="neutral" className="mt-1" id="settings-activate-reason">
              {ready
                ? "Tudo pronto para ativar."
                : "A ativação fica indisponível até que as integrações reais existam e todas as verificações obrigatórias sejam concluídas."}
            </Callout>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
