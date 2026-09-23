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
