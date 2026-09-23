"use client";

import { useMemo, useState } from "react";
import { onlyDigits } from "@/domain/format";
import type { CustomerContact, PostalCodeLookup, ShippingAddress } from "@/domain/types";
import { hasErrors, validateAddress, validateContact, type FieldErrors } from "@/domain/validation";

const EMPTY_CONTACT: CustomerContact = { email: "", fullName: "", phone: "", taxId: "" };

const EMPTY_ADDRESS: ShippingAddress = {
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  countryCode: "BR",
};

/** Ordem de foco usada pelo resumo de erros. */
export const FIELD_ORDER = [
  "contact.email",
  "contact.fullName",
  "contact.phone",
  "contact.taxId",
  "address.postalCode",
  "address.street",
  "address.number",
  "address.complement",
  "address.neighborhood",
  "address.city",
  "address.state",
] as const;

export type FieldKey = (typeof FIELD_ORDER)[number];

export function fieldId(key: FieldKey): string {
  return `checkout-${key.replace(".", "-")}`;
}

function visible<T>(errors: FieldErrors<T>, prefix: string, touched: Record<string, boolean>, all: boolean): FieldErrors<T> {
  const result: FieldErrors<T> = {};
  for (const [field, message] of Object.entries(errors) as [keyof T, string][]) {
    if (all || touched[`${prefix}.${String(field)}`]) result[field] = message;
  }
  return result;
}

/**
 * Estado e validação dos dados do comprador. Os erros aparecem após o campo
 * perder o foco ou quando o comprador tenta avançar para o pagamento.
 */
export function useCheckoutForm() {
  const [contact, setContact] = useState<CustomerContact>(EMPTY_CONTACT);
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const contactErrors = useMemo(() => validateContact(contact), [contact]);
  const addressErrors = useMemo(() => validateAddress(address), [address]);

  function updateContact<K extends keyof CustomerContact>(field: K, value: CustomerContact[K]) {
    setContact((current) => ({ ...current, [field]: value }));
  }

  function updateAddress<K extends keyof ShippingAddress>(field: K, value: ShippingAddress[K]) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  function fillFromPostalCode(lookup: PostalCodeLookup) {
    setAddress((current) => ({
      ...current,
      street: lookup.street,
      neighborhood: lookup.neighborhood,
      city: lookup.city,
      state: lookup.state,
    }));
  }

  function touch(key: FieldKey) {
    setTouched((current) => (current[key] ? current : { ...current, [key]: true }));
  }

  /** Revela todos os erros e devolve a chave do primeiro campo inválido. */
  function revealErrors(): FieldKey | null {
    setShowAll(true);
    return (
      FIELD_ORDER.find((key) => {
        const [group, field] = key.split(".") as ["contact" | "address", string];
        const errors = group === "contact" ? contactErrors : addressErrors;
        return Boolean((errors as Record<string, string | undefined>)[field]);
      }) ?? null
    );
  }

  const errorList = FIELD_ORDER.flatMap((key) => {
    const [group, field] = key.split(".") as ["contact" | "address", string];
    const errors = group === "contact" ? contactErrors : addressErrors;
    const message = (errors as Record<string, string | undefined>)[field];
    return message ? [{ key, message }] : [];
  });

  return {
    contact,
    address,
    contactErrors: visible(contactErrors, "contact", touched, showAll),
    addressErrors: visible(addressErrors, "address", touched, showAll),
    errorList: showAll ? errorList : [],
    contactValid: !hasErrors(contactErrors),
    addressValid: !hasErrors(addressErrors),
    isValid: !hasErrors(contactErrors) && !hasErrors(addressErrors),
    updateContact,
    updateAddress,
    fillFromPostalCode,
    touch,
    revealErrors,
    /** Dados normalizados (somente dígitos) para envio ao servidor. */
    toPayload(): { contact: CustomerContact; address: ShippingAddress } {
      return {
        contact: {
          email: contact.email.trim(),
          fullName: contact.fullName.trim().replace(/\s+/g, " "),
          phone: onlyDigits(contact.phone),
          taxId: onlyDigits(contact.taxId),
        },
        address: { ...address, postalCode: onlyDigits(address.postalCode) },
      };
    },
  };
}

export type CheckoutForm = ReturnType<typeof useCheckoutForm>;
