import type { Cart, CartLine } from "./types";

export function isLineUnavailable(line: CartLine): boolean {
  return line.issues.some((issue) => issue.kind === "unavailable");
}

export function getPriceChange(line: CartLine) {
  const issue = line.issues.find((i) => i.kind === "price_changed");
  return issue?.kind === "price_changed" ? issue : undefined;
}

export function getStockLimit(line: CartLine): number | null {
  if (isLineUnavailable(line)) return 0;
  return line.variant.quantityAvailable;
}

export function purchasableLines(cart: Cart): CartLine[] {
  return cart.lines.filter((line) => !isLineUnavailable(line));
}

export function unavailableLines(cart: Cart): CartLine[] {
  return cart.lines.filter(isLineUnavailable);
}

export function linesWithPriceChange(cart: Cart): CartLine[] {
  return cart.lines.filter((line) => Boolean(getPriceChange(line)));
}

export function itemCount(cart: Cart): number {
  return purchasableLines(cart).reduce((sum, line) => sum + line.quantity, 0);
}
