import { onlyDigits } from "./format";
import type { CustomerContact, ShippingAddress } from "./types";

/**
 * Validações de formato para feedback imediato ao comprador.
 * O servidor deve repetir estas validações: nada aqui é confiável por si só.
 */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidTaxId(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function isCompletePostalCode(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function validateContact(contact: CustomerContact): FieldErrors<CustomerContact> {
  const errors: FieldErrors<CustomerContact> = {};
  if (!contact.email.trim()) errors.email = "Informe seu e-mail.";
  else if (!isValidEmail(contact.email)) errors.email = "Confira o e-mail. Exemplo: nome@email.com";

  const name = contact.fullName.trim();
  if (!name) errors.fullName = "Informe seu nome completo.";
  else if (name.split(/\s+/).length < 2) errors.fullName = "Informe nome e sobrenome.";

  if (!contact.phone.trim()) errors.phone = "Informe um celular para contato sobre a entrega.";
  else if (!isValidPhone(contact.phone)) errors.phone = "Celular incompleto. Use DDD + número.";

  if (!contact.taxId.trim()) errors.taxId = "Informe seu CPF para emissão da nota fiscal.";
  else if (!isValidTaxId(contact.taxId)) errors.taxId = "CPF inválido. Confira os números.";

  return errors;
}

export function validateAddress(address: ShippingAddress): FieldErrors<ShippingAddress> {
  const errors: FieldErrors<ShippingAddress> = {};
  if (!address.postalCode.trim()) errors.postalCode = "Informe o CEP.";
  else if (!isCompletePostalCode(address.postalCode)) errors.postalCode = "O CEP deve ter 8 números.";
  if (!address.street.trim()) errors.street = "Informe a rua ou avenida.";
  if (!address.number.trim()) errors.number = "Informe o número (ou \"S/N\").";
  if (!address.neighborhood.trim()) errors.neighborhood = "Informe o bairro.";
  if (!address.city.trim()) errors.city = "Informe a cidade.";
  if (!address.state.trim()) errors.state = "Selecione o estado.";
  else if (!BRAZILIAN_STATES.includes(address.state as (typeof BRAZILIAN_STATES)[number]))
    errors.state = "Estado inválido.";
  return errors;
}

/** checkout.minhaloja.com — exige ao menos um subdomínio e um domínio de topo. */
export function isValidCheckoutHostname(value: string): boolean {
  const host = value.trim().toLowerCase();
  if (host.length > 253) return false;
  const labels = host.split(".");
  if (labels.length < 3) return false;
  return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

/** minha-loja.myshopify.com */
export function isValidMyshopifyDomain(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value.trim().toLowerCase());
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}

/** Fusos aceitos para a operação (Brasil). Compartilhado entre o painel e a validação do servidor. */
export const SUPPORTED_TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (America/Sao_Paulo)" },
  { value: "America/Manaus", label: "Amazonas (America/Manaus)" },
  { value: "America/Recife", label: "Pernambuco (America/Recife)" },
  { value: "America/Noronha", label: "Fernando de Noronha (America/Noronha)" },
] as const;

export type SupportedTimezone = (typeof SUPPORTED_TIMEZONES)[number]["value"];

/** Logotipo enviado pelo painel: data URL de imagem com até 300 KB. */
export const LOGO_MAX_BYTES = 300 * 1024;
export const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;

export function dataUrlByteLength(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && url.hostname.includes(".") && !url.username && !url.password;
  } catch {
    return false;
  }
}
