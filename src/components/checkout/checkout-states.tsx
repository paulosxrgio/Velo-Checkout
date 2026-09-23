import type { ReactNode } from "react";
import { Link2Off, ShoppingBag } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";

export function CheckoutSkeleton() {
  return (
    <div role="status" aria-label="Carregando checkout">
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <Skeleton className="h-5 w-40" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-12 sm:col-span-2" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden rounded-[var(--radius-card)] border border-line bg-surface p-6 lg:block">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mt-6 flex gap-3">
              <Skeleton className="size-16 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
          <Skeleton className="mt-8 h-8 w-full" />
        </div>
      </div>
      <span className="sr-only">Carregando seu pedido…</span>
    </div>
  );
}

function StateLayout({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink-soft shadow-[var(--shadow-card)]">
        {icon}
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-muted">{children}</div>
      {action ? <div className="mt-8 flex flex-col gap-3 sm:flex-row">{action}</div> : null}
    </div>
  );
}

export function EmptyCartState({ storeUrl }: { storeUrl: string }) {
  return (
    <StateLayout
      icon={<ShoppingBag className="size-6" aria-hidden="true" />}
      title="Seu carrinho está vazio"
      action={
        <a href={storeUrl} className={buttonStyles({ variant: "brand" })}>
          Continuar comprando
        </a>
      }
    >
      Não há itens para finalizar. Escolha seus produtos na loja e volte quando quiser concluir a compra.
    </StateLayout>
  );
}

export function CheckoutLoadError({
  title,
  message,
  cartUrl,
  onRetry,
}: {
  title: string;
  message: string;
  cartUrl?: string;
  onRetry?: () => void;
}) {
  return (
    <StateLayout
      icon={<Link2Off className="size-6" aria-hidden="true" />}
      title={title}
      action={
        <>
          {cartUrl ? (
            <a href={cartUrl} className={buttonStyles({ variant: "brand" })}>
              Voltar ao carrinho
            </a>
          ) : null}
          {onRetry ? (
            <button type="button" onClick={onRetry} className={buttonStyles({ variant: "secondary" })}>
              Tentar novamente
            </button>
          ) : null}
        </>
      }
    >
      {message}
    </StateLayout>
  );
}
