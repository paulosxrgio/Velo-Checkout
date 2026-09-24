import { z } from "zod";
import { PASSWORD_MAX_LENGTH } from "../auth/password";
import {
  LOGO_DATA_URL_PATTERN,
  LOGO_MAX_BYTES,
  SUPPORTED_TIMEZONES,
  dataUrlByteLength,
  isHttpsUrl,
  isValidCheckoutHostname,
  isValidEmail,
} from "@/domain/validation";

/**
 * Validação das entradas das APIs administrativas.
 * Todos os objetos são `strict`: campos desconhecidos são recusados,
 * evitando que o cliente altere colunas que não deveria (ex.: checkout ativo,
 * estados de verificação ou conexões).
 */

const timezoneValues = SUPPORTED_TIMEZONES.map((tz) => tz.value) as [string, ...string[]];

export const loginInput = z
  .object({
    email: z.string().trim().min(1, "Informe o e-mail.").max(254),
    password: z.string().min(1, "Informe a senha.").max(PASSWORD_MAX_LENGTH),
  })
  .strict();

export const appearanceInput = z
  .object({
    storeName: z.string().trim().min(1, "Informe o nome da loja.").max(60, "Use no máximo 60 caracteres."),
    logoUrl: z
      .string()
      .max(Math.ceil((LOGO_MAX_BYTES * 4) / 3) + 40, "O logotipo deve ter até 300 KB.")
      .regex(LOGO_DATA_URL_PATTERN, "Envie o logotipo em PNG, SVG, JPG ou WebP.")
      .refine((value) => dataUrlByteLength(value) <= LOGO_MAX_BYTES, "O logotipo deve ter até 300 KB.")
      .nullable(),
    primaryColor: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^#[0-9a-f]{6}$/, "Use o formato hexadecimal, como #1f4d3a."),
    supportText: z.string().trim().max(140, "Use no máximo 140 caracteres."),
  })
  .strict();

export const settingsInput = z
  .object({
    environment: z.enum(["sandbox", "production"], "Ambiente inválido."),
    operationName: z.string().trim().min(1, "Informe um nome para a operação.").max(80, "Use no máximo 80 caracteres."),
    alertEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .refine(isValidEmail, "Informe um e-mail válido para alertas."),
    storeUrl: z
      .string()
      .trim()
      .max(200)
      .transform((value) => value.replace(/\/+$/, ""))
      .refine(isHttpsUrl, "Use o endereço completo da loja com https://."),
    /** Somente leitura: definida pela moeda da loja na Shopify. Aceita no corpo, mas ignorada. */
    currencyCode: z.string().optional(),
    timezone: z.enum(timezoneValues, "Fuso horário não suportado."),
  })
  .strict();

export const domainInput = z
  .object({
    hostname: z
      .string()
      .trim()
      .toLowerCase()
      .max(253)
      .refine(isValidCheckoutHostname, "Informe um subdomínio completo, como checkout.minhaloja.com.")
      .refine((value) => !value.endsWith(".myshopify.com"), "Use um subdomínio do domínio da marca, não o domínio myshopify.com."),
  })
  .strict();

export type AppearanceInput = z.infer<typeof appearanceInput>;
export type SettingsInput = z.infer<typeof settingsInput>;
