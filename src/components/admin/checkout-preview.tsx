import { Lock } from "lucide-react";
import { BrandTheme } from "@/components/checkout/brand-theme";
import { StoreLogo } from "@/components/checkout/store-chrome";
import type { AppearanceSettings } from "@/domain/types";
import { cn } from "@/lib/cn";

function FakeField({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <div className={cn("space-y-1", wide && "col-span-2")}>
      <div className="text-[10px] font-medium text-ink">{label}</div>
      <div className="h-7 rounded-md border border-line-strong bg-surface" />
    </div>
  );
}

function PreviewSummary() {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="text-[11px] font-semibold text-ink">Resumo do pedido</div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="size-8 shrink-0 rounded-md bg-[#efe7da]" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-medium text-ink">Produto de exemplo</div>
          <div className="text-[9px] text-ink-muted">Variante · 1 un.</div>
        </div>
        <div className="text-[10px] text-ink">R$ 189,90</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-2">
        <span className="text-[10px] font-semibold text-ink">Total</span>
        <span className="text-[13px] font-semibold text-ink">R$ 214,80</span>
      </div>
    </div>
  );
}

/**
 * Prévia estática do checkout com a aparência configurada.
 * Não é interativa e usa dados fictícios.
 */
export function CheckoutPreview({ appearance, device }: { appearance: AppearanceSettings; device: "mobile" | "desktop" }) {
  const mobile = device === "mobile";
  return (
    <figure className="m-0">
      <div
        aria-hidden="true"
        className={cn(
          "mx-auto overflow-hidden border border-line-strong bg-canvas shadow-[var(--shadow-raised)] select-none",
          mobile ? "w-[280px] rounded-[26px] border-[6px] border-ink/85" : "w-full rounded-xl",
        )}
      >
        <BrandTheme color={appearance.primaryColor}>
          <div className="flex h-11 items-center justify-between border-b border-line bg-surface px-3">
            <StoreLogo appearance={appearance} className="origin-left scale-[0.8]" />
            <span className="flex items-center gap-1 text-[9px] text-ink-muted">
              <Lock className="size-2.5" /> Checkout seguro
            </span>
          </div>
          <div className={cn("gap-3 p-3", mobile ? "space-y-3" : "grid grid-cols-[1fr_170px]")}>
            {mobile ? <PreviewSummary /> : null}
            <div className="space-y-3">
              <div className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full border-2 border-brand text-[8px] font-semibold text-brand">1</span>
                  <span className="text-[11px] font-semibold text-ink">Seus dados</span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <FakeField label="E-mail" wide />
                  <FakeField label="Celular" />
                  <FakeField label="CPF" />
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[8px] text-ink-muted">3</span>
                  <span className="text-[11px] font-semibold text-ink">Pagamento</span>
                </div>
                <div className="mt-2.5 flex h-8 items-center justify-center rounded-md bg-brand text-[10px] font-medium text-brand-fg">
                  Ir para o pagamento
                </div>
              </div>
            </div>
            {!mobile ? <PreviewSummary /> : null}
          </div>
          {appearance.supportText ? (
            <p className="border-t border-line px-3 py-2.5 text-[9px] leading-snug text-ink-muted">{appearance.supportText}</p>
          ) : null}
        </BrandTheme>
      </div>
      <figcaption className="mt-3 text-center text-xs text-ink-muted">
        Prévia ilustrativa com dados fictícios · {mobile ? "celular" : "desktop"}
      </figcaption>
    </figure>
  );
}
