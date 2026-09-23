"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DemoScenarioLink {
  token: string;
  label: string;
  description: string;
}

/**
 * Faixa exibida somente com dados demonstrativos: identifica a demonstração
 * e permite alternar entre cenários de carrinho.
 */
export function DemoBar({
  scenarios = [],
  current = null,
  tips = [],
}: {
  scenarios?: DemoScenarioLink[];
  current?: string | null;
  tips?: string[];
}) {
  const hasDetails = scenarios.length > 0 || tips.length > 0;
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-dashed border-demo-line bg-demo-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <p className="flex items-center gap-2 text-[13px] text-ink-soft">
          <FlaskConical className="size-3.5 shrink-0 text-demo" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-demo">Demonstração.</strong> Loja, produtos e pagamentos fictícios — nenhuma cobrança é feita.
          </span>
        </p>
        {hasDetails ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex items-center gap-1 rounded-md py-1 text-[13px] font-medium text-demo hover:underline"
        >
          Cenários e dicas
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        ) : null}
      </div>
      <div id={panelId} hidden={!open || !hasDetails} className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <nav aria-label="Cenários de demonstração" className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => {
            const active = scenario.token === current;
            return (
              <Link
                key={scenario.token}
                href={`/checkout?carrinho=${scenario.token}`}
                aria-current={active ? "page" : undefined}
                title={scenario.description}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                  active ? "border-demo bg-demo text-white" : "border-demo-line bg-surface text-ink-soft hover:border-demo hover:text-ink",
                )}
              >
                {scenario.label}
              </Link>
            );
          })}
        </nav>
        <ul className="mt-3 space-y-1 text-[13px] text-ink-soft">
          {tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
