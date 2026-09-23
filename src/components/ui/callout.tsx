import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

type CalloutTone = "info" | "success" | "warning" | "danger" | "demo" | "neutral";

const styles: Record<CalloutTone, string> = {
  info: "bg-info-soft border-info-line text-ink",
  success: "bg-success-soft border-success-line text-ink",
  warning: "bg-warning-soft border-warning-line text-ink",
  danger: "bg-danger-soft border-danger-line text-ink",
  demo: "bg-demo-soft border-demo-line border-dashed text-ink",
  neutral: "bg-muted border-line text-ink",
};

const iconColor: Record<CalloutTone, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  demo: "text-demo",
  neutral: "text-ink-muted",
};

const icons: Record<CalloutTone, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  demo: FlaskConical,
  neutral: Info,
};

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
  role,
  id,
  tabIndex,
}: {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "alert" | "status";
  id?: string;
  tabIndex?: number;
}) {
  const Icon = icons[tone];
  return (
    <div id={id} role={role} tabIndex={tabIndex} className={cn("flex gap-3 rounded-[var(--radius-control)] border px-4 py-3.5 outline-none", styles[tone], className)}>
      <Icon className={cn("mt-0.5 size-[18px] shrink-0", iconColor[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        {children ? <div className={cn("text-ink-soft", title && "mt-0.5")}>{children}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
