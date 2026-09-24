import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNotice } from "@/components/admin/admin-notice";
import { buttonStyles } from "@/components/ui/button";
import { peekDataSource } from "@/data/source";
import { LoginForm } from "@/features/auth/login-form";
import { safeAdminPath } from "@/lib/safe-redirect";
import { getAdminForPage } from "@/server/auth/dal";
import { ConfigError } from "@/server/config";
import { describeDatabaseProblem } from "@/server/http/api";

export const metadata: Metadata = { title: "Entrar no painel" };

export default async function LoginPage({ searchParams }: PageProps<"/entrar">) {
  const { next } = await searchParams;
  const target = safeAdminPath(typeof next === "string" ? next : null);

  if (peekDataSource() !== "api") {
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
          O login do painel exige <code className="font-mono text-sm">NEXT_PUBLIC_DATA_SOURCE=api</code> e o banco configurado.
        </p>
      </AdminNotice>
    );
  }

  let signedIn = false;
  try {
    signedIn = Boolean(await getAdminForPage());
  } catch (error) {
    const problem = error instanceof ConfigError ? error.message : describeDatabaseProblem(error);
    if (!problem) throw error;
    return (
      <AdminNotice title="Configuração incompleta do servidor">
        <p>{problem}</p>
      </AdminNotice>
    );
  }
  if (signedIn) redirect(target);

  return <LoginForm next={target} />;
}
