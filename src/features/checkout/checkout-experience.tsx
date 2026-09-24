"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Pencil } from "lucide-react";
import { AddressFields, type PostalLookupStatus } from "@/components/checkout/address-fields";
import { BrandTheme } from "@/components/checkout/brand-theme";
import { CartNotices } from "@/components/checkout/cart-notices";
import { CheckoutLoadError, CheckoutSkeleton, EmptyCartState } from "@/components/checkout/checkout-states";
import { CheckoutStep } from "@/components/checkout/checkout-step";
import { ContactFields } from "@/components/checkout/contact-fields";
import { DemoBar } from "@/components/checkout/demo-bar";
import { MobileSummary, SummaryAside, type OrderSummaryProps } from "@/components/checkout/order-summary";
import type { DemoOutcome } from "@/components/checkout/payment/demo-payment-panel";
import { WhopCheckoutSlot } from "@/components/checkout/payment/whop-checkout-slot";
import { ShippingOptions } from "@/components/checkout/shipping-options";
import { CheckoutFooter, CheckoutHeader } from "@/components/checkout/store-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { checkoutMode, getCheckoutGateway, type CheckoutState } from "@/data";
import { simulateDemoPaymentOutcome } from "@/data/demo/checkout-gateway";
import { DEMO_CHECKOUT_TIPS, DEMO_SCENARIOS } from "@/data/demo/fixtures";
import { linesWithPriceChange, unavailableLines } from "@/domain/cart";
import { formatDeliveryEstimate, formatPhone, onlyDigits } from "@/domain/format";
import { formatMoney } from "@/domain/money";
import type { StorefrontInfo } from "@/domain/types";
import { useResource } from "@/lib/use-resource";
import { fieldId, useCheckoutForm, type FieldKey } from "./use-checkout-form";
import { useCheckout, type CheckoutController } from "./use-checkout";

const DECLINE_MESSAGE =
  "A operadora não aprovou o pagamento e nenhum valor foi cobrado. Confira os dados ou tente outra forma de pagamento.";

function confirmationUrl(attemptId: string) {
  return `/checkout/confirmacao?tentativa=${encodeURIComponent(attemptId)}`;
}

/** Faixa de demonstração: aparece somente em cenários demo, nunca em carrinhos reais. */
function DemoStrip({ current, demo }: { current: string | null; demo: boolean }) {
  if (!demo) return null;
  return <DemoBar scenarios={DEMO_SCENARIOS} current={current} tips={DEMO_CHECKOUT_TIPS} />;
}

function PageFrame({
  storefront,
  cartToken,
  demo,
  children,
}: {
  storefront?: StorefrontInfo;
  cartToken: string | null;
  demo: boolean;
  children: ReactNode;
}) {
  return (
    <BrandTheme color={storefront?.appearance.primaryColor ?? "#1f4d3a"} className="flex min-h-screen flex-col">
      <DemoStrip current={cartToken} demo={demo} />
      {storefront ? <CheckoutHeader storefront={storefront} /> : null}
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      {storefront ? <CheckoutFooter storefront={storefront} /> : null}
    </BrandTheme>
  );
}

export function CheckoutExperience({ cartToken }: { cartToken: string | null }) {
  const mode = checkoutMode({ cartToken });
  const demo = mode.ok && mode.demo;
  const storefront = useResource(`storefront:${cartToken ?? ""}`, async () => getCheckoutGateway({ cartToken }).getStorefront());
  const controller = useCheckout(cartToken);
  const { resource } = controller;

  if (!mode.ok) {
    return (
      <PageFrame cartToken={cartToken} demo={false}>
        <CheckoutLoadError title="Configuração incompleta" message={mode.message} />
      </PageFrame>
    );
  }

  if (resource.status === "loading") {
    return (
      <div className="min-h-screen">
        <DemoStrip current={cartToken} demo={demo} />
        <CheckoutSkeleton />
      </div>
    );
  }

  if (resource.status === "error") {
    const { code, message } = resource.error;
    const copy =
      code === "cart_expired"
        ? { title: "Este link de checkout expirou", message: "Por segurança, cada link de checkout vale por tempo limitado. Volte ao carrinho da loja e clique em finalizar compra para gerar um novo." }
        : code === "cart_not_found"
          ? { title: "Carrinho não encontrado", message: "O link pode estar incompleto. Volte ao carrinho da loja e clique em finalizar compra novamente." }
          : code === "misconfigured"
            ? { title: "Configuração incompleta", message }
            : { title: "Não foi possível carregar o checkout", message };
    const retryable = code === "network";
    return (
      <PageFrame storefront={storefront.data} cartToken={cartToken} demo={demo}>
        <CheckoutLoadError
          title={copy.title}
          message={copy.message}
          cartUrl={storefront.data ? `${storefront.data.storeUrl}/cart` : undefined}
          onRetry={retryable ? resource.reload : undefined}
        />
      </PageFrame>
    );
  }

  if (resource.data.cart.lines.length === 0) {
    return (
      <PageFrame storefront={resource.data.storefront} cartToken={cartToken} demo={resource.data.cart.isDemo}>
        <EmptyCartState storeUrl={resource.data.storefront.storeUrl} />
      </PageFrame>
    );
  }

  return <CheckoutReady state={resource.data} controller={controller} cartToken={cartToken} />;
}

