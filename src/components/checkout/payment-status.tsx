import type { ReactNode } from "react";
import { CircleCheck, CircleX, Clock, Hourglass, RefreshCw, SearchX, TimerOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/domain/format";
import { formatMoney } from "@/domain/money";
import type { PaymentAttempt } from "@/domain/types";
import { cn } from "@/lib/cn";
import { ProductThumb } from "./line-item";
import { TotalsBreakdown } from "./totals";

type HeroTone = "success" | "warning" | "danger" | "neutral";

const toneStyles: Record<HeroTone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-ink-soft",
};

export function StatusHero({
  tone,
  icon,
  title,
  children,
  meta,
  actions,
}: {
  tone: HeroTone;
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="px-5 py-8 text-center sm:px-10 sm:py-10">
      <span className={cn("mx-auto flex size-14 items-center justify-center rounded-full", toneStyles[tone])}>{icon}</span>
      <h1 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</h1>
      {children ? <div className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-soft">{children}</div> : null}
      {actions ? <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">{actions}</div> : null}
      {meta ? <div className="mt-7 border-t border-line pt-5">{meta}</div> : null}
    </Card>
  );
}

export function statusPresentation(attempt: PaymentAttempt): { tone: HeroTone; icon: ReactNode; title: string } {
  switch (attempt.status) {
    case "paid":
      return { tone: "success", icon: <CircleCheck className="size-7" aria-hidden="true" />, title: "Pagamento confirmado" };
    case "processing":
      return { tone: "warning", icon: <Clock className="size-7" aria-hidden="true" />, title: "Confirmação pendente" };
    case "failed":
      return { tone: "danger", icon: <CircleX className="size-7" aria-hidden="true" />, title: "Pagamento não aprovado" };
    case "expired":
      return { tone: "neutral", icon: <TimerOff className="size-7" aria-hidden="true" />, title: "Sessão de pagamento expirada" };
    default:
      return { tone: "neutral", icon: <Hourglass className="size-7" aria-hidden="true" />, title: "Aguardando pagamento" };
  }
}

export function NotFoundHero({ actions }: { actions?: ReactNode }) {
  return (
    <StatusHero tone="neutral" icon={<SearchX className="size-7" aria-hidden="true" />} title="Não encontramos este pagamento" actions={actions}>
      O link pode estar incompleto ou ter expirado. Se você concluiu uma compra, confira o e-mail de confirmação ou fale com o atendimento da loja.
    </StatusHero>
  );
}

export function CheckingHero() {
  return (
    <StatusHero tone="neutral" icon={<Spinner className="size-7" />} title="Consultando seu pagamento">
      <span role="status">Estamos verificando o status com o processador de pagamento. Isso leva só alguns segundos.</span>
    </StatusHero>
  );
}

export function StatusMeta({
  attemptId,
  checkedAt,
  polling,
  onRefresh,
}: {
  attemptId: string;
  checkedAt?: string;
  polling: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-[13px] text-ink-muted sm:flex-row sm:justify-between">
      <span className="flex items-center gap-1">
        Referência: <span className="font-mono text-ink-soft">{attemptId}</span>
        <CopyButton value={attemptId} label="referência do pagamento" className="size-7" />
      </span>
      <span className="flex items-center gap-2" aria-live="polite">
        {polling ? (
          <>
            <Spinner className="size-3.5" /> Atualizando automaticamente
          </>
        ) : checkedAt ? (
          <>
            Verificado em {formatDateTime(checkedAt)}
            <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 rounded font-medium text-ink-soft hover:text-ink">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Atualizar
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
}

export function ReceiptSummary({ attempt }: { attempt: PaymentAttempt }) {
  const { receipt } = attempt;
  const count = receipt.lines.reduce((sum, l) => sum + l.quantity, 0);
  const address = receipt.shippingAddress;
  return (
    <Card>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="text-base font-semibold text-ink">Resumo do pedido</h2>
      </div>
      <ul className="space-y-4 px-5 py-5 sm:px-6" aria-label="Itens">
        {receipt.lines.map((line, index) => (
          <li key={`${line.title}-${index}`} className="flex items-center gap-3.5">
            <ProductThumb src={line.image?.url} alt={line.image?.altText ?? line.title} quantity={line.quantity} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{line.title}</p>
              <p className="text-[13px] text-ink-muted">{line.variantTitle}</p>
            </div>
            <p className="text-sm text-ink tabular-nums">{formatMoney(line.lineTotal)}</p>
          </li>
        ))}
      </ul>
      <div className="border-t border-line px-5 py-5 sm:px-6">
        <TotalsBreakdown quote={receipt.quote} itemCount={count} busy={false} />
      </div>
      <div className="grid gap-5 border-t border-line px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
        <div>
          <h3 className="font-medium text-ink">Entrega</h3>
          <p className="mt-1 text-ink-soft">
            {address.street}, {address.number}
            {address.complement ? ` · ${address.complement}` : ""}
            <br />
            {address.neighborhood} · {address.city}/{address.state}
          </p>
        </div>
        <div>
          <h3 className="font-medium text-ink">Contato</h3>
          <p className="mt-1 break-words text-ink-soft">{receipt.email}</p>
        </div>
      </div>
    </Card>
  );
}
