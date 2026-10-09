import 'server-only'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import {
  accessOn,
  extendPaidUntil,
  needsPayment,
  PRICE_PER_CHILD_YEAR,
  REMIND_DAYS,
  type AccessStatus,
  type FamilyBilling,
  type WaiverStatus,
} from '@/lib/billing/rules'
import { daysBetween, localNow } from '@/lib/curriculum/core'
import { createSnapTransaction, fetchStatus, mapStatus, midtransConfigured, type OrderStatus } from '@/lib/payment/midtrans'
import type { Child, Family, Order, Parent } from '@/payload-types'
import { payloadClient } from './payload'

type Ctx = { parent: Parent; family: Family; children: Child[] }

export const familyBilling = (f: Family): FamilyBilling => ({
  trialEndsAt: f.trialEndsAt ?? null,
  waiverStatus: (f.waiver?.status ?? 'none') as WaiverStatus,
  waiverUntil: f.waiver?.until ?? null,
})

/** Anak boleh dipakai penuh pada tanggal itu (masa coba, sudah bayar, atau keringanan). */
export const childOpenOn = (family: Family, child: Child, date: string) => accessOn(familyBilling(family), child, date).status !== 'locked'

export type ChildAccess = { id: string; name: string; status: AccessStatus; until: string | null; needsPayment: boolean }
export type Billing = {
  today: string
  price: number
  trialEndsAt: string | null
  /** Sisa hari masa coba termasuk hari ini (0 = sudah selesai). */
  trialDaysLeft: number
  waiver: { status: WaiverStatus; until: string | null }
  children: ChildAccess[]
  locked: ChildAccess[]
  /** Tampilkan pengingat: masa coba atau masa aktif anak berakhir dalam ≤ REMIND_DAYS hari. */
  remind: { kind: 'trial' | 'renew'; daysLeft: number; names: string[] } | null
  canPay: boolean
}

export function billingFor(ctx: { family: Family; children: Child[] }): Billing {
  const today = localNow(Number(ctx.family.tz ?? 7)).date
  const fb = familyBilling(ctx.family)
  const children = ctx.children.map((c) => {
    const a = accessOn(fb, c, today)
    return { id: c.id, name: c.name, status: a.status, until: a.until, needsPayment: needsPayment(c, today) }
  })
  const trialDaysLeft = fb.trialEndsAt && fb.trialEndsAt >= today ? daysBetween(today, fb.trialEndsAt) + 1 : 0

  let remind: Billing['remind'] = null
  const trialKids = children.filter((c) => c.status === 'trial')
  if (trialKids.length && trialDaysLeft <= REMIND_DAYS) remind = { kind: 'trial', daysLeft: trialDaysLeft, names: trialKids.map((c) => c.name) }
  else {
    const ending = children.filter((c) => c.status === 'paid' && c.until && daysBetween(today, c.until) < REMIND_DAYS)
    if (ending.length) remind = { kind: 'renew', daysLeft: Math.min(...ending.map((c) => daysBetween(today, c.until!) + 1)), names: ending.map((c) => c.name) }
  }

  return {
    today,
    price: PRICE_PER_CHILD_YEAR,
    trialEndsAt: fb.trialEndsAt ?? null,
    trialDaysLeft,
    waiver: { status: fb.waiverStatus ?? 'none', until: fb.waiverUntil ?? null },
    children,
    locked: children.filter((c) => c.status === 'locked'),
    remind,
    canPay: paymentMode() !== null,
  }
}

// ---------- Pembayaran ----------

/** Simulasi hanya untuk pengembangan lokal tanpa kunci Midtrans; tidak pernah aktif di production. */
export const simulationAllowed = () => process.env.NODE_ENV !== 'production' && !midtransConfigured()
export const paymentMode = (): Order['gateway'] | null => (midtransConfigured() ? 'midtrans' : simulationAllowed() ? 'simulasi' : null)

async function appOrigin() {
  const env = process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL
  if (env) return env.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

const newOrderId = (today: string) => `PB-${today.replaceAll('-', '')}-${randomBytes(5).toString('hex').toUpperCase()}`

/** Buat pesanan untuk anak terpilih dan kembalikan alamat halaman bayar. */
export async function createCheckout(ctx: Ctx, childIds: string[]): Promise<string> {
  const mode = paymentMode()
  if (!mode) throw new Error('Pembayaran belum tersedia. Hubungi tim Pohon Baik.')
  const ids = [...new Set(childIds)]
  const kids = ids.map((id) => ctx.children.find((c) => c.id === id))
  if (!kids.length || kids.some((k) => !k)) throw new Error('Pilih anak yang akan diaktifkan')

  const today = localNow(Number(ctx.family.tz ?? 7)).date
  const price = PRICE_PER_CHILD_YEAR
  const items = kids.map((k) => ({ child: k!.id, childName: k!.name, price }))
  const amount = price * items.length
  const orderId = newOrderId(today)

  const payload = await payloadClient()
  const order = await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: { orderId, family: ctx.family.id, parent: ctx.parent.id, items, amount, status: 'pending', gateway: mode },
  })

  if (mode === 'simulasi') return `/langganan/simulasi?order=${encodeURIComponent(orderId)}`

  try {
    const snap = await createSnapTransaction({
      orderId,
      amount,
      items: items.map((it) => ({ id: it.child, name: `Langganan 1 tahun · ${it.childName}`, price: it.price })),
      customer: { name: ctx.parent.name, email: ctx.parent.email },
      finishUrl: `${await appOrigin()}/langganan?order=${encodeURIComponent(orderId)}`,
    })
    await payload.update({ collection: 'orders', id: order.id, overrideAccess: true, data: { paymentUrl: snap.redirectUrl } })
    return snap.redirectUrl
  } catch (e) {
    console.error('[langganan] gagal membuat transaksi Midtrans', e)
    await payload.update({ collection: 'orders', id: order.id, overrideAccess: true, data: { status: 'failed' } })
    throw new Error('Halaman pembayaran belum bisa dibuka. Coba lagi sebentar lagi.')
  }
}

