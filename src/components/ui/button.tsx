import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90 disabled:bg-ink/40",
  brand: "bg-brand text-brand-fg hover:brightness-[1.08] disabled:opacity-50",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-muted disabled:text-ink-muted disabled:bg-surface",
  ghost: "text-ink-soft hover:bg-muted hover:text-ink disabled:text-ink-muted",
  danger: "bg-surface text-danger border border-danger-line hover:bg-danger-soft",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-13 px-5 text-base gap-2",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-[background-color,color,filter,box-shadow] disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Mostra um indicador e bloqueia cliques repetidos. */
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading, loadingLabel, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
