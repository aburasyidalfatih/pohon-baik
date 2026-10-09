// Uji langganan (gratis 1 bulan, lalu Rp25.000 per anak per tahun): aturan tanggal, tanda tangan Midtrans,
// perlindungan field langganan, penguncian tulis, dan penerapan pembayaran tepat sekali.
// Bagian database membutuhkan PostgreSQL lokal (docker compose up -d).
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { accessOn, addYears, extendPaidUntil, needsPayment, trialEndFor } from '@/lib/billing/rules'
import { localNow } from '@/lib/curriculum/core'
import { mapStatus, verifySignature } from '@/lib/payment/midtrans-core'
import { settleOrder } from '@/lib/server/billing'
import config from '@/payload.config'
import type { Child, Family, Parent } from '@/payload-types'

describe('aturan langganan', () => {
  it('masa coba 30 hari termasuk hari mulai', () => {
    expect(trialEndFor('2026-10-10')).toBe('2026-11-08')
  })

  it('status akses: bayar → keringanan → masa coba → terkunci', () => {
    const fam = { trialEndsAt: '2026-11-08' }
    expect(accessOn(fam, {}, '2026-11-08').status).toBe('trial')
    expect(accessOn(fam, {}, '2026-11-09').status).toBe('locked')
    expect(accessOn(fam, { paidUntil: '2027-11-08' }, '2026-10-20')).toEqual({ status: 'paid', until: '2027-11-08' })
    expect(accessOn({ ...fam, waiverStatus: 'approved', waiverUntil: '2027-01-01' }, {}, '2026-12-01').status).toBe('waiver')
    expect(accessOn({ ...fam, waiverStatus: 'requested', waiverUntil: '2027-01-01' }, {}, '2026-12-01').status).toBe('locked')
    expect(accessOn({}, {}, '2026-10-10').status).toBe('locked')
  })

  it('membayar saat masa coba tidak memotong masa coba', () => {
    expect(extendPaidUntil('2026-10-20', '2026-11-08', null)).toBe('2027-11-08')
  })

  it('membayar setelah masa coba: 1 tahun sejak hari bayar', () => {
    expect(extendPaidUntil('2026-12-01', '2026-11-08', null)).toBe('2027-11-30')
  })

  it('perpanjangan menyambung dari masa aktif sebelumnya', () => {
    expect(extendPaidUntil('2027-11-01', '2026-11-08', '2027-11-08')).toBe('2028-11-08')
    expect(extendPaidUntil('2028-01-15', '2026-11-08', '2027-11-08')).toBe('2029-01-14')
  })

  it('29 Februari aman', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28')
  })

  it('perlu dibayar bila belum aktif atau tinggal ≤30 hari', () => {
    expect(needsPayment({}, '2026-10-10')).toBe(true)
    expect(needsPayment({ paidUntil: '2026-11-05' }, '2026-10-10')).toBe(true)
    expect(needsPayment({ paidUntil: '2027-10-10' }, '2026-10-10')).toBe(false)
  })
})

describe('Midtrans', () => {
  const n = { order_id: 'PB-1', status_code: '200', gross_amount: '25000.00' }
  const sig = '67eb2258ad1b65fc286f918c9696b3265ae79259a5b3831fa3b8f0313d1e0f6c4401803cb7bde8a0df11fbf1b8db62fec4cbe91def393a90241c0ec7df20258e'

  it('tanda tangan sah diterima, yang diubah ditolak', () => {
    expect(verifySignature({ ...n, signature_key: sig }, 'SB-Mid-server-uji')).toBe(true)
    expect(verifySignature({ ...n, gross_amount: '1.00', signature_key: sig }, 'SB-Mid-server-uji')).toBe(false)
    expect(verifySignature({ ...n, signature_key: sig }, 'kunci-lain')).toBe(false)
    expect(verifySignature({ ...n, signature_key: sig }, '')).toBe(false)
  })

  it('pemetaan status', () => {
    expect(mapStatus('settlement')).toBe('paid')
    expect(mapStatus('capture', 'accept')).toBe('paid')
    expect(mapStatus('capture', 'challenge')).toBe('pending')
    expect(mapStatus('pending')).toBe('pending')
    expect(mapStatus('expire')).toBe('expired')
    expect(mapStatus('deny')).toBe('failed')
    expect(mapStatus('refund')).toBe('refunded')
  })
})

