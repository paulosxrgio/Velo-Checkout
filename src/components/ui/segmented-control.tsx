"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
}

/** Grupo de opções exclusivas com rádios nativos (acessível por teclado). */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  hideLabel,
  size = "md",
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  hideLabel?: boolean;
  size?: "sm" | "md";
}) {
  const name = useId();
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={cn("mb-1.5 text-sm font-medium text-ink", hideLabel && "sr-only")}>{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[var(--radius-control)] border border-line bg-muted p-1">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                "relative inline-flex cursor-pointer items-center justify-center rounded-[calc(var(--radius-control)-3px)] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-focus",
                size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3 text-sm",
                checked ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-muted hover:text-ink",
                option.disabled && "cursor-not-allowed opacity-50 hover:text-ink-muted",
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
