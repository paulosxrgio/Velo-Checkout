import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

/** Selo aplicado a todo dado ou ação demonstrativa. */
export function DemoBadge({ children = "Demonstração", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-demo-line bg-demo-soft px-2 text-xs font-medium whitespace-nowrap text-demo",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden="true" />
      {children}
    </span>
  );
}
