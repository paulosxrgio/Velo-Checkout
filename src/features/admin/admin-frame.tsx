"use client";

import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminGateway, isDemoData } from "@/data";
import { requiresAttention } from "@/domain/operation";
import { useResource } from "@/lib/use-resource";

/** Carrega os dados globais do painel (nome da loja, ambiente e alertas) para a navegação. */
export function AdminFrame({ children }: { children: ReactNode }) {
  const gateway = getAdminGateway();
  const settings = useResource("admin:settings", () => gateway.getSettings());
  const orders = useResource("admin:orders", () => gateway.listOrders());

  return (
    <AdminShell
      storeName={settings.data?.operationName ?? "Carregando…"}
      environment={settings.data ? (settings.data.environment === "production" ? "Produção" : "Sandbox") : "—"}
      attentionCount={orders.data?.filter(requiresAttention).length ?? 0}
      isDemo={isDemoData}
    >
      {children}
    </AdminShell>
  );
}
