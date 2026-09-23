import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ChecklistItem } from "@/domain/types";
import { ChecklistIcon } from "./status";

export function ActivationChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const content = (
          <>
            <ChecklistIcon status={item.status} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-ink">
                {item.label}
                {!item.required ? <span className="text-xs font-normal text-ink-muted">Opcional</span> : null}
                {item.status === "integration_pending" ? <span className="text-xs font-normal text-warning">Integração pendente</span> : null}
              </span>
              <span className="mt-0.5 block text-[13px] text-ink-muted">{item.description}</span>
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <Link href={item.href} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3.5 hover:bg-muted/60">
                {content}
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
              </Link>
            ) : (
              <div className="flex items-start gap-3 py-3.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
