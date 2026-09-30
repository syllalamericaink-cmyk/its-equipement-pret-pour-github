import { db } from '../db'
import type { Prisma } from '@prisma/client'

const cache = new Map<string, { value: string; fetchedAt: number }>()
const CACHE_TTL = 60_000

export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.value
  }
  const setting = await db.setting.findUnique({ where: { key } })
  const value = setting?.value ?? null
  if (value !== null) {
    cache.set(key, { value, fetchedAt: Date.now() })
  }
  return value
}

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key)
  if (value === null) return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

export async function getAllSettings(category?: string) {
  return db.setting.findMany({
    where: category ? { category } : undefined,
    orderBy: { key: 'asc' },
  })
}

export async function upsertSetting(data: { key: string; value: string; type: string; label: string; category?: string }) {
  cache.delete(data.key)
  return db.setting.upsert({
    where: { key: data.key },
    update: { value: data.value, type: data.type, label: data.label, category: data.category },
    create: data,
  })
}

export async function bulkUpsertSettings(settings: { key: string; value: string; type: string; label: string; category?: string }[]) {
  const results: Awaited<ReturnType<typeof upsertSetting>>[] = []
  for (const s of settings) {
    const result = await upsertSetting(s)
    results.push(result)
  }
  return results
}

export function clearCache() {
  cache.clear()
}

export async function getQuoteValidityDays(): Promise<number> {
  return getSettingNumber('QUOTE_VALIDITY_DAYS', 30)
}

export async function getTvaRate(): Promise<number> {
  // Taux de TVA ivoirien : 18 % (source de vérité : setting TVA_RATE en base)
  return getSettingNumber('TVA_RATE', 0.18)
}

export async function getDepositPercentage(): Promise<number> {
  return getSettingNumber('DEPOSIT_PERCENTAGE', 50)
}

export async function getBalancePercentage(): Promise<number> {
  return getSettingNumber('BALANCE_PERCENTAGE', 50)
}

/**
 * Numéro WhatsApp du commercial (destinataire des notifications).
 * Source unique de vérité, utilisée par TOUS les flux (commande web, devis,
 * commande depuis devis) : 1) réglages admin en base, 2) variable
 * d'environnement, 3) null.
 */
export async function getWhatsAppRecipient(): Promise<string | null> {
  const dbValue = await getSetting('WHATSAPP_RECIPIENT_NUMBER')
  if (dbValue && dbValue.trim()) return dbValue.trim()
  const envValue = process.env.WHATSAPP_RECIPIENT_NUMBER
  if (envValue && envValue.trim()) return envValue.trim()
  return null
}

