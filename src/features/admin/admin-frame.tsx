"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminGateway } from "@/data";
import { requiresAttention } from "@/domain/operation";
import { useResource } from "@/lib/use-resource";

/**
 * Moldura do painel já autenticado (a sessão foi verificada no servidor pelo
 * layout). Carrega nome da loja, ambiente e alertas para a navegação.
 */
export function AdminFrame({ children, userEmail }: { children: ReactNode; userEmail: string }) {
  const settings = useResource("admin:settings", async () => getAdminGateway().getSettings());
  const orders = useResource("admin:orders", async () => getAdminGateway().listOrders());

  return (
    <AdminShell
      storeName={settings.data ? settings.data.operationName || "Operação sem nome" : "Carregando…"}
      environment={settings.data ? (settings.data.environment === "production" ? "Produção" : "Sandbox") : "—"}
      attentionCount={orders.data?.filter(requiresAttention).length ?? 0}
      userEmail={userEmail}
    >
      {children}
    </AdminShell>
  );
}
