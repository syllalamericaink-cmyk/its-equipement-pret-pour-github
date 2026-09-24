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

export async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key)
  if (value === null) return defaultValue
  return value === 'true'
}

export async function getAllSettings(category?: string) {
  return db.setting.findMany({
    where: category ? { category } : undefined,
    orderBy: { key: 'asc' },
  })
}

export async function updateSetting(key: string, value: string) {
  cache.delete(key)
  return db.setting.update({
    where: { key },
    data: { value },
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
  return getSettingNumber('TVA_RATE', 0.20)
}

export async function getDepositPercentage(): Promise<number> {
  return getSettingNumber('DEPOSIT_PERCENTAGE', 50)
}

export async function getBalancePercentage(): Promise<number> {
  return getSettingNumber('BALANCE_PERCENTAGE', 50)
}

export async function getWhatsAppNumber(): Promise<string> {
  return (await getSetting('WHATSAPP_NUMBER')) ?? ''
}

export type SettingWithCategory = Prisma.PromiseReturnType<typeof getAllSettings>[number]
