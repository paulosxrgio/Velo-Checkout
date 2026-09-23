"use client";

import { LoaderCircle } from "lucide-react";
import { BrandTheme } from "@/components/checkout/brand-theme";
import { DemoBar } from "@/components/checkout/demo-bar";
import {
  CheckingHero,
  NotFoundHero,
  ReceiptSummary,
  StatusHero,
  StatusMeta,
  statusPresentation,
} from "@/components/checkout/payment-status";
import { CheckoutFooter, CheckoutHeader } from "@/components/checkout/store-chrome";
import { buttonStyles } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { getCheckoutGateway, isDemoData } from "@/data";
import type { PaymentAttempt } from "@/domain/types";
import { useResource } from "@/lib/use-resource";
import { usePaymentAttempt } from "./use-payment-attempt";

function StatusDescription({ attempt }: { attempt: PaymentAttempt }) {
  switch (attempt.status) {
    case "paid":
      return (
        <>
          <p>
            Obrigado pela compra! Enviamos os detalhes para <strong className="font-medium text-ink">{attempt.receipt.email}</strong>.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm">
            {attempt.order?.status === "synced" ? (
              <>Pedido {attempt.order.name} registrado na loja.</>
            ) : attempt.order?.status === "failed" ? (
              <>Estamos finalizando o registro do seu pedido e avisaremos por e-mail.</>
            ) : (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                Registrando seu pedido na loja…
              </>
            )}
          </p>
        </>
      );
    case "processing":
      return (
        <p>
          Recebemos seu pagamento e aguardamos a confirmação da operadora. <strong className="font-medium text-ink">Não é necessário pagar novamente</strong>
          {" "}— esta página é atualizada sozinha.
        </p>
      );
    case "failed":
      return (
        <p>
          {attempt.failure?.message ?? "A operadora não aprovou o pagamento."} Você pode tentar novamente com outra forma de pagamento.
        </p>
      );
    case "expired":
      return <p>O tempo para concluir este pagamento acabou e nenhum valor foi cobrado. Volte ao checkout para tentar de novo.</p>;
    default:
      return (
        <p>
          Ainda não recebemos a confirmação deste pagamento. Se você já concluiu, aguarde alguns instantes — esta página é atualizada sozinha.
        </p>
      );
  }
}

export function PaymentStatusExperience({ attemptId }: { attemptId: string | null }) {
  const gateway = getCheckoutGateway();
  const storefront = useResource("storefront", () => gateway.getStorefront());
  const view = usePaymentAttempt(attemptId);
  const storeUrl = storefront.data?.storeUrl;

  const storeLink = storeUrl ? (
    <a href={storeUrl} className={buttonStyles({ variant: "secondary" })}>
      Voltar para a loja
    </a>
  ) : null;

  let content;
  if (view.phase === "missing" || (view.phase === "error" && !view.attempt)) {
    content =
      view.error && view.error.code !== "attempt_not_found" ? (
        <StatusHero
          tone="neutral"
          icon={<LoaderCircle className="size-7" aria-hidden="true" />}
          title="Não foi possível consultar o pagamento"
          actions={
            <button type="button" onClick={view.refresh} className={buttonStyles({ variant: "primary" })}>
              Tentar novamente
            </button>
          }
        >
          {view.error.message} Se você concluiu o pagamento, ele não será perdido.
        </StatusHero>
      ) : (
        <NotFoundHero actions={storeLink} />
      );
  } else if (view.phase === "loading" || !view.attempt) {
    content = <CheckingHero />;
  } else {
    const attempt = view.attempt;
    const presentation = statusPresentation(attempt);
    const retry =
      attempt.status === "failed" || attempt.status === "expired" || attempt.status === "awaiting_payment" ? (
        <a href={attempt.checkoutUrl} className={buttonStyles({ variant: "brand" })}>
          {attempt.status === "awaiting_payment" ? "Voltar ao pagamento" : "Tentar novamente"}
        </a>
      ) : null;
    content = (
      <div className="space-y-5">
        <StatusHero
          tone={presentation.tone}
          icon={presentation.icon}
          title={presentation.title}
          actions={retry || attempt.status === "paid" ? <>{retry}{storeLink}</> : null}
          meta={<StatusMeta attemptId={attempt.id} checkedAt={view.checkedAt} polling={view.polling} onRefresh={view.refresh} />}
        >
          <StatusDescription attempt={attempt} />
        </StatusHero>

        {view.timedOut ? (
          <Callout tone="info" title="Ainda sem resposta final">
            A confirmação está demorando mais que o normal. Você pode atualizar o status ou aguardar o e-mail — não é necessário pagar novamente.
          </Callout>
        ) : null}
        {view.error ? (
          <Callout tone="warning" role="status" title="Não foi possível atualizar agora">
            {view.error.message}
          </Callout>
        ) : null}

        {attempt.status === "paid" || attempt.status === "processing" ? <ReceiptSummary attempt={attempt} /> : null}
      </div>
    );
  }

  return (
    <BrandTheme color={storefront.data?.appearance.primaryColor ?? "#1f4d3a"} className="flex min-h-screen flex-col">
      {isDemoData ? <DemoBar /> : null}
      {storefront.data ? <CheckoutHeader storefront={storefront.data} /> : <div className="h-16 border-b border-line bg-surface" />}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{content}</main>
      {storefront.data ? <CheckoutFooter storefront={storefront.data} /> : null}
    </BrandTheme>
  );
}
