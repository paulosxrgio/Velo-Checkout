import { Skeleton, Spinner } from "@/components/ui/spinner";

export function EmbedSkeleton() {
  return (
    <div className="space-y-3 rounded-[var(--radius-control)] border border-line p-4" role="status">
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <Spinner className="size-3.5" /> Carregando pagamento seguro…
      </p>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-2/3" />
    </div>
  );
}
