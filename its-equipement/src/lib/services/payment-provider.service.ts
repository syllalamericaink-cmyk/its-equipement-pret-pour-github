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

class CinetPayProvider implements PaymentProvider {
  async initiatePayment(_data: {
    amount: number
    currency: string
    reference: string
    orderId: string
    type: string
  }): Promise<{ paymentUrl?: string; providerRef?: string }> {
    return {
      paymentUrl: `https://secure.cinetpay.com/pay/${_data.reference}`,
      providerRef: `cp_${Date.now()}`,
    }
  }

  async verifyPayment(_transactionRef: string): Promise<{
    success: boolean
    amount?: number
    providerRef?: string
  }> {
    return {
      success: true,
      providerRef: _transactionRef,
    }
  }
}

class FedaPayProvider implements PaymentProvider {
  async initiatePayment(_data: {
    amount: number
    currency: string
    reference: string
    orderId: string
    type: string
  }): Promise<{ paymentUrl?: string; providerRef?: string }> {
    return {
      paymentUrl: `https://checkout.fedapay.com/${_data.reference}`,
      providerRef: `fp_${Date.now()}`,
    }
  }

  async verifyPayment(_transactionRef: string): Promise<{
    success: boolean
    amount?: number
    providerRef?: string
  }> {
    return {
      success: true,
      providerRef: _transactionRef,
    }
  }
}

export function createProvider(provider: string): PaymentProvider | null {
  switch (provider.toLowerCase()) {
    case 'cinetpay':
      return new CinetPayProvider()
    case 'fedapay':
      return new FedaPayProvider()
    default:
      return null
  }
}
