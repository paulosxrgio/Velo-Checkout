"use client";

import { useCallback, useRef, useState } from "react";
import { getCheckoutGateway, toGatewayError, type CheckoutState } from "@/data";
import type { CustomerContact, PaymentAttempt, PostalCodeLookup, ShippingAddress } from "@/domain/types";
import { useResource } from "@/lib/use-resource";

export type PaymentState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready"; attempt: PaymentAttempt; declineMessage: string | null }
  | { status: "error"; message: string };

export type CouponState = { status: "idle" | "applying" | "removing"; error: string | null };

export type ShippingRequestState = { status: "idle" | "loading" | "selecting" | "error"; error: string | null };

/**
 * Orquestra o checkout do comprador sobre o `CheckoutGateway`.
 *
 * Todas as mutações do carrinho passam por uma fila para que respostas fora de
 * ordem nunca sobrescrevam um estado mais recente. Totais sempre vêm do
 * servidor (via gateway); o cliente não recalcula preços.
 */
export function useCheckout(cartToken: string | null) {
  // Resolvido a cada uso: configuração inválida vira erro tratado, nunca uma queda da tela.
  const gateway = () => getCheckoutGateway({ cartToken });
  const resource = useResource<CheckoutState>(`checkout:${cartToken ?? ""}`, async () => gateway().getCheckout(cartToken ?? ""));
  const { setData } = resource;
  const cartId = resource.data?.cart.id ?? null;

  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [recalculating, setRecalculating] = useState(0);
  const [pendingLines, setPendingLines] = useState<Record<string, boolean>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle", error: null });
  const [shippingRequest, setShippingRequest] = useState<ShippingRequestState>({ status: "idle", error: null });
  const [acknowledging, setAcknowledging] = useState(false);
  const [payment, setPayment] = useState<PaymentState>({ status: "idle" });

  const enqueue = useCallback(<T,>(task: () => Promise<T>, affectsQuote = true): Promise<T> => {
    if (affectsQuote) setRecalculating((n) => n + 1);
    const run = queueRef.current.then(task, task);
    queueRef.current = run.catch(() => undefined);
    return run.finally(() => {
      if (affectsQuote) setRecalculating((n) => n - 1);
    });
  }, []);

  const mutate = useCallback(
    async (task: (cartId: string) => Promise<CheckoutState>) => {
      if (!cartId) return;
      const next = await enqueue(() => task(cartId));
      setData(next);
    },
    [cartId, enqueue, setData],
  );

  const setLinePending = (lineId: string, pending: boolean) =>
    setPendingLines((current) => {
      const next = { ...current };
      if (pending) next[lineId] = true;
      else delete next[lineId];
      return next;
    });

  const setLineError = (lineId: string, message: string | null) =>
    setLineErrors((current) => {
      const next = { ...current };
      if (message) next[lineId] = message;
      else delete next[lineId];
      return next;
    });

  async function updateQuantity(lineId: string, quantity: number) {
    setLinePending(lineId, true);
    setLineError(lineId, null);
    try {
      await mutate((id) => gateway().updateLineQuantity({ cartId: id, lineId, quantity }));
    } catch (error) {
      setLineError(lineId, toGatewayError(error).message);
    } finally {
      setLinePending(lineId, false);
    }
  }

  async function removeLine(lineId: string) {
    setLinePending(lineId, true);
    setLineError(lineId, null);
    try {
      await mutate((id) => gateway().removeLine({ cartId: id, lineId }));
    } catch (error) {
      setLineError(lineId, toGatewayError(error).message);
    } finally {
      setLinePending(lineId, false);
    }
  }

  async function acknowledgePriceChanges() {
    setAcknowledging(true);
    try {
      await mutate((id) => gateway().acknowledgePriceChanges(id));
    } finally {
      setAcknowledging(false);
    }
  }

  async function applyCoupon(code: string): Promise<boolean> {
    if (!code.trim()) {
      setCoupon({ status: "idle", error: "Digite o código do cupom." });
      return false;
    }
    setCoupon({ status: "applying", error: null });
    try {
      await mutate((id) => gateway().applyCoupon({ cartId: id, code }));
      setCoupon({ status: "idle", error: null });
      return true;
    } catch (error) {
      setCoupon({ status: "idle", error: toGatewayError(error).message });
      return false;
    }
  }

  async function removeCoupon() {
    setCoupon({ status: "removing", error: null });
    try {
      await mutate((id) => gateway().removeCoupon(id));
      setCoupon({ status: "idle", error: null });
    } catch (error) {
      setCoupon({ status: "idle", error: toGatewayError(error).message });
    }
  }

  const latestPostalCode = useRef<string | null>(null);

  async function lookupPostalCode(postalCode: string): Promise<PostalCodeLookup | null | "error"> {
    latestPostalCode.current = postalCode;
    try {
      const result = await gateway().lookupPostalCode(postalCode);
      return latestPostalCode.current === postalCode ? result : null;
    } catch {
      return "error";
    }
  }

  async function estimateShipping(address: Pick<ShippingAddress, "postalCode" | "state" | "city">) {
    setShippingRequest({ status: "loading", error: null });
    try {
      await mutate((id) => gateway().estimateShipping({ cartId: id, address }));
      setShippingRequest({ status: "idle", error: null });
    } catch (error) {
      setShippingRequest({ status: "error", error: toGatewayError(error).message });
    }
  }

  async function selectShippingRate(rateId: string) {
    setShippingRequest({ status: "selecting", error: null });
    try {
      await mutate((id) => gateway().selectShippingRate({ cartId: id, rateId }));
      setShippingRequest({ status: "idle", error: null });
    } catch (error) {
      setShippingRequest({ status: "error", error: toGatewayError(error).message });
    }
  }

  async function preparePayment(input: { contact: CustomerContact; address: ShippingAddress }) {
    const state = resource.data;
    if (!state) return;
    setPayment({ status: "preparing" });
    try {
      const attempt = await enqueue(
        () => gateway().createPaymentAttempt({ cartId: state.cart.id, quoteId: state.quote.id, ...input }),
        false,
      );
      setPayment({ status: "ready", attempt, declineMessage: null });
    } catch (error) {
      setPayment({ status: "error", message: toGatewayError(error).message });
    }
  }

  /** Descarta a sessão atual para permitir editar dados; uma nova será criada ao continuar. */
  function resetPayment() {
    setPayment({ status: "idle" });
  }

  function reportPaymentDeclined(message: string) {
    setPayment((current) => (current.status === "ready" ? { ...current, declineMessage: message } : current));
  }

  return {
    resource,
    recalculating: recalculating > 0,
    pendingLines,
    lineErrors,
    coupon,
    shippingRequest,
    acknowledging,
    payment,
    actions: {
      updateQuantity,
      removeLine,
      acknowledgePriceChanges,
      applyCoupon,
      removeCoupon,
      lookupPostalCode,
      estimateShipping,
      selectShippingRate,
      preparePayment,
      resetPayment,
      reportPaymentDeclined,
    },
  };
}

export type CheckoutController = ReturnType<typeof useCheckout>;
