/** Formatação e máscaras de campos brasileiros. Funções puras, sem dependências de UI. */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** 01310100 → 01310-100 */
export function formatPostalCode(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** 11912345678 → (11) 91234-5678 */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** 12345678909 → 123.456.789-09 */
export function formatTaxId(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  const base = parts.join(".");
  return digits.length > 9 ? `${base}-${digits.slice(9)}` : base;
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatDeliveryEstimate(min: number, max: number): string {
  if (min === max) return `${min} ${min === 1 ? "dia útil" : "dias úteis"}`;
  return `${min} a ${max} dias úteis`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
