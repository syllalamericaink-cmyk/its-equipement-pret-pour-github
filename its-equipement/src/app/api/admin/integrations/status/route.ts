/**
 * Diagnostic des intégrations (ADMIN UNIQUEMENT) :
 *
 *   GET /api/admin/integrations/status             → état Telegram + Google Sheets
 *   GET /api/admin/integrations/status?sendTest=1  → envoie en plus un message de test
 *                                                    au chat Telegram configuré
 *
 * Usage pour finaliser la configuration Telegram :
 *   1. Ajouter TELEGRAM_BOT_TOKEN dans les variables d'environnement (Vercel).
 *   2. Envoyer /start au bot depuis le chat qui doit recevoir les commandes.
 *   3. Ouvrir cette route : le chat apparaît dans « chatCandidates » avec son id.
 *   4. Copier cet id dans TELEGRAM_CHAT_ID (Vercel) puis redéployer.
 *   5. Ouvrir la route avec ?sendTest=1 pour vérifier la réception.
 *
 * Google Sheets : renvoie le résultat d'une lecture de test de l'onglet de
 * suivi pour valider le compte de service et le partage du classeur.
 */

import { requireAdmin } from '@/lib/api-auth'
import { success, serverError } from '@/lib/api-response'
import { checkSheetsAccess, isSheetsConfigured } from '@/lib/services/google-sheets.service'
import type { NextRequest } from 'next/server'

const TELEGRAM_API = 'https://api.telegram.org'

type ChatCandidate = { id: string; type: string; name: string }

async function fetchTelegramJson(token: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  return (await res.json()) as {
    ok?: boolean
    description?: string
    result?: unknown
  }
}

function extractChats(result: unknown): ChatCandidate[] {
  const updates = Array.isArray(result) ? result : []
  const chats = new Map<string, ChatCandidate>()
  for (const u of updates) {
    const record = u as Record<string, unknown>
    const message = (record.message ?? record.edited_message ?? record.channel_post ?? record.my_chat_member) as
      | { chat?: { id?: number | string; type?: string; first_name?: string; last_name?: string; title?: string; username?: string } }
      | undefined
    const chat = message?.chat
    if (!chat || chat.id === undefined) continue
    const name =
      chat.title ??
      [chat.first_name, chat.last_name].filter(Boolean).join(' ') ??
      chat.username ??
      ''
    chats.set(String(chat.id), {
      id: String(chat.id),
      type: chat.type ?? 'inconnu',
      name: name || '(sans nom)',
    })
  }
  return Array.from(chats.values())
}

export async function GET(request: NextRequest) {
  try {
    const { error: authError } = await requireAdmin(request)
    if (authError) return authError

    const sendTest = new URL(request.url).searchParams.get('sendTest') === '1'

    // ------------------------- Telegram ---------------------------------
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    const telegram: {
      configured: boolean
      botUsername: string | null
      chatId: string | null
      chatCandidates: ChatCandidate[]
      testMessage?: { success: boolean; detail: string }
      hint: string
    } = {
      configured: Boolean(token && chatId),
      botUsername: null,
      chatId: chatId ?? null,
      chatCandidates: [],
      hint: '',
    }

    if (token) {
      try {
        const me = await fetchTelegramJson(token, 'getMe')
        if (me.ok) {
          const bot = me.result as { username?: string } | undefined
          telegram.botUsername = bot?.username ?? null
        }
      } catch {
        /* token injoignable : chatCandidates restera vide */
      }
      try {
        const updates = await fetchTelegramJson(token, 'getUpdates', { limit: 20 })
        if (updates.ok) {
          telegram.chatCandidates = extractChats(updates.result)
        }
      } catch {
        /* pas grave */
      }
    }

    if (!token) {
      telegram.hint =
        'Ajoutez la variable TELEGRAM_BOT_TOKEN (token fourni par @BotFather) dans Vercel → Settings → Environment Variables, puis redéployez.'
    } else if (!chatId) {
      telegram.hint = telegram.chatCandidates.length
        ? `Copiez le « id » du chat ci-dessous dans TELEGRAM_CHAT_ID (Vercel) puis redéployez.`
        : `Envoyez /start à @${telegram.botUsername ?? 'votre_bot'} depuis votre Telegram, ATTENDEZ ~1 minute puis rechargez cette page : le chat apparaîtra avec son id.`
    } else {
      telegram.hint = 'Telegram configuré. Utilisez ?sendTest=1 pour recevoir un message de test.'
    }

    if (sendTest && token && chatId) {
      try {
        const sent = await fetchTelegramJson(token, 'sendMessage', {
          chat_id: chatId,
          text: '✅ Test de configuration ITS Équipement — les notifications de commandes arriveront ici.',
          disable_web_page_preview: true,
        })
        telegram.testMessage = sent.ok
          ? { success: true, detail: `Message de test remis (message_id ${(sent.result as { message_id?: number })?.message_id})` }
          : { success: false, detail: sent.description ?? 'Échec inconnu' }
      } catch (e) {
        telegram.testMessage = { success: false, detail: e instanceof Error ? e.message : 'Erreur réseau' }
      }
    }

    // ------------------------- Google Sheets ----------------------------
    const sheetsConfigured = isSheetsConfigured()
    const access = await checkSheetsAccess()
    const sheets: {
      configured: boolean
      sheetId: string | null
      tab: string
      access: { success: boolean; detail: string }
      hint: string
    } = {
      configured: sheetsConfigured,
      sheetId: process.env.GOOGLE_SHEET_ID ?? null,
      tab: process.env.GOOGLE_SHEETS_TAB ?? 'Commandes',
      access,
      hint: '',
    }

    if (!sheetsConfigured) {
      sheets.hint =
        'Créez un compte de service Google (Google Cloud Console → API Sheets activée → clé JSON), puis ajoutez GOOGLE_SHEET_ID, GOOGLE_SHEETS_CLIENT_EMAIL et GOOGLE_SHEETS_PRIVATE_KEY dans Vercel et partagez le classeur en Éditeur avec l\'email du compte de service.'
    } else if (access.success) {
      sheets.hint = 'Google Sheets opérationnel : chaque commande et changement de statut sera synchronisé.'
    } else {
      sheets.hint = `Identifiants présents mais accès refusé (${access.detail}). Vérifiez que le classeur est partagé en « Éditeur » avec l'email du compte de service et que l'onglet « ${sheets.tab} » existe.`
    }

    return success({ telegram, sheets })
  } catch {
    return serverError()
  }
}