function CheckoutReady({ state, controller, cartToken }: { state: CheckoutState; controller: CheckoutController; cartToken: string | null }) {
  const router = useRouter();
  const form = useCheckoutForm();
  const { cart, quote, shipping, storefront } = state;
  const { actions, payment } = controller;

  const [lookupStatus, setLookupStatus] = useState<PostalLookupStatus>("idle");
  const lastLookup = useRef<string | null>(null);
  const [showBlockers, setShowBlockers] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ id: string; tick: number } | null>(null);

  const paymentHeadingRef = useRef<HTMLDivElement>(null);

  const locked = payment.status === "ready" || payment.status === "preparing";
  const unavailable = unavailableLines(cart);
  const priceChanged = linesWithPriceChange(cart);
  const postalDigits = onlyDigits(form.address.postalCode);
  const shippingMatchesAddress = shipping.postalCode !== null && shipping.postalCode === postalDigits;
  const selectedRate = shippingMatchesAddress ? shipping.rates.find((r) => r.id === shipping.selectedRateId) : undefined;

  const addressRevealed = lookupStatus !== "idle" && lookupStatus !== "loading";
  // Campos de endereço só aparecem após o CEP; antes disso, o resumo aponta apenas para o CEP.
  const visibleErrors = form.errorList.filter(
    (error) => addressRevealed || !error.key.startsWith("address.") || error.key === "address.postalCode",
  );
  const readyToPay = form.isValid && Boolean(selectedRate) && !unavailable.length && !priceChanged.length;

  const blockers = [
    unavailable.length ? "Remova os itens indisponíveis do pedido." : null,
    priceChanged.length ? "Confirme os novos preços dos itens." : null,
    form.addressValid && !selectedRate ? "Escolha uma opção de entrega disponível para o seu CEP." : null,
  ].filter((b): b is string => Boolean(b));

  // Foco após renderizar: resumo de erros ou área de pagamento.
  useEffect(() => {
    if (!focusTarget) return;
    document.getElementById(focusTarget.id)?.focus();
  }, [focusTarget]);

  useEffect(() => {
    if (payment.status === "ready") paymentHeadingRef.current?.focus();
  }, [payment.status]);

  const contactId = (field: string) => fieldId(`contact.${field}` as FieldKey);
  const addressId = (field: string) => fieldId(`address.${field}` as FieldKey);

  async function handleAddressChange(field: Parameters<typeof form.updateAddress>[0], value: string) {
    form.updateAddress(field, value);
    if (field !== "postalCode") return;
    const digits = onlyDigits(value);
    if (digits.length !== 8) {
      lastLookup.current = null;
      return;
    }
    if (digits === lastLookup.current) return;
    lastLookup.current = digits;
    setLookupStatus("loading");
    const result = await actions.lookupPostalCode(digits);
    if (lastLookup.current !== digits) return;
    if (result === "error") setLookupStatus("error");
    else if (result) {
      form.fillFromPostalCode(result);
      setLookupStatus("found");
    } else setLookupStatus("not_found");
    const resolved = result && result !== "error" ? result : null;
    await actions.estimateShipping({
      postalCode: digits,
      state: resolved?.state ?? form.address.state,
      city: resolved?.city ?? form.address.city,
    });
  }

  function retryShipping() {
    void actions.estimateShipping({ postalCode: postalDigits, state: form.address.state, city: form.address.city });
  }

  async function handleContinue() {
    const firstInvalid = form.revealErrors();
    if (firstInvalid) {
      setFocusTarget({ id: "checkout-error-summary", tick: Date.now() });
      return;
    }
    if (blockers.length) {
      setShowBlockers(true);
      setFocusTarget({ id: "checkout-blockers", tick: Date.now() });
      return;
    }
    setShowBlockers(false);
    await actions.preparePayment(form.toPayload());
  }

  async function handleDemoOutcome(outcome: DemoOutcome) {
    // Simulação existe somente para tentativas demonstrativas.
    if (payment.status !== "ready" || !payment.attempt.isDemo) return;
    await simulateDemoPaymentOutcome(payment.attempt.id, outcome);
    if (outcome === "declined") actions.reportPaymentDeclined(DECLINE_MESSAGE);
    else router.push(confirmationUrl(payment.attempt.id));
  }

  async function removeUnavailable() {
    for (const line of unavailable) await actions.removeLine(line.id);
  }

  const summaryProps: OrderSummaryProps = {
    cart,
    quote,
    locked,
    recalculating: controller.recalculating,
    pendingLines: controller.pendingLines,
    lineErrors: controller.lineErrors,
    coupon: controller.coupon,
    onQuantityChange: (lineId, quantity) => void actions.updateQuantity(lineId, quantity),
    onRemoveLine: (lineId) => void actions.removeLine(lineId),
    onApplyCoupon: actions.applyCoupon,
    onRemoveCoupon: () => void actions.removeCoupon(),
  };

  const editButton = locked ? (
    <Button variant="ghost" size="sm" onClick={actions.resetPayment} disabled={payment.status === "preparing"}>
      <Pencil className="size-3.5" aria-hidden="true" />
      Alterar
    </Button>
  ) : null;

  return (
    <BrandTheme color={storefront.appearance.primaryColor} className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Pular para o formulário
      </a>
      <DemoStrip current={cartToken} demo={cart.isDemo} />
      <CheckoutHeader storefront={storefront} />
      <MobileSummary {...summaryProps} />

      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
          <div className="min-w-0 space-y-5">
            <h1 className="sr-only">Finalizar compra</h1>

            <CartNotices
              unavailable={unavailable}
              priceChanged={priceChanged}
              acknowledging={controller.acknowledging}
              removing={unavailable.some((l) => controller.pendingLines[l.id])}
              onRemoveUnavailable={() => void removeUnavailable()}
              onAcknowledgePrices={() => void actions.acknowledgePriceChanges()}
            />

            {visibleErrors.length ? (
              <div id="checkout-error-summary" tabIndex={-1} className="rounded-[var(--radius-control)] outline-none">
                <Callout tone="danger" role="alert" title="Confira os campos destacados">
                  <ul className="mt-1 space-y-0.5">
                    {visibleErrors.map((error) => (
                      <li key={error.key}>
                        <a href={`#${fieldId(error.key)}`} className="underline underline-offset-2 hover:text-ink">
                          {error.message}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Callout>
              </div>
            ) : null}

            <CheckoutStep
              id="step-contact"
              number={1}
              title="Seus dados"
              description={locked ? undefined : "Para enviar a confirmação e falar com você sobre a entrega."}
              state={locked ? "complete" : "active"}
              action={editButton}
            >
              {locked ? (
                <div className="grid gap-1 text-sm text-ink-soft">
                  <p className="font-medium text-ink">{form.contact.fullName}</p>
                  <p>{form.contact.email}</p>
                  <p>
                    {formatPhone(form.contact.phone)} · CPF •••.•••.{onlyDigits(form.contact.taxId).slice(6, 9)}-••
                  </p>
                </div>
              ) : (
                <ContactFields
                  values={form.contact}
                  errors={form.contactErrors}
                  idFor={contactId}
                  onChange={(field, value) => form.updateContact(field, value)}
                  onBlur={(field) => form.touch(`contact.${field}` as FieldKey)}
                />
              )}
            </CheckoutStep>

            <CheckoutStep
              id="step-delivery"
              number={2}
              title="Entrega"
              description={locked ? undefined : "Endereço de entrega e prazo."}
              state={locked ? "complete" : "active"}
              action={editButton}
            >
              {locked ? (
                <div className="text-sm text-ink-soft">
                  <p className="text-ink">
                    {form.address.street}, {form.address.number}
                    {form.address.complement ? ` · ${form.address.complement}` : ""}
                  </p>
                  <p>
                    {form.address.neighborhood} · {form.address.city}/{form.address.state} · CEP {form.address.postalCode}
                  </p>
                  {selectedRate ? (
                    <p className="mt-2">
                      <span className="font-medium text-ink">{selectedRate.title}</span> ·{" "}
                      {formatDeliveryEstimate(selectedRate.deliveryEstimate.minBusinessDays, selectedRate.deliveryEstimate.maxBusinessDays)}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-6">
                  <AddressFields
                    values={form.address}
                    errors={form.addressErrors}
                    idFor={addressId}
                    lookupStatus={lookupStatus}
                    onChange={(field, value) => void handleAddressChange(field, value)}
                    onBlur={(field) => form.touch(`address.${field}` as FieldKey)}
                  />
                  <ShippingOptions
                    options={shipping}
                    postalCodeReady={shippingMatchesAddress}
                    request={controller.shippingRequest}
                    onSelect={(rateId) => void actions.selectShippingRate(rateId)}
                    onRetry={retryShipping}
                  />
                </div>
              )}
            </CheckoutStep>

            <CheckoutStep
              id="step-payment"
              number={3}
              title="Pagamento"
              description={
                payment.status === "ready"
                  ? undefined
                  : readyToPay
                    ? "Tudo pronto. Continue para pagar com segurança."
                    : "Liberado após preencher seus dados e escolher a entrega."
              }
              state={payment.status === "ready" ? "active" : "locked"}
            >
              {payment.status === "ready" ? (
                <div className="space-y-4">
                  <div
                    ref={paymentHeadingRef}
                    tabIndex={-1}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-muted px-4 py-3 outline-none"
                  >
                    <div>
                      <p className="text-[13px] text-ink-muted">Total a pagar</p>
                      <p className="text-xl font-semibold tracking-[-0.02em] text-ink tabular-nums">{formatMoney(payment.attempt.amount)}</p>
                    </div>
                    <Badge tone="info" dot>
                      Aguardando pagamento
                    </Badge>
                  </div>

                  {payment.declineMessage ? (
                    <Callout tone="danger" role="alert" title="Pagamento recusado">
                      {payment.declineMessage}
                    </Callout>
                  ) : null}

                  <WhopCheckoutSlot
                    session={payment.attempt.session}
                    prefillEmail={form.contact.email}
                    accentColor={storefront.appearance.primaryColor}
                    onComplete={() => router.push(confirmationUrl(payment.attempt.id))}
                    onPaymentError={(error) => actions.reportPaymentDeclined(error.message || DECLINE_MESSAGE)}
                    onDemoOutcome={handleDemoOutcome}
                  />

                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    O pedido só é confirmado depois que o pagamento for aprovado. Você verá o status atualizado na próxima tela.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {showBlockers && blockers.length ? (
                    <div id="checkout-blockers" tabIndex={-1} className="outline-none">
                      <Callout tone="warning" role="alert" title="Antes de pagar">
                        <ul className="space-y-0.5">
                          {blockers.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </Callout>
                    </div>
                  ) : null}

                  {payment.status === "error" ? (
                    <Callout tone="danger" role="alert" title="Não foi possível iniciar o pagamento">
                      {payment.message}
                    </Callout>
                  ) : null}

                  <div className="flex items-baseline justify-between gap-3 lg:hidden">
                    <span className="text-sm text-ink-soft">Total</span>
                    <span className="text-lg font-semibold text-ink tabular-nums">{formatMoney(quote.total)}</span>
                  </div>

                  <Button
                    variant="brand"
                    size="lg"
                    fullWidth
                    onClick={() => void handleContinue()}
                    loading={payment.status === "preparing"}
                    loadingLabel="Preparando pagamento seguro…"
                    disabled={controller.recalculating || lookupStatus === "loading"}
                  >
                    <Lock className="size-4" aria-hidden="true" />
                    {payment.status === "error" ? "Tentar novamente" : "Ir para o pagamento"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                  <p className="text-center text-[13px] text-ink-muted">
                    Você informará os dados de pagamento no ambiente seguro da Whop, sem sair desta página.
                  </p>
                </div>
              )}
            </CheckoutStep>
          </div>

          <aside className="sticky top-6 hidden lg:block">
            <SummaryAside {...summaryProps} />
          </aside>
        </div>
      </main>

      <CheckoutFooter storefront={storefront} />
    </BrandTheme>
  );
}
