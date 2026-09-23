import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Skeleton } from "@/components/ui/spinner";

export function AdminPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div role="status" aria-label="Carregando">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 space-y-5">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export function AdminLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Callout
      tone="danger"
      role="alert"
      title="Não foi possível carregar esta página"
      action={
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      }
    >
      {message}
    </Callout>
  );
}
