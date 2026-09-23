import { cn } from "@/lib/cn";

/** Marca do produto no painel. */
export function VeloMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden="true">
        <rect width="28" height="28" rx="7" fill="var(--color-ink)" />
        <path d="M8 9l6 11 6-11" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20" cy="9" r="2.2" fill="#3ccf9f" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">Velo</span>
    </span>
  );
}
