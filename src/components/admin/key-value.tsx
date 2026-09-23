import type { ReactNode } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/cn";

export function KeyValueList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-line", className)}>{children}</dl>;
}

export function KeyValue({
  label,
  value,
  mono,
  copy,
  empty = "—",
}: {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  /** Valor textual para copiar. */
  copy?: string;
  empty?: string;
}) {
  const hasValue = value !== undefined && value !== null && value !== "";
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 text-right text-sm text-ink">
        <span className={cn("min-w-0 truncate", mono && "font-mono text-[13px]", !hasValue && "text-ink-muted")}>{hasValue ? value : empty}</span>
        {copy && hasValue ? <CopyButton value={copy} label={label} className="size-7" /> : null}
      </dd>
    </div>
  );
}
