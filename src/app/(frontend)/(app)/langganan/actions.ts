'use server'

import { revalidatePath } from 'next/cache'
import { createCheckout, requestWaiver, settleOrder, simulationAllowed } from '@/lib/server/billing'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'

// Galat dikembalikan sebagai nilai (bukan throw) agar pesannya tetap terbaca di production.
type Result = { url?: string; error?: string }

async function session() {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) return null
  return { parent, ...ctx }
}

export async function startCheckout(childIds: string[]): Promise<Result> {
  const s = await session()
  if (!s) return { error: 'Sesi berakhir, silakan masuk lagi' }
  try {
    return { url: await createCheckout(s, childIds) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Pembayaran belum bisa dimulai. Coba lagi sebentar lagi.' }
  }
}

export async function askWaiver(reason: string): Promise<Result> {
  const s = await session()
  if (!s) return { error: 'Sesi berakhir, silakan masuk lagi' }
  await requestWaiver(s, reason)
  revalidatePath('/langganan')
  return {}
}

/** Hanya pengembangan lokal tanpa kunci Midtrans: tandai pesanan sendiri lunas/gagal. */
export async function simulatePayment(orderId: string, outcome: 'paid' | 'failed'): Promise<Result> {
  if (!simulationAllowed()) return { error: 'Simulasi tidak tersedia' }
  const s = await session()
  if (!s) return { error: 'Sesi berakhir, silakan masuk lagi' }
  const payload = await payloadClient()
  const own = await payload.find({
    collection: 'orders',
    where: { and: [{ orderId: { equals: orderId } }, { family: { equals: s.family.id } }, { gateway: { equals: 'simulasi' } }] },
    limit: 1, depth: 0, overrideAccess: false, user: s.parent,
  })
  if (!own.docs[0]) return { error: 'Pesanan tidak ditemukan' }
  await settleOrder(orderId, outcome, { amount: own.docs[0].amount, paymentType: 'simulasi' })
  for (const p of ['/langganan', '/hari-ini', '/anak', '/quran', '/keluarga']) revalidatePath(p)
  return { url: `/langganan?order=${encodeURIComponent(orderId)}` }
}
