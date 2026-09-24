type WhatsAppResult = {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsAppMessage(to: string, message: string, components?: unknown): Promise<WhatsAppResult> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v21.0'

    if (!accessToken || !phoneNumberId) {
      return { success: false, error: 'Configuration WhatsApp manquante' }
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

    let body: Record<string, unknown>
    if (components) {
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        components,
      }
    } else {
      body = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error?.message ?? `Erreur API WhatsApp (${response.status})`
      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id
    return { success: true, messageId }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inattendue WhatsApp'
    return { success: false, error: errorMsg }
  }
}
