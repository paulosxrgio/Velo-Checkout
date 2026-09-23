import Image from "next/image";
import { Lock } from "lucide-react";
import type { AppearanceSettings, StorefrontInfo } from "@/domain/types";
import { cn } from "@/lib/cn";

export function StoreLogo({ appearance, className }: { appearance: AppearanceSettings; className?: string }) {
  if (appearance.logoUrl) {
    return (
      <span className={cn("relative block h-9 w-32", className)}>
        <Image src={appearance.logoUrl} alt={appearance.storeName} fill unoptimized className="object-contain object-left" />
      </span>
    );
  }
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-brand text-[15px] font-semibold text-brand-fg"
      >
        {appearance.storeName.trim().charAt(0).toUpperCase() || "L"}
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.015em] text-ink">{appearance.storeName}</span>
    </span>
  );
}

export function CheckoutHeader({ storefront }: { storefront: StorefrontInfo }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href={storefront.storeUrl} className="min-w-0 rounded-md" aria-label={`Voltar para a loja ${storefront.appearance.storeName}`}>
          <StoreLogo appearance={storefront.appearance} />
        </a>
        <p className="flex shrink-0 items-center gap-1.5 text-sm text-ink-muted">
          <Lock className="size-4" aria-hidden="true" />
          <span>
            Checkout seguro
          </span>
        </p>
      </div>
    </header>
  );
}

export function CheckoutFooter({ storefront }: { storefront: StorefrontInfo }) {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-muted sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-1.5">
          {storefront.appearance.supportText ? <p className="text-ink-soft">{storefront.appearance.supportText}</p> : null}
          <p>Pagamentos processados pela Whop. Esta loja não recebe nem armazena os dados do seu cartão.</p>
        </div>
        <nav aria-label="Políticas da loja">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {storefront.policies.map((policy) => (
              <li key={policy.url}>
                <a href={policy.url} className="underline-offset-4 hover:text-ink hover:underline">
                  {policy.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
