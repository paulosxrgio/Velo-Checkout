import type { ReactNode } from "react";
import { VeloMark } from "./velo-mark";

/** Página simples para estados em que o painel não pode ser exibido (modo demo, configuração incompleta). */
export function AdminNotice({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <VeloMark />
      <h1 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">{children}</div>
      {action ? <div className="mt-8 flex flex-wrap gap-3">{action}</div> : null}
    </main>
  );
}
