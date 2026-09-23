import type { Money } from "./types";

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string) {
  let formatter = formatters.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: currencyCode });
    formatters.set(currencyCode, formatter);
  }
  return formatter;
}

/** Formata um valor em centavos para exibição, ex.: 12990 → "R$ 129,90". */
export function formatMoney(money: Money): string {
  return getFormatter(money.currencyCode).format(money.amount / 100);
}

export function money(amount: number, currencyCode = "BRL"): Money {
  return { amount: Math.round(amount), currencyCode };
}

export function zero(currencyCode: string): Money {
  return { amount: 0, currencyCode };
}

export function isZero(value: Money): boolean {
  return value.amount === 0;
}
