import { fetchStatus, mapStatus, midtransConfigured, verifyNotification, type MidtransStatus } from '@/lib/payment/midtrans'
import { settleOrder } from '@/lib/server/billing'

export const dynamic = 'force-dynamic'

/**
 * Notifikasi pembayaran Midtrans (dashboard Midtrans → Settings → Payment → Notification URL:
 * https://<domain>/webhooks/midtrans). Tanda tangan diverifikasi, lalu status diambil ulang dari
 * API Midtrans sehingga isi notifikasi palsu tidak pernah dipercaya begitu saja.
 */
export async function POST(req: Request) {
  if (!midtransConfigured()) return Response.json({ ok: false }, { status: 503 })
  const n = (await req.json().catch(() => null)) as MidtransStatus | null
  if (!n?.order_id || !verifyNotification(n)) return Response.json({ ok: false }, { status: 401 })
  // Pesanan uji dari tombol "Test notification" di dashboard Midtrans tidak dikenali: jawab 200 agar tidak diulang.
  if (!n.order_id.startsWith('PB-')) return Response.json({ ok: true, ignored: true })

  const st = (await fetchStatus(n.order_id)) ?? n
  const res = await settleOrder(st.order_id, mapStatus(st.transaction_status, st.fraud_status), {
    amount: Number(st.gross_amount),
    paymentType: st.payment_type,
    notification: n,
  })
  // 200 juga untuk pesanan tak dikenal, agar Midtrans berhenti mengirim ulang; detail tercatat di log server.
  if (!res.ok) console.warn('[webhook midtrans]', n.order_id, res.reason)
  return Response.json({ ok: true })
}
