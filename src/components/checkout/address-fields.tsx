"use client";

import { SelectField, TextField } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { formatPostalCode } from "@/domain/format";
import type { ShippingAddress } from "@/domain/types";
import { BRAZILIAN_STATES, type FieldErrors } from "@/domain/validation";

type AddressField = Exclude<keyof ShippingAddress, "countryCode">;

export type PostalLookupStatus = "idle" | "loading" | "found" | "not_found" | "error";

const lookupHints: Record<PostalLookupStatus, string | undefined> = {
  idle: undefined,
  loading: "Buscando endereço…",
  found: "Endereço preenchido pelo CEP. Confira os dados.",
  not_found: "Não encontramos este CEP. Preencha o endereço abaixo.",
  error: "Não foi possível buscar o CEP agora. Preencha o endereço abaixo.",
};

export function AddressFields({
  values,
  errors,
  idFor,
  lookupStatus,
  onChange,
  onBlur,
}: {
  values: ShippingAddress;
  errors: FieldErrors<ShippingAddress>;
  idFor: (field: AddressField) => string;
  lookupStatus: PostalLookupStatus;
  onChange: (field: AddressField, value: string) => void;
  onBlur: (field: AddressField) => void;
}) {
  const revealAddress = lookupStatus !== "idle" && lookupStatus !== "loading";

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <TextField
        id={idFor("postalCode")}
        label="CEP"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="00000-000"
        value={values.postalCode}
        onChange={(e) => onChange("postalCode", formatPostalCode(e.target.value))}
        onBlur={() => onBlur("postalCode")}
        error={errors.postalCode}
        hint={lookupHints[lookupStatus]}
        trailing={lookupStatus === "loading" ? <Spinner className="size-4" label="Buscando endereço pelo CEP" /> : undefined}
        containerClassName="sm:col-span-3"
        required
      />

      {revealAddress ? (
        <>
          <TextField
            id={idFor("street")}
            label="Rua ou avenida"
            autoComplete="address-line1"
            value={values.street}
            onChange={(e) => onChange("street", e.target.value)}
            onBlur={() => onBlur("street")}
            error={errors.street}
            containerClassName="sm:col-span-6"
            required
          />
          <TextField
            id={idFor("number")}
            label="Número"
            inputMode="text"
            autoComplete="address-line2"
            value={values.number}
            onChange={(e) => onChange("number", e.target.value)}
            onBlur={() => onBlur("number")}
            error={errors.number}
            containerClassName="sm:col-span-2"
            required
          />
          <TextField
            id={idFor("complement")}
            label="Complemento"
            optional
            autoComplete="address-line3"
            placeholder="Apto, bloco, referência"
            value={values.complement}
            onChange={(e) => onChange("complement", e.target.value)}
            onBlur={() => onBlur("complement")}
            containerClassName="sm:col-span-4"
          />
          <TextField
            id={idFor("neighborhood")}
            label="Bairro"
            value={values.neighborhood}
            onChange={(e) => onChange("neighborhood", e.target.value)}
            onBlur={() => onBlur("neighborhood")}
            error={errors.neighborhood}
            containerClassName="sm:col-span-6"
            required
          />
          <TextField
            id={idFor("city")}
            label="Cidade"
            autoComplete="address-level2"
            value={values.city}
            onChange={(e) => onChange("city", e.target.value)}
            onBlur={() => onBlur("city")}
            error={errors.city}
            containerClassName="sm:col-span-4"
            required
          />
          <SelectField
            id={idFor("state")}
            label="Estado"
            autoComplete="address-level1"
            value={values.state}
            onChange={(e) => onChange("state", e.target.value)}
            onBlur={() => onBlur("state")}
            error={errors.state}
            containerClassName="sm:col-span-2"
            required
          >
            <option value="" disabled>
              UF
            </option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </SelectField>
        </>
      ) : null}
    </div>
  );
}
