import { CircleCheck, CircleDashed, CircleMinus, Clock, Plug } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import type {
  ChecklistItemStatus,
  PaymentStatus,
  SetupStepState,
  ShopifyConnectionStatus,
  ShopifySyncStatus,
  VerificationStatus,
  WebhookStatus,
  WhopConnectionStatus,
} from "@/domain/types";
import { cn } from "@/lib/cn";

type Meta = { label: string; tone: Tone };

export const paymentStatusMeta: Record<PaymentStatus, Meta> = {
  awaiting_payment: { label: "Aguardando pagamento", tone: "neutral" },
  processing: { label: "Confirmação pendente", tone: "warning" },
  paid: { label: "Pago", tone: "success" },
  failed: { label: "Recusado", tone: "danger" },
  refunded: { label: "Reembolsado", tone: "neutral" },
  expired: { label: "Expirado", tone: "neutral" },
};

export const syncStatusMeta: Record<ShopifySyncStatus, Meta> = {
  not_started: { label: "Não iniciado", tone: "neutral" },
  pending: { label: "Criando pedido", tone: "warning" },
  synced: { label: "Pedido criado", tone: "success" },
  failed: { label: "Falha ao criar", tone: "danger" },
};

export const shopifyConnectionMeta: Record<ShopifyConnectionStatus, Meta> = {
  disconnected: { label: "Desconectada", tone: "neutral" },
  connecting: { label: "Conectando", tone: "info" },
  connected: { label: "Conectada", tone: "success" },
  error: { label: "Erro na conexão", tone: "danger" },
};

export const whopConnectionMeta: Record<WhopConnectionStatus, Meta> = {
  integration_pending: { label: "Integração pendente", tone: "warning" },
  disconnected: { label: "Desconectada", tone: "neutral" },
  connecting: { label: "Conectando", tone: "info" },
  connected: { label: "Conectada", tone: "success" },
  error: { label: "Erro na conexão", tone: "danger" },
};

export const webhookStatusMeta: Record<WebhookStatus, Meta> = {
  not_configured: { label: "Não configurado", tone: "neutral" },
  pending: { label: "Aguardando primeiro evento", tone: "info" },
  active: { label: "Ativo", tone: "success" },
  failing: { label: "Falhando", tone: "danger" },
};

export const verificationMeta: Record<VerificationStatus, Meta> = {
  not_started: { label: "Não iniciada", tone: "neutral" },
  pending: { label: "Verificando", tone: "info" },
  verified: { label: "Verificado", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
};

export const setupStateMeta: Record<SetupStepState, Meta> = {
  done: { label: "Concluída", tone: "success" },
  todo: { label: "A fazer", tone: "accent" },
  integration_pending: { label: "Integração pendente", tone: "warning" },
  blocked: { label: "Bloqueada", tone: "neutral" },
};

export function StatusBadge({ meta, size }: { meta: Meta; size?: "sm" | "md" }) {
  return (
    <Badge tone={meta.tone} dot size={size}>
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge meta={paymentStatusMeta[status]} size="sm" />;
}

export function SyncBadge({ status, paid }: { status: ShopifySyncStatus; paid: boolean }) {
  if (!paid && status === "not_started") return <span className="text-[13px] text-ink-muted">—</span>;
  return <StatusBadge meta={syncStatusMeta[status]} size="sm" />;
}

const checklistIcon: Record<ChecklistItemStatus, { icon: typeof CircleCheck; className: string; label: string }> = {
  ok: { icon: CircleCheck, className: "text-success", label: "Concluído" },
  pending: { icon: CircleDashed, className: "text-ink-muted", label: "Pendente" },
  integration_pending: { icon: Plug, className: "text-warning", label: "Integração pendente" },
  optional: { icon: CircleMinus, className: "text-ink-muted", label: "Opcional" },
};

export function ChecklistIcon({ status, className }: { status: ChecklistItemStatus; className?: string }) {
  const { icon: Icon, className: color, label } = checklistIcon[status];
  return (
    <span className={cn("inline-flex", className)}>
      <Icon className={cn("size-5", color)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PendingIntegrationIcon() {
  return <Clock className="size-4 text-warning" aria-hidden="true" />;
}
