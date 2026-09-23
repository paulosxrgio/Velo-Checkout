import { formatDateTime } from "@/domain/format";
import type { OrderEvent, OrderEventTone } from "@/domain/types";
import { cn } from "@/lib/cn";

const dot: Record<OrderEventTone, string> = {
  neutral: "bg-ink-muted",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const sourceLabel: Record<OrderEvent["source"], string> = {
  comprador: "Comprador",
  whop: "Whop",
  shopify: "Shopify",
  sistema: "Sistema",
};

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  const ordered = [...events].reverse();
  return (
    <ol className="relative">
      {ordered.map((event, index) => (
        <li key={event.id} className="relative flex gap-3.5 pb-5 last:pb-0">
          {index < ordered.length - 1 ? <span aria-hidden="true" className="absolute top-4 bottom-0 left-[5px] w-px bg-line-strong" /> : null}
          <span aria-hidden="true" className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface", dot[event.tone])} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className={cn("text-sm font-medium", event.tone === "danger" ? "text-danger" : "text-ink")}>{event.title}</p>
              <time dateTime={event.at} className="text-xs text-ink-muted tabular-nums">
                {formatDateTime(event.at)}
              </time>
            </div>
            {event.description ? <p className="mt-0.5 text-[13px] break-words text-ink-soft">{event.description}</p> : null}
            <p className="mt-0.5 text-xs text-ink-muted">{sourceLabel[event.source]}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
