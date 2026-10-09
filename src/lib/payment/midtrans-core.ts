// Bagian Midtrans yang murni (tanpa env/jaringan) agar bisa diuji.
import { createHash, timingSafeEqual } from 'node:crypto'

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'

export type MidtransStatus = {
  order_id: string
  status_code: string
  gross_amount: string
  transaction_status: string
  fraud_status?: string
  payment_type?: string
  signature_key?: string
}

/** signature_key = SHA512(order_id + status_code + gross_amount + server key). */
export function verifySignature(n: Pick<MidtransStatus, 'order_id' | 'status_code' | 'gross_amount' | 'signature_key'>, key: string) {
  if (!key || !n.signature_key) return false
  const expected = createHash('sha512').update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(String(n.signature_key))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Status Midtrans → status pesanan. */
export function mapStatus(transactionStatus: string, fraudStatus?: string): OrderStatus {
  switch (transactionStatus) {
    case 'settlement':
      return 'paid'
    case 'capture':
      return fraudStatus === 'accept' || !fraudStatus ? 'paid' : 'pending'
    case 'pending':
    case 'authorize':
      return 'pending'
    case 'expire':
      return 'expired'
    case 'refund':
    case 'partial_refund':
    case 'chargeback':
    case 'partial_chargeback':
      return 'refunded'
    default:
      return 'failed' // deny, cancel, failure
  }
}
