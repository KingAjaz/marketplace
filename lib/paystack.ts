/**
 * Paystack Payment Integration
 * Handles payment initialization and verification
 */
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || ''

export interface InitializePaymentData {
  email: string
  amount: number // in kobo (Naira * 100)
  reference: string
  metadata?: Record<string, any>
  callback_url?: string // URL to redirect to after payment
}

export interface PaystackResponse {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface VerifyPaymentResponse {
  status: boolean
  message: string
  data?: {
    status: string
    reference: string
    amount: number
    customer: {
      email: string
    }
    metadata?: Record<string, any>
  }
}

/**
 * Initialize Paystack payment
 * @param data Payment initialization data
 * @returns Paystack API response
 */
export async function initializePaystackPayment(
  data: InitializePaymentData
): Promise<PaystackResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured')
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      amount: data.amount,
      reference: data.reference,
      metadata: data.metadata,
      callback_url: data.callback_url,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to initialize payment' }))
    throw new Error(error.message || 'Failed to initialize payment')
  }

  return response.json()
}

/**
 * Verify Paystack payment
 * @param reference Payment reference from Paystack
 * @returns Paystack verification response
 */
export async function verifyPaystackPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured')
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to verify payment' }))
    throw new Error(error.message || 'Failed to verify payment')
  }

  return response.json()
}

/**
 * Get Paystack public key (for client-side use)
 */
export function getPaystackPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY
}

/**
 * Refund a Paystack transaction
 * @param transactionReference The Paystack transaction reference (paystackRef)
 * @param amount Optional amount to refund in kobo. If not provided, full refund is processed.
 * @param reason Optional reason for the refund
 * @returns Paystack refund response
 */
export interface RefundResponse {
  status: boolean
  message: string
  data?: {
    id: number
    transaction: number
    amount: number
    currency: string
    status: string // 'pending' | 'processing' | 'needs-attention' | 'failed' | 'processed'
    refunded_at: string | null
    expected_at: string
    customer_note: string
    merchant_note: string
  }
}

export async function refundPaystackTransaction(
  transactionReference: string,
  amount?: number, // in kobo (Naira * 100), optional for full refund
  reason?: string
): Promise<RefundResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured')
  }

  const payload: any = {
    transaction: transactionReference,
  }

  // Add amount for partial refund
  if (amount !== undefined) {
    payload.amount = amount
  }

  // Add customer note if reason provided
  if (reason) {
    payload.customer_note = reason
    payload.merchant_note = reason
  }

  const response = await fetch('https://api.paystack.co/refund', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to process refund' }))
    throw new Error(error.message || 'Failed to process refund')
  }

  return response.json()
}

/**
 * Get refund status from Paystack
 * @param refundId The Paystack refund ID
 * @returns Refund status response
 */
export async function getRefundStatus(refundId: number): Promise<RefundResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key is not configured')
  }

  const response = await fetch(`https://api.paystack.co/refund/${refundId}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get refund status' }))
    throw new Error(error.message || 'Failed to get refund status')
  }

  return response.json()
}
