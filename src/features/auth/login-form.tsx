"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { VeloMark } from "@/components/admin/velo-mark";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";

type LoginError = { title: string; message: string };

function describeFailure(status: number, message: string | undefined): LoginError {
  if (status === 401) return { title: "Não foi possível entrar", message: message ?? "E-mail ou senha incorretos." };
  if (status === 429) return { title: "Acesso bloqueado temporariamente", message: message ?? "Muitas tentativas. Aguarde alguns minutos." };
  if (status === 503) return { title: "Configuração incompleta do servidor", message: message ?? "O servidor não está configurado." };
  return { title: "Não foi possível entrar", message: message ?? "Erro inesperado. Tente novamente." };
}

/**
 * Formulário de login do painel. As credenciais vão direto para a rota do
 * servidor; a sessão volta como cookie httpOnly, inacessível ao JavaScript.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<LoginError | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError({ title: "Preencha os dados", message: "Informe e-mail e senha." });
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(describeFailure(response.status, body?.error?.message));
      setPassword("");
    } catch {
      setError({ title: "Sem conexão", message: "Não foi possível falar com o servidor. Verifique a conexão." });
    }
    setPending(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-12">
      <VeloMark />
      <h1 className="mt-8 text-2xl font-semibold tracking-[-0.02em] text-ink">Entrar no painel</h1>
      <p className="mt-1.5 text-[15px] text-ink-muted">Acesso restrito à equipe da operação.</p>

      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={submit} noValidate className="space-y-4">
          {error ? (
            <Callout tone="danger" role="alert" title={error.title}>
              {error.message}
            </Callout>
          ) : null}
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" fullWidth loading={pending} loadingLabel="Entrando…">
            <LockKeyhole className="size-4" aria-hidden="true" />
            Entrar
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-[13px] text-ink-muted">
        Não tem acesso? Um administrador cria contas pelo comando <code className="font-mono">npm run admin:create</code> no servidor.
      </p>
    </main>
  );
}
