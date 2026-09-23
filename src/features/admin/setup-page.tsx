"use client";

import { Lock } from "lucide-react";
import { AdminLoadError, AdminPageSkeleton } from "@/components/admin/admin-states";
import { PageHeader } from "@/components/admin/page-header";
import { SetupProgress, SetupStepList } from "@/components/admin/setup-steps";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { getAdminGateway } from "@/data";
import { buildActivationChecklist, buildSetupSteps, canActivate } from "@/domain/operation";
import { useResource } from "@/lib/use-resource";

export function SetupPage() {
  const gateway = getAdminGateway();
  const snapshot = useResource("admin:snapshot", () => gateway.getSnapshot());

  if (snapshot.status === "loading") return <AdminPageSkeleton cards={3} />;
  if (snapshot.status === "error") return <AdminLoadError message={snapshot.error.message} onRetry={snapshot.reload} />;

  const steps = buildSetupSteps(snapshot.data);
  const checklist = buildActivationChecklist(snapshot.data);
  const ready = canActivate(checklist);
  const pending = checklist.filter((c) => c.required && c.status !== "ok");

  return (
    <>
      <PageHeader
        title="Configuração guiada"
        description="Siga as etapas na ordem para colocar o checkout no ar com segurança. Cada etapa leva à tela correspondente."
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <SetupStepList steps={steps} />

        <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <Card>
            <CardBody>
              <SetupProgress steps={steps} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="text-[15px] font-semibold text-ink">Ativar checkout</h2>
              <p className="mt-1 text-sm text-ink-muted">
                A ativação direciona os compradores da loja para este checkout.
              </p>
              <Button variant="primary" fullWidth className="mt-4" disabled={!ready} aria-describedby="activate-reason">
                <Lock className="size-4" aria-hidden="true" />
                Ativar checkout
              </Button>
              <p id="activate-reason" className="mt-3 text-[13px] text-ink-muted">
                {ready
                  ? "Todos os requisitos foram atendidos."
                  : `Indisponível: ${pending.length} requisitos obrigatórios pendentes, incluindo as integrações reais com Shopify e Whop, que ainda não existem.`}
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