describe('langganan di database', () => {
  let payload: Payload
  const tag = `b${Date.now()}`
  let parent: Parent & { collection: 'parents' }
  let family: Family
  let child: Child
  const today = localNow(7).date

  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const p = (await payload.create({ collection: 'parents', data: { name: 'Uji', email: `bayar-${tag}@uji.test`, password: 'rahasia-uji-123' } })) as Parent
    parent = { ...p, collection: 'parents' }
    family = (await payload.create({
      collection: 'families',
      data: { name: 'Keluarga Uji Bayar', members: [{ parent: p.id, role: 'owner' }], city: 'jakarta', themeStart: today, themeOffset: 0 },
    })) as Family
    child = (await payload.create({ collection: 'children', data: { family: family.id, name: 'Kamil', dob: '2020-01-01' } })) as Child
  })

  afterAll(async () => {
    await payload.delete({ collection: 'orders', where: { family: { equals: family.id } } })
    await payload.delete({ collection: 'dailyLogs', where: { family: { equals: family.id } } })
    await payload.delete({ collection: 'moments', where: { family: { equals: family.id } } })
    await payload.delete({ collection: 'children', where: { family: { equals: family.id } } })
    await payload.delete({ collection: 'families', id: family.id })
    await payload.delete({ collection: 'parents', id: parent.id })
  })

  it('keluarga baru otomatis mendapat masa coba 30 hari', () => {
    expect(family.trialEndsAt).toBe(trialEndFor(today))
  })

  it('orang tua tidak bisa mengubah masa aktif, masa coba, atau keringanan lewat API', async () => {
    const c = await payload.update({ collection: 'children', id: child.id, data: { paidUntil: '2099-12-31', name: 'Kamil' }, user: parent, overrideAccess: false })
    expect(c.paidUntil ?? null).toBeNull()
    const f = await payload.update({
      collection: 'families', id: family.id, user: parent, overrideAccess: false,
      data: { trialEndsAt: '2099-12-31', waiver: { status: 'approved', until: '2099-12-31' } },
    })
    expect(f.trialEndsAt).toBe(trialEndFor(today))
    expect(f.waiver?.status ?? 'none').toBe('none')
  })

  it('orang tua tidak bisa membuat pesanan sendiri', async () => {
    await expect(
      payload.create({
        collection: 'orders', user: parent, overrideAccess: false,
        data: { orderId: `PB-X-${tag}`, family: family.id, items: [{ child: child.id, childName: 'Kamil', price: 0 }], amount: 0, status: 'paid', gateway: 'simulasi' },
      }),
    ).rejects.toThrow()
  })

  it('anak terkunci tidak bisa dicentang, Majelis Malam tetap boleh', async () => {
    await payload.update({ collection: 'families', id: family.id, data: { trialEndsAt: '2000-01-01' } })
    await expect(
      payload.create({ collection: 'dailyLogs', data: { family: family.id, child: child.id, date: today, done: ['x'] }, user: parent, overrideAccess: false }),
    ).rejects.toThrow(/belum aktif/)
    const m = await payload.create({
      collection: 'moments', user: parent, overrideAccess: false,
      data: { family: family.id, child: child.id, date: today, category: 'syukur', source: 'majelis', text: 'Bersyukur' },
    })
    expect(m.id).toBeTruthy()
  })

  it('pembayaran lunas memperpanjang tepat sekali walau notifikasi ganda', async () => {
    const orderId = `PB-T-${tag}`
    await payload.create({
      collection: 'orders',
      data: { orderId, family: family.id, items: [{ child: child.id, childName: 'Kamil', price: 25000 }], amount: 25000, status: 'pending', gateway: 'simulasi' },
    })
    expect((await settleOrder(orderId, 'paid', { amount: 1000 })).ok).toBe(false) // jumlah tidak cocok
    const [a, b] = await Promise.all([settleOrder(orderId, 'paid', { amount: 25000 }), settleOrder(orderId, 'paid', { amount: 25000 })])
    expect([a, b].filter((r) => r.ok && r.applied)).toHaveLength(1)
    const c = await payload.findByID({ collection: 'children', id: child.id })
    expect(c.paidUntil).toBe(extendPaidUntil(today, '2000-01-01', null))
    // Notifikasi "pending" yang terlambat tidak menurunkan status lunas.
    await settleOrder(orderId, 'pending')
    const o = (await payload.find({ collection: 'orders', where: { orderId: { equals: orderId } } })).docs[0]
    expect(o.status).toBe('paid')
    // Setelah lunas, anak bisa dicentang lagi.
    const log = await payload.create({ collection: 'dailyLogs', data: { family: family.id, child: child.id, date: today, done: ['x'] }, user: parent, overrideAccess: false })
    expect(log.id).toBeTruthy()
  })
})
