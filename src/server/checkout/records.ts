import { z } from "zod";

/**
 * Formato dos campos JSON gravados nas tabelas de checkout.
 *
 * Nesta etapa ninguém escreve nessas tabelas: os formatos existem para que o
 * repasse de carrinho, a cotação e a criação de tentativas (próximas etapas)
 * gravem dados que o painel já sabe ler. Valores monetários em centavos.
 */

export const storedCustomerSchema = z.object({
  fullName: z.string(),
  phone: z.string().optional(),
  taxId: z.string().optional(),
});

export const storedAddressSchema = z.object({
  postalCode: z.string(),
  street: z.string(),
  number: z.string(),
  complement: z.string().default(""),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  countryCode: z.literal("BR"),
});

export const storedQuoteLineSchema = z.object({
  variantId: z.string(),
  title: z.string(),
  variantTitle: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  lineTotal: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
});

export const storedShippingRateSchema = z.object({
  id: z.string(),
  title: z.string(),
  minBusinessDays: z.number().int().nonnegative(),
  maxBusinessDays: z.number().int().nonnegative(),
  price: z.number().int().nonnegative(),
});

export type StoredCustomer = z.infer<typeof storedCustomerSchema>;
export type StoredAddress = z.infer<typeof storedAddressSchema>;
export type StoredQuoteLine = z.infer<typeof storedQuoteLineSchema>;
export type StoredShippingRate = z.infer<typeof storedShippingRateSchema>;
