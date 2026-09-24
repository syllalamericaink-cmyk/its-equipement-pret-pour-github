import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis').max(128),
})

export const clientSchema = z.object({
  companyName: z.string().min(1, 'Raison sociale requise').max(200),
  contactName: z.string().min(1, 'Nom du contact requis').max(200),
  email: z.string().email('Email invalide').max(200),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const personalizationOptionConfigSchema = z.object({
  maxTextLength: z.number().int().positive().optional(),
  acceptedFileTypes: z.array(z.string()).optional(),
  maxFileSizeMB: z.number().positive().optional(),
  locations: z.array(z.object({
    id: z.string(),
    label: z.string(),
    enabled: z.boolean(),
  })).optional(),
  printPricing: z.object({
    logo: z.number().nonnegative(),
    text: z.number().nonnegative(),
    combined: z.number().nonnegative(),
  }).optional(),
})

export const personalizationOptionSchema = z.object({
  type: z.enum(['logo', 'text']),
  label: z.string().min(1).max(200),
  isRequired: z.boolean().optional(),
  config: personalizationOptionConfigSchema.optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

export const personalizationValueSchema = z.object({
  logoFileId: z.string().max(100).optional(),
  logoFileName: z.string().max(200).optional(),
  text: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  additionalNotes: z.string().max(500).optional(),
})

export const quoteRequestItemSchema = z.object({
  productId: z.string().min(1),
  productVariantId: z.string().optional(),
  quantity: z.number().int().positive().max(10000),
  hasPersonalization: z.boolean(),
  personalizations: z.array(z.object({
    optionId: z.string().min(1),
    value: personalizationValueSchema,
  })).optional(),
})

export const quoteRequestSchema = z.object({
  client: clientSchema,
  items: z.array(quoteRequestItemSchema).min(1, 'Ajoutez au moins un produit').max(50),
  notes: z.string().max(5000).optional(),
})

export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(50000),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']),
  label: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
})

export const productVariantSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(100).optional(),
  priceModifier: z.number().nonnegative().max(99999999),
  stock: z.number().int().min(0),
  alertThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const productImageSchema = z.object({
  url: z.string().url().max(1000),
  altText: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  slug: z.string().min(1, 'Slug requis').max(200),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().max(1000).optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export const productSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(200),
  slug: z.string().min(1, 'Slug requis').max(200),
  description: z.string().min(1, 'Description requise').max(10000),
  sku: z.string().min(1, 'SKU requis').max(100),
  basePrice: z.number().nonnegative().max(99999999),
  categoryId: z.string().min(1, 'Categorie requise'),
  isPersonalizable: z.boolean(),
  minQuantity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

export const quoteItemSchema = z.object({
  productId: z.string().min(1),
  productVariantId: z.string().optional(),
  productName: z.string().min(1).max(200),
  unitPrice: z.number().nonnegative().max(99999999),
  quantity: z.number().int().positive().max(10000),
  hasPersonalization: z.boolean().optional(),
  personalizations: z.array(z.object({
    optionId: z.string().min(1),
    value: personalizationValueSchema,
  })).max(10).optional(),
})

export const quoteCreateSchema = z.object({
  quoteRequestId: z.string().min(1),
  items: z.array(quoteItemSchema).min(1),
  discountAmount: z.number().nonnegative().optional(),
  tvaRate: z.number().min(0).max(1).optional(),
  conditions: z.string().max(5000).optional(),
})

export const quoteUpdateSchema = z.object({
  items: z.array(quoteItemSchema).min(1).optional(),
  discountAmount: z.number().nonnegative().optional(),
  tvaRate: z.number().min(0).max(1).optional(),
  conditions: z.string().max(5000).optional(),
  validUntil: z.string().optional(),
})

export const statusChangeSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
})

export const quoteRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  adminNotes: z.string().max(5000).optional(),
})

export const quoteStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']),
})

export const orderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'ACOMPTE_RECU', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAIEMENT_A_LIVRAISON']),
  notes: z.string().max(2000).optional(),
})

export const paymentCreateSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(['DEPOSIT', 'BALANCE', 'FULL']),
  amount: z.number().nonnegative().max(999999999),
  method: z.string().max(100).optional(),
  provider: z.string().max(100).optional(),
  transactionRef: z.string().max(200).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export const paymentUpdateSchema = z.object({
  status: z.enum(['EN_ATTENTE', 'PAYE', 'ECHEC', 'ANNULE', 'REMBOURSE']).optional(),
  amount: z.number().nonnegative().optional(),
  method: z.string().max(100).optional(),
  provider: z.string().max(100).optional(),
  providerRef: z.string().max(200).optional(),
  transactionRef: z.string().max(200).optional(),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  receiptUrl: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})

export const deliveryCreateSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().max(200).optional(),
  carrier: z.string().max(200).optional(),
  deliveryPerson: z.string().max(200).optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  shippingFees: z.number().nonnegative().optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export const deliveryUpdateSchema = z.object({
  status: z.enum(['A_PREPARER', 'PRETE', 'EN_LIVRAISON', 'LIVREE']).optional(),
  trackingNumber: z.string().max(200).optional(),
  carrier: z.string().max(200).optional(),
  deliveryPerson: z.string().max(200).optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  shippingFees: z.number().nonnegative().optional(),
  estimatedDelivery: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

export const deliveryStatusSchema = z.object({
  status: z.enum(['A_PREPARER', 'PRETE', 'EN_LIVRAISON', 'LIVREE']),
})

export const stockMovementSchema = z.object({
  productVariantId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'RESERVATION', 'RELEASE', 'ADJUSTMENT']),
  quantity: z.number().int().positive().max(100000),
  reason: z.string().max(500).optional(),
})

export const clientUpdateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export const settingsBulkUpdateSchema = z.object({
  settings: z.array(settingSchema),
})

export const quoteRequestUpdateSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED']).optional(),
  adminNotes: z.string().max(5000).optional(),
})
