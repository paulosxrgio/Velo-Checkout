import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-ink-muted">Erro 404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink">Página não encontrada</h1>
      <p className="mt-2 text-[15px] text-ink-muted">O endereço pode estar incorreto ou a página foi removida.</p>
      <Link href="/" className={buttonStyles({ variant: "primary", className: "mt-8" })}>
        Ir para o início
      </Link>
    </main>
  );
}
