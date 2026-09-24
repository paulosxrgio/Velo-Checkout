import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminNotice } from "@/components/admin/admin-notice";
import { buttonStyles } from "@/components/ui/button";
import { peekDataSource } from "@/data/source";
import { safeAdminPath } from "@/lib/safe-redirect";
import { AdminFrame } from "@/features/admin/admin-frame";
import { getAdminForPage } from "@/server/auth/dal";
import { ConfigError } from "@/server/config";
import { describeDatabaseProblem } from "@/server/http/api";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Velo" },
};

/**
 * Proteção do painel no servidor: a sessão é verificada no banco a cada
 * requisição de página. As APIs do painel fazem a mesma verificação.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const source = peekDataSource();
  if (source !== "api") {
    return (
      <AdminNotice
        title="Painel indisponível neste modo"
        action={
          <Link href="/checkout?carrinho=demo" className={buttonStyles({ variant: "primary" })}>
            Abrir checkout de demonstração
          </Link>
        }
      >
        <p>
          {source === "demo"
            ? "O modo de demonstração oferece apenas o checkout com dados fictícios."
            : "A variável NEXT_PUBLIC_DATA_SOURCE não está definida ou tem um valor inválido."}{" "}
          Para usar o painel, defina <code className="font-mono text-sm">NEXT_PUBLIC_DATA_SOURCE=api</code> e configure o banco (
          <code className="font-mono text-sm">DATABASE_URL</code>).
        </p>
      </AdminNotice>
    );
  }

  let admin: Awaited<ReturnType<typeof getAdminForPage>>;
  try {
    admin = await getAdminForPage();
  } catch (error) {
    const problem = error instanceof ConfigError ? error.message : describeDatabaseProblem(error);
    if (!problem) throw error;
    return (
      <AdminNotice title="Configuração incompleta do servidor">
        <p>{problem}</p>
        <p>O painel continua protegido: nenhum dado é exibido até a configuração ser corrigida.</p>
      </AdminNotice>
    );
  }

  if (!admin) {
    const requested = (await headers()).get("x-velo-pathname");
    redirect(`/entrar?next=${encodeURIComponent(safeAdminPath(requested))}`);
  }

  return <AdminFrame userEmail={admin.email}>{children}</AdminFrame>;
}
