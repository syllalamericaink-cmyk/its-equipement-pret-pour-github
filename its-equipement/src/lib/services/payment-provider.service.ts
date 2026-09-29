export interface PaymentProvider {
  initiatePayment(data: {
    amount: number
    currency: string
    reference: string
    orderId: string
    type: string
  }): Promise<{ paymentUrl?: string; providerRef?: string }>

  verifyPayment(transactionRef: string): Promise<{
    success: boolean
    amount?: number
    providerRef?: string
  }>
}

class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`Le fournisseur de paiement "${provider}" n'est pas configuré.`)
    this.name = 'ProviderNotConfiguredError'
  }
}

/**
 * IMPORTANT:
 * This project must never manufacture checkout URLs, provider references,
 * or successful verification responses. Real provider adapters must be
 * implemented against the provider's authenticated API before activation.
 */
class UnconfiguredPaymentProvider implements PaymentProvider {
  constructor(private readonly provider: string) {}

  async initiatePayment(_data: {
    amount: number
    currency: string
    reference: string
    orderId: string
    type: string
  }): Promise<{ paymentUrl?: string; providerRef?: string }> {
    throw new ProviderNotConfiguredError(this.provider)
  }

  async verifyPayment(_transactionRef: string): Promise<{
    success: boolean
    amount?: number
    providerRef?: string
  }> {
    throw new ProviderNotConfiguredError(this.provider)
  }
}

export function createProvider(provider: string): PaymentProvider | null {
  const normalized = provider.trim().toLowerCase()

  switch (normalized) {
    case 'cinetpay':
    case 'fedapay':
      return new UnconfiguredPaymentProvider(normalized)
    default:
      return null
  }
}