const FINAL: OrderStatus[] = ['paid', 'refunded']

/**
 * Terapkan status pembayaran ke pesanan. Saat lunas, masa aktif setiap anak diperpanjang 1 tahun
 * tepat SEKALI walaupun notifikasi datang berulang atau bersamaan (klaim `applied_at` atomik di database).
 */
export async function settleOrder(orderId: string, status: OrderStatus, meta: { amount?: number; paymentType?: string; notification?: unknown } = {}) {
  const payload = await payloadClient()
  const order = (await payload.find({ collection: 'orders', where: { orderId: { equals: orderId } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!order) return { ok: false as const, reason: 'not-found' }
  if (status === 'paid' && meta.amount !== undefined && Math.round(meta.amount) !== order.amount) {
    console.error(`[langganan] jumlah tidak cocok untuk ${orderId}: ${meta.amount} ≠ ${order.amount}`)
    return { ok: false as const, reason: 'amount-mismatch' }
  }
  // Status lunas tidak turun lagi menjadi menunggu/gagal; hanya boleh menjadi refund.
  const next: OrderStatus = FINAL.includes(order.status as OrderStatus) && status !== 'refunded' ? (order.status as OrderStatus) : status
  await payload.update({
    collection: 'orders',
    id: order.id,
    overrideAccess: true,
    data: {
      status: next,
      ...(meta.paymentType ? { paymentType: meta.paymentType } : {}),
      ...(meta.notification !== undefined ? { lastNotification: meta.notification as Record<string, unknown> } : {}),
      ...(next === 'paid' && !order.paidAt ? { paidAt: new Date().toISOString() } : {}),
    },
  })
  if (next === 'refunded' && order.appliedAt) console.warn(`[langganan] ${orderId} di-refund; masa aktif anak TIDAK dicabut otomatis, periksa manual.`)
  if (next !== 'paid') return { ok: true as const, applied: false }

  const db = payload.db as unknown as PostgresAdapter
  const claim = await db.drizzle.execute(sql`UPDATE "orders" SET "applied_at" = now() WHERE "id" = ${order.id} AND "applied_at" IS NULL RETURNING "id"`)
  if (!claim.rows.length) return { ok: true as const, applied: false }

  const familyId = typeof order.family === 'object' ? order.family.id : order.family
  const family = await payload.findByID({ collection: 'families', id: familyId, depth: 0, overrideAccess: true })
  const today = localNow(Number(family.tz ?? 7)).date
  const items = []
  for (const it of order.items ?? []) {
    const childId = it.child && typeof it.child === 'object' ? it.child.id : it.child ?? null
    // Anak sudah dihapus: pesanan tetap tercatat, tidak ada yang diperpanjang.
    const child = childId ? await payload.findByID({ collection: 'children', id: childId, depth: 0, overrideAccess: true }).catch(() => null) : null
    if (!child) {
      items.push({ ...it, child: childId })
      continue
    }
    const paidUntil = extendPaidUntil(today, family.trialEndsAt, child.paidUntil)
    await payload.update({ collection: 'children', id: child.id, overrideAccess: true, data: { paidUntil } })
    items.push({ ...it, child: childId, paidUntil })
  }
  await payload.update({ collection: 'orders', id: order.id, overrideAccess: true, data: { items } })
  return { ok: true as const, applied: true }
}

/** Cocokkan pesanan Midtrans yang masih menunggu (24 jam terakhir) langsung ke API, untuk jaga-jaga notifikasi terlambat. */
export async function syncPendingOrders(ctx: Ctx) {
  if (!midtransConfigured()) return
  const payload = await payloadClient()
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const pending = await payload.find({
    collection: 'orders',
    where: { and: [{ family: { equals: ctx.family.id } }, { status: { equals: 'pending' } }, { gateway: { equals: 'midtrans' } }, { createdAt: { greater_than: since } }] },
    limit: 5, depth: 0, overrideAccess: true,
  })
  for (const o of pending.docs) {
    try {
      const st = await fetchStatus(o.orderId)
      if (st) await settleOrder(o.orderId, mapStatus(st.transaction_status, st.fraud_status), { amount: Number(st.gross_amount), paymentType: st.payment_type })
    } catch (e) {
      console.warn('[langganan] gagal mengecek status', o.orderId, e)
    }
  }
}

export async function recentOrders(ctx: Ctx) {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'orders',
    where: { family: { equals: ctx.family.id } },
    sort: '-createdAt', limit: 10, depth: 0, overrideAccess: false, user: ctx.parent,
  })
  return res.docs.map((o) => ({
    orderId: o.orderId,
    createdAt: o.createdAt,
    amount: o.amount,
    status: o.status,
    names: (o.items ?? []).map((i) => i.childName),
    paymentUrl: o.status === 'pending' ? o.paymentUrl ?? null : null,
  }))
}

// ---------- Keringanan ----------

export async function requestWaiver(ctx: Ctx, reason: string) {
  const cur = familyBilling(ctx.family)
  if (cur.waiverStatus === 'requested') return
  const payload = await payloadClient()
  await payload.update({
    collection: 'families',
    id: ctx.family.id,
    overrideAccess: true,
    data: { waiver: { status: 'requested', reason: reason.trim().slice(0, 1000) || null, requestedAt: new Date().toISOString(), until: null } },
  })
}
