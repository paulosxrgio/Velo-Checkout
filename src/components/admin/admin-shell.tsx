"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  ExternalLink,
  Globe,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Palette,
  Receipt,
  Settings,
  Store,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { VeloMark } from "./velo-mark";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Store;
  exact?: boolean;
}

const NAV: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
      { href: "/admin/configuracao", label: "Configuração guiada", icon: ListChecks },
    ],
  },
  {
    title: "Integrações",
    items: [
      { href: "/admin/shopify", label: "Shopify", icon: Store },
      { href: "/admin/whop", label: "Whop", icon: CreditCard },
      { href: "/admin/dominio", label: "Domínio", icon: Globe },
    ],
  },
  {
    title: "Checkout",
    items: [
      { href: "/admin/aparencia", label: "Aparência", icon: Palette },
      { href: "/admin/pedidos", label: "Pedidos", icon: Receipt },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({ pathname, attentionCount }: { pathname: string; attentionCount: number }) {
  return (
    <nav aria-label="Painel" className="flex flex-col gap-6">
      {NAV.map((group, index) => (
        <div key={group.title ?? index}>
          {group.title ? <p className="mb-1.5 px-3 text-xs font-medium tracking-wide text-ink-muted uppercase">{group.title}</p> : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                      active ? "bg-muted text-ink" : "text-ink-soft hover:bg-muted/70 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-4", active ? "text-ink" : "text-ink-muted")} aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/admin/pedidos" && attentionCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-soft px-1.5 text-[11px] font-semibold text-warning">
                        {attentionCount}
                        <span className="sr-only"> pedidos exigem atenção</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error();
      router.replace("/entrar");
      router.refresh();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={pending}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-muted hover:text-ink disabled:opacity-50"
        aria-label="Sair do painel"
        title="Sair"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
      {error ? (
        <p role="alert" className="absolute right-3 bottom-full mb-1 rounded-md bg-danger-soft px-2 py-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function SidebarFooter({ storeName, environment, userEmail }: { storeName: string; environment: string; userEmail: string }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <Link
        href="/checkout?carrinho=demo"
        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-muted hover:text-ink"
      >
        Abrir checkout de demonstração
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
      <div className="px-3">
        <p className="truncate text-sm font-medium text-ink">{storeName}</p>
        <p className="text-xs text-ink-muted">Loja única · {environment}</p>
      </div>
      <div className="relative flex items-center justify-between gap-2 border-t border-line px-3 pt-3">
        <p className="min-w-0 truncate text-xs text-ink-muted" title={userEmail}>
          {userEmail}
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  storeName,
  environment,
  attentionCount,
  userEmail,
}: {
  children: ReactNode;
  storeName: string;
  environment: string;
  attentionCount: number;
  userEmail: string;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#conteudo-admin"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        <div className="flex items-center justify-between px-3">
          <VeloMark />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList pathname={pathname} attentionCount={attentionCount} />
        </div>
        <SidebarFooter storeName={storeName} environment={environment} userEmail={userEmail} />
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="-ml-2 flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-muted"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <VeloMark />
        <span className="w-10" />
      </header>

      <dialog
        ref={dialogRef}
        aria-label="Menu do painel"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-[min(85vw,300px)] max-w-none bg-surface p-0 backdrop:bg-ink/40 open:flex"
      >
        <div className="flex w-full flex-col gap-6 px-3 py-4">
          <div className="flex items-center justify-between px-3">
            <VeloMark />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="-mr-2 flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-muted"
              aria-label="Fechar menu"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavList pathname={pathname} attentionCount={attentionCount} />
          </div>
          <SidebarFooter storeName={storeName} environment={environment} userEmail={userEmail} />
        </div>
      </dialog>

      <main id="conteudo-admin" className="min-w-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
