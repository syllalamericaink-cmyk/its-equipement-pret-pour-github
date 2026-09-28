import { z } from 'zod'

const personalizationDataSchema = z.record(z.string(), z.unknown()).optional()

export const publicOrderItemSchema = z.object({
  productId: z.string().min(1).max(100),
  productSlug: z.string().max(200).optional(),
  productName: z.string().max(200).optional(),
  productSku: z.string().max(100).optional(),
  variantId: z.string().max(100).optional(),
  variantName: z.string().max(200).optional(),
  quantity: z.coerce.number().int().min(1).max(10000),
  // These fields are accepted for backwards compatibility but are never trusted.
  unitPrice: z.coerce.number().finite().nonnegative().optional(),
  lineTotal: z.coerce.number().finite().nonnegative().optional(),
  hasPersonalization: z.boolean().optional().default(false),
  personalizationData: personalizationDataSchema,
})

export const publicOrderSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  clientFirstName: z.string().trim().max(200).optional(),
  clientPhone: z.string().trim().min(6).max(30),
  clientEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  clientType: z.enum(['PARTICULIER', 'ENTREPRISE']),
  companyName: z.string().trim().max(200).optional(),
  companyInfo: z.string().trim().max(2000).optional(),
  requestType: z.enum(['COMMANDE_SIMPLE', 'DEVIS', 'BON_COMMANDE', 'FNE']).default('COMMANDE_SIMPLE'),
  personalizationSummary: z.string().trim().max(5000).optional(),
  city: z.string().trim().min(1).max(200),
  commune: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  deliveryComment: z.string().trim().max(2000).optional(),
  deliveryFee: z.coerce.number().finite().min(0).max(100000000).default(0),
  items: z.array(publicOrderItemSchema).min(1).max(50),
}).superRefine((data, ctx) => {
  if (data.clientType === 'ENTREPRISE' && !data.companyName) {
    ctx.addIssue({ code: 'custom', path: ['companyName'], message: "Le nom de l'entreprise est requis" })
  }
  if (data.requestType !== 'COMMANDE_SIMPLE' && (!data.companyName || !data.companyInfo)) {
    ctx.addIssue({ code: 'custom', path: ['companyInfo'], message: "Les informations de l'entreprise sont requises" })
  }
})

export type PublicOrderInput = z.infer<typeof publicOrderSchema>
