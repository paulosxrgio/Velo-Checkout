"use client";

import { TextField } from "@/components/ui/field";
import { formatPhone, formatTaxId } from "@/domain/format";
import type { CustomerContact } from "@/domain/types";
import type { FieldErrors } from "@/domain/validation";

type ContactField = keyof CustomerContact;

export function ContactFields({
  values,
  errors,
  idFor,
  onChange,
  onBlur,
}: {
  values: CustomerContact;
  errors: FieldErrors<CustomerContact>;
  idFor: (field: ContactField) => string;
  onChange: (field: ContactField, value: string) => void;
  onBlur: (field: ContactField) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={idFor("email")}
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nome@email.com"
        value={values.email}
        onChange={(e) => onChange("email", e.target.value)}
        onBlur={() => onBlur("email")}
        error={errors.email}
        hint="Enviaremos a confirmação e o rastreio para este e-mail."
        containerClassName="sm:col-span-2"
        required
      />
      <TextField
        id={idFor("fullName")}
        label="Nome completo"
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => onChange("fullName", e.target.value)}
        onBlur={() => onBlur("fullName")}
        error={errors.fullName}
        containerClassName="sm:col-span-2"
        required
      />
      <TextField
        id={idFor("phone")}
        label="Celular"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(11) 91234-5678"
        value={values.phone}
        onChange={(e) => onChange("phone", formatPhone(e.target.value))}
        onBlur={() => onBlur("phone")}
        error={errors.phone}
        required
      />
      <TextField
        id={idFor("taxId")}
        label="CPF"
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={values.taxId}
        onChange={(e) => onChange("taxId", formatTaxId(e.target.value))}
        onBlur={() => onBlur("taxId")}
        error={errors.taxId}
        hint="Necessário para a nota fiscal."
        required
      />
    </div>
  );
}
