import 'server-only'
import { mapStatus, verifySignature, type MidtransStatus, type OrderStatus } from './midtrans-core'

// Midtrans Snap (halaman bayar Midtrans: QRIS, e-wallet, VA) + verifikasi notifikasi.
// Kunci dari dashboard Midtrans → Settings → Access Keys. Sandbox dan production memakai kunci berbeda.

export { mapStatus, type MidtransStatus, type OrderStatus }

const serverKey = () => process.env.MIDTRANS_SERVER_KEY || ''
const isProduction = () => process.env.MIDTRANS_IS_PRODUCTION === 'true'
export const midtransConfigured = () => !!serverKey()

const snapBase = () => (isProduction() ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com')
const apiBase = () => (isProduction() ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com')
const authHeader = () => `Basic ${Buffer.from(`${serverKey()}:`).toString('base64')}`

export type SnapInput = {
  orderId: string
  amount: number
  items: { id: string; name: string; price: number }[]
  customer: { name: string; email: string }
  finishUrl: string
}

/** Buat transaksi Snap; hasilnya tautan halaman bayar Midtrans. */
export async function createSnapTransaction(input: SnapInput): Promise<{ token: string; redirectUrl: string }> {
  // Contoh: MIDTRANS_ENABLED_PAYMENTS=other_qris,gopay,shopeepay (kosong = semua metode yang aktif di akun).
  const enabled = (process.env.MIDTRANS_ENABLED_PAYMENTS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const body = {
    transaction_details: { order_id: input.orderId, gross_amount: input.amount },
    item_details: input.items.map((it) => ({ id: it.id, name: it.name.slice(0, 50), price: it.price, quantity: 1 })),
    customer_details: { first_name: input.customer.name.slice(0, 50), email: input.customer.email },
    callbacks: { finish: input.finishUrl },
    ...(enabled.length ? { enabled_payments: enabled } : {}),
  }
  const res = await fetch(`${snapBase()}/snap/v1/transactions`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = (await res.json().catch(() => ({}))) as { token?: string; redirect_url?: string; error_messages?: string[] }
  if (!res.ok || !json.redirect_url || !json.token) {
    throw new Error(`Midtrans menolak transaksi (${res.status}): ${(json.error_messages ?? []).join('; ')}`)
  }
  return { token: json.token, redirectUrl: json.redirect_url }
}

/** Status transaksi langsung dari API Midtrans (sumber kebenaran, bukan isi notifikasi). */
export async function fetchStatus(orderId: string): Promise<MidtransStatus | null> {
  const res = await fetch(`${apiBase()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: authHeader() },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as MidtransStatus | null
  // Transaksi yang belum dibuka pembeli menjawab 404 di dalam body.
  if (!json?.transaction_status || json.status_code === '404') return null
  return json
}

/** Verifikasi tanda tangan notifikasi dengan server key dari env. */
export const verifyNotification = (n: Pick<MidtransStatus, 'order_id' | 'status_code' | 'gross_amount' | 'signature_key'>) => verifySignature(n, serverKey())
