"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

const controlBase =
  "block w-full rounded-[var(--radius-control)] border bg-surface px-3.5 text-base text-ink placeholder:text-ink-muted/80 transition-[border-color,box-shadow] outline-none sm:text-[15px] disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted read-only:bg-muted/60";

const controlState = (invalid: boolean) =>
  invalid
    ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-soft)]"
    : "border-line-strong hover:border-ink-muted/50 focus:border-focus focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-focus)_18%,transparent)]";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
  labelAction?: ReactNode;
}

export function FieldShell({ id, label, hint, error, optional, className, children, labelAction }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {optional ? <span className="font-normal text-ink-muted"> (opcional)</span> : null}
        </label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
  /** Conteúdo exibido dentro do campo, à direita (ex.: indicador de carregamento). */
  trailing?: ReactNode;
  labelAction?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, optional, containerClassName, className, id: idProp, trailing, labelAction, ...props },
  ref,
) {
  const generated = useId();
  const id = idProp ?? generated;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName} labelAction={labelAction}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, "h-12", controlState(Boolean(error)), trailing && "pr-11", className)}
          {...props}
        />
        {trailing ? <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-muted">{trailing}</div> : null}
      </div>
    </FieldShell>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, optional, containerClassName, className, id: idProp, children, ...props },
  ref,
) {
  const generated = useId();
  const id = idProp ?? generated;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(controlBase, "h-12 appearance-none pr-10", controlState(Boolean(error)), className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
    </FieldShell>
  );
});
