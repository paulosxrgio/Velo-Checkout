import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "demo" | "accent";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-muted text-ink-soft border-line",
  success: "bg-success-soft text-success border-success-line",
  warning: "bg-warning-soft text-warning border-warning-line",
  danger: "bg-danger-soft text-danger border-danger-line",
  info: "bg-info-soft text-info border-info-line",
  demo: "bg-demo-soft text-demo border-demo-line border-dashed",
  accent: "bg-accent-soft text-accent border-accent/25",
};

const dotStyles: Record<Tone, string> = {
  neutral: "bg-ink-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  demo: "bg-demo",
  accent: "bg-accent",
};

export function Badge({
  tone = "neutral",
  dot,
  icon,
  children,
  className,
  size = "md",
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-[13px]",
        toneStyles[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dotStyles[tone])} /> : null}
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
