"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { ImageUp, Monitor, Smartphone, Trash2 } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { CheckoutPreview } from "@/components/admin/checkout-preview";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { FieldShell, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getAdminGateway, toGatewayError } from "@/data";
import { contrastRatio, isHexColor, readableForeground } from "@/domain/color";
import type { AppearanceSettings } from "@/domain/types";
import { useResource } from "@/lib/use-resource";

const MAX_LOGO_BYTES = 300 * 1024;
const SUPPORT_TEXT_LIMIT = 140;

function AppearanceForm({ initial, onSaved }: { initial: AppearanceSettings; onSaved: (next: AppearanceSettings) => void }) {
  const gateway = getAdminGateway();
  const [draft, setDraft] = useState(initial);
  const [hexInput, setHexInput] = useState(initial.primaryColor);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const nameError = draft.storeName.trim() ? serverErrors.storeName : "Informe o nome da loja.";
  const colorError = isHexColor(hexInput) ? serverErrors.primaryColor : "Use o formato hexadecimal, como #1f4d3a.";
  const contrast = contrastRatio(draft.primaryColor, readableForeground(draft.primaryColor));
  const contrastOk = contrast >= 4.5;

  function update<K extends keyof AppearanceSettings>(field: K, value: AppearanceSettings[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setStatus(null);
    setServerErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  }

  function handleHex(value: string) {
    const normalized = value.startsWith("#") ? value : `#${value}`;
    setHexInput(normalized);
    if (isHexColor(normalized)) update("primaryColor", normalized.toLowerCase());
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/svg+xml", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Use PNG, SVG, JPG ou WebP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("O arquivo deve ter até 300 KB.");
      return;
    }
    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => update("logoUrl", String(reader.result));
    reader.onerror = () => setLogoError("Não foi possível ler o arquivo.");
    reader.readAsDataURL(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (nameError || colorError) return;
    setSaving(true);
    setStatus(null);
    try {
      const next = await gateway.saveAppearance({ ...draft, storeName: draft.storeName.trim(), supportText: draft.supportText.trim() });
      onSaved(next);
      setStatus("Aparência salva no servidor. Ela vale para qualquer navegador em que você entrar.");
    } catch (error) {
      const failure = toGatewayError(error);
      setServerErrors(failure.fieldErrors ?? {});
      setStatus(failure.message);
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft(initial);
    setHexInput(initial.primaryColor);
    setLogoError(null);
    setStatus(null);
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <form onSubmit={submit} noValidate>
          <CardHeader title="Identidade do checkout" description="Estas informações aparecem para o comprador em todas as etapas." />
          <CardBody className="space-y-6">
            <TextField
              label="Nome da loja"
              value={draft.storeName}
              onChange={(e) => update("storeName", e.target.value)}
              error={nameError}
              maxLength={60}
              required
            />

            <FieldShell id="logo-upload" label="Logotipo" optional error={logoError ?? serverErrors.logoUrl} hint="PNG, SVG, JPG ou WebP com até 300 KB. Fundo transparente funciona melhor.">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-36 items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-dashed border-line-strong bg-muted/50 px-2">
                  {draft.logoUrl ? (
                    <span className="relative block h-10 w-full">
                      <Image src={draft.logoUrl} alt="Logotipo atual" fill unoptimized className="object-contain" />
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">Sem logotipo</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleLogo}
                />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <ImageUp className="size-4" aria-hidden="true" />
                  {draft.logoUrl ? "Trocar" : "Enviar arquivo"}
                </Button>
                {draft.logoUrl ? (
                  <Button variant="ghost" size="sm" onClick={() => update("logoUrl", null)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remover
                  </Button>
                ) : null}
              </div>
            </FieldShell>

            <FieldShell
              id="primary-color"
              label="Cor principal"
              error={colorError}
              hint={
                contrastOk
                  ? `Contraste do texto no botão: ${contrast.toFixed(1)}:1 (adequado).`
                  : `Contraste do texto no botão: ${contrast.toFixed(1)}:1. Escolha uma cor mais escura ou mais clara para facilitar a leitura.`
              }
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Selecionar cor principal"
                  value={draft.primaryColor}
                  onChange={(e) => {
                    setHexInput(e.target.value);
                    update("primaryColor", e.target.value);
                  }}
                  className="h-12 w-14 shrink-0 cursor-pointer rounded-[var(--radius-control)] border border-line-strong bg-surface p-1"
                />
                <input
                  id="primary-color"
                  value={hexInput}
                  onChange={(e) => handleHex(e.target.value.trim())}
                  aria-invalid={colorError ? true : undefined}
                  aria-describedby={colorError ? "primary-color-error" : "primary-color-hint"}
                  spellCheck={false}
                  autoComplete="off"
                  maxLength={7}
                  className="h-12 w-36 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 font-mono text-[15px] uppercase outline-none focus:border-focus"
                />
                <span
                  className="flex h-9 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium"
                  style={{ background: draft.primaryColor, color: readableForeground(draft.primaryColor) }}
                  aria-hidden="true"
                >
                  Botão
                </span>
              </div>
            </FieldShell>

            <div>
              <label htmlFor="support-text" className="text-sm font-medium text-ink">
                Texto de suporte
              </label>
              <textarea
                id="support-text"
                rows={3}
                maxLength={SUPPORT_TEXT_LIMIT}
                value={draft.supportText}
                onChange={(e) => update("supportText", e.target.value)}
                aria-describedby="support-text-hint"
                className="mt-1.5 block w-full resize-y rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 py-3 text-base outline-none focus:border-focus sm:text-[15px]"
              />
              <p id="support-text-hint" className="mt-1.5 flex justify-between gap-3 text-sm text-ink-muted">
                <span>Exibido no rodapé do checkout. Ex.: canal de atendimento.</span>
                <span className="tabular-nums">
                  {draft.supportText.length}/{SUPPORT_TEXT_LIMIT}
                </span>
              </p>
            </div>

            <p className="text-sm text-ink-muted" aria-live="polite">
              {status}
            </p>
          </CardBody>
          <CardFooter>
            <Button variant="ghost" onClick={discard} disabled={!dirty || saving}>
              Descartar
            </Button>
            <Button type="submit" variant="primary" loading={saving} loadingLabel="Salvando…" disabled={!dirty || Boolean(nameError || colorError)}>
              Salvar aparência
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="xl:sticky xl:top-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Prévia</h2>
          <SegmentedControl
            label="Dispositivo da prévia"
            hideLabel
            size="sm"
            value={device}
            onChange={setDevice}
            options={[
              {
                value: "mobile",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="size-3.5" aria-hidden="true" /> Celular
                  </span>
                ),
              },
              {
                value: "desktop",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Monitor className="size-3.5" aria-hidden="true" /> Desktop
                  </span>
                ),
              },
            ]}
          />
        </div>
        <CheckoutPreview appearance={draft} device={device} />
      </div>
    </div>
  );
}

export function AppearancePage() {
  const gateway = getAdminGateway();
  const resource = useResource("admin:appearance", () => gateway.getAppearance());

  return (
    <>
      <PageHeader title="Aparência" description="Ajuste como o checkout apresenta a sua marca. A prévia é atualizada enquanto você edita." />
      {resource.status === "loading" ? (
        <AdminPageSkeleton />
      ) : resource.status === "error" ? (
        <AdminLoadError message={resource.error.message} onRetry={resource.reload} />
      ) : (
        <AppearanceForm initial={resource.data} onSaved={resource.setData} />
      )}
    </>
  );
}
