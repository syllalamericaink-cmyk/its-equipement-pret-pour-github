/**
 * Suivi des commandes dans Google Sheets.
 *
 * Chaque commande (création + chaque changement de statut) est synchronisée
 * dans un Google Sheet de suivi : nouvelle commande, en traitement, confirmée,
 * expédiée, livrée, etc. La ligne est identifiée par la référence (colonne A)
 * et mise à jour (jamais dupliquée).
 *
 * Configuration (variables d'environnement Vercel) :
 *   GOOGLE_SHEET_ID             — l'ID du sheet (dans son URL)
 *   GOOGLE_SHEETS_CLIENT_EMAIL  — email du compte de service Google
 *   GOOGLE_SHEETS_PRIVATE_KEY   — clé privée du compte de service (\n échappés)
 *   GOOGLE_SHEETS_TAB           — (optionnel) nom de l'onglet, défaut « Commandes »
 *
 * Partage : partager le sheet en « Éditeur » avec l'email du compte de service.
 *
 * Implémentation sans dépendance : JWT RS256 signé avec le module crypto de
 * Node, échangé contre un access token OAuth2, puis API Sheets v4 via fetch.
 * Toute erreur est capturée : la synchronisation ne fait JAMAIS échouer une
 * commande ou un changement de statut.
 */

import { db } from '../db'
import crypto from 'crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

export function isSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
      process.env.GOOGLE_SHEETS_PRIVATE_KEY,
  )
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL as string
  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY as string
  // La clé stockée en variable d'environnement contient souvent des "\n" littéraux
  const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = { iss: clientEmail, scope: SHEETS_SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }

  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(claim)}`
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url')
  const assertion = `${unsigned}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string }
  if (!json.access_token) {
    throw new Error(json.error_description ?? `OAuth Google échoué (${res.status})`)
  }

  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 }
  return json.access_token
}

function sheetTab(): string {
  return process.env.GOOGLE_SHEETS_TAB ?? 'Commandes'
}

const COLUMNS = 12 // A..L

function buildRow(order: {
  orderNumber: string | null
  devisNumber: string | null
  createdAt: Date
  updatedAt: Date
  status: string
  clientName: string
  clientFirstName: string | null
  clientPhone: string
  clientType: string
  companyName: string | null
  requestType: string
  city: string
  commune: string | null
  total: number | string
  items: { productName: string; quantity: number; variantName: string | null }[]
}): string[] {
  const reference = order.orderNumber ?? order.devisNumber ?? 'SANS-REF'
  const articles = order.items
    .map((i) => `${i.quantity}x ${i.productName}${i.variantName ? ` (${i.variantName})` : ''}`)
    .join(' ; ')
    .slice(0, 900)

  return [
    reference,
    new Date(order.createdAt).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
    `${order.clientName}${order.clientFirstName ? ' ' + order.clientFirstName : ''}`.trim(),
    order.clientPhone,
    order.clientType === 'ENTREPRISE' ? 'Entreprise' : 'Particulier',
    order.city,
    order.commune ?? '',
    articles,
    String(Math.round(Number(order.total))),
    order.requestType,
    order.status,
    new Date(order.updatedAt).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }),
  ]
}

/**
 * Synchronise (upsert) la ligne d'une commande dans le Google Sheet.
 * - Ligne absente → ajoutée à la fin.
 * - Ligne existante (même référence en colonne A) → mise à jour (statut, etc.).
 * Appelée en fire-and-forget : ne lève jamais d'exception vers l'appelant.
 */
export async function syncOrderToSheets(orderId: string): Promise<{ success: boolean; error?: string }> {
  if (!isSheetsConfigured()) {
    return { success: false, error: 'Google Sheets non configure' }
  }

  try {
    const order = await db.publicOrder.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order) return { success: false, error: 'Commande introuvable' }

    const token = await getAccessToken()
    const sheetId = process.env.GOOGLE_SHEET_ID as string
    const tab = sheetTab()
    const reference = order.orderNumber ?? order.devisNumber ?? order.id
    const row = buildRow(order as Parameters<typeof buildRow>[0])

    // 1. Chercher la ligne existante par référence (colonne A, à partir de A2)
    const getRes = await fetch(
      `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(`${tab}!A2:A`)}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
    )
    const getData = (await getRes.json()) as { values?: string[][]; error?: { message?: string } }
    if (getData.error) {
      throw new Error(`Lecture sheet: ${getData.error.message ?? getRes.status}`)
    }

    const rows = getData.values ?? []
    const rowIndex = rows.findIndex((r) => r[0] === reference)

    let writeRes: Response
    if (rowIndex >= 0) {
      // 2a. Mise à jour de la ligne existante
      const target = `${tab}!A${rowIndex + 2}:${String.fromCharCode(64 + COLUMNS)}${rowIndex + 2}`
      writeRes = await fetch(
        `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(target)}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [row] }),
          signal: AbortSignal.timeout(10_000),
        },
      )
    } else {
      // 2b. Ajout d'une nouvelle ligne
      writeRes = await fetch(
        `${SHEETS_API}/${sheetId}/values/${encodeURIComponent(`${tab}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [row] }),
          signal: AbortSignal.timeout(10_000),
        },
      )
    }

    if (!writeRes.ok) {
      const errText = await writeRes.text().catch(() => '')
      throw new Error(`Écriture sheet: HTTP ${writeRes.status} ${errText.slice(0, 200)}`)
    }

    return { success: true }
  } catch (e) {
    console.error('[google-sheets] synchronisation échouée:', e instanceof Error ? e.message : e)
    return { success: false, error: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}
