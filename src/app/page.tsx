import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingCart } from "lucide-react";
import { VeloMark } from "@/components/admin/velo-mark";
import { buttonStyles } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo";
import { DEMO_SCENARIOS } from "@/data/demo/fixtures";
import { peekDataSource } from "@/data/source";

/**
 * Índice de desenvolvimento: atalhos para o checkout demonstrativo e o painel.
 * Em produção, o domínio do checkout não expõe esta página.
 */
export default function Home() {
  const source = peekDataSource();
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <VeloMark />
        <DemoBadge>{source === "api" ? "Checkout de demonstração disponível" : "Somente demonstração"}</DemoBadge>
      </div>

      <h1 className="mt-10 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Checkout próprio para Shopify, com pagamento pela Whop</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
        Os cenários do checkout usam dados fictícios e nunca cobram. O painel exige login e guarda as configurações no servidor. Ainda não há
        conexão com a loja nem cobranças reais.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-ink-soft">
            <ShoppingCart className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Checkout do comprador</h2>
          <p className="mt-1 text-sm text-ink-muted">Cenários de demonstração: resumo, entrega, cupom, frete e área de pagamento da Whop.</p>
          <ul className="mt-4 flex-1 space-y-1 text-sm">
            {DEMO_SCENARIOS.map((scenario) => (
              <li key={scenario.token}>
                <Link href={`/checkout?carrinho=${scenario.token}`} className="group inline-flex items-center gap-1.5 font-medium text-ink-soft hover:text-ink">
                  <ArrowRight className="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  {scenario.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-ink-soft">
            <LayoutDashboard className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Painel da operação</h2>
          <p className="mt-1 flex-1 text-sm text-ink-muted">
            {source === "api"
              ? "Conexões Shopify e Whop, domínio, aparência, pedidos e checklist de ativação. Acesso com login."
              : "Indisponível neste modo: defina NEXT_PUBLIC_DATA_SOURCE=api e o banco para usar o painel."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/admin" className={buttonStyles({ variant: "primary" })}>
              Abrir painel
            </Link>
            <Link href="/admin/configuracao" className={buttonStyles({ variant: "secondary" })}>
              Configuração guiada
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
