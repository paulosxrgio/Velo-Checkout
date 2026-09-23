"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Área de transferência indisponível (ex.: contexto não seguro). O valor segue visível para seleção manual.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-muted hover:text-ink",
        className,
      )}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
    >
      {copied ? <Check className="size-4 text-success" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copiado" : ""}
      </span>
    </button>
  );
}
