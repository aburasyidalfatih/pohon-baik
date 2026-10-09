'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { addDays, localNow } from '@/lib/curriculum/core'
import { FAMILY_MAJELIS, progressRange, streakFrom } from '@/lib/server/day'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'

const ISO = /^\d{4}-\d{2}-\d{2}$/

async function session() {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) throw new Error('Sesi berakhir, silakan masuk lagi')
  return { parent, ...ctx }
}

/** Satu baris catatan per anak (atau keluarga) per hari: cari, atau buat bila belum ada. */
async function upsertLog(childId: string | null, date: string, mutate: (done: Set<string>) => void) {
  const s = await session()
  if (!ISO.test(date)) throw new Error('Tanggal tidak valid')
  if (childId && !s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')
  const payload = await payloadClient()
  const where: Where = { and: [{ family: { equals: s.family.id } }, { date: { equals: date } }, childId ? { child: { equals: childId } } : { child: { exists: false } }] }
  const found = await payload.find({ collection: 'dailyLogs', where, limit: 1, depth: 0, overrideAccess: false, user: s.parent })
  const done = new Set<string>((found.docs[0]?.done as string[]) ?? [])
  mutate(done)
  const data = { family: s.family.id, child: childId ?? undefined, date, done: [...done] }
  if (found.docs[0]) await payload.update({ collection: 'dailyLogs', id: found.docs[0].id, data, overrideAccess: false, user: s.parent })
  else await payload.create({ collection: 'dailyLogs', data, overrideAccess: false, user: s.parent })
  return [...done]
}

export async function toggleTask(childId: string | null, date: string, taskId: string, on: boolean) {
  return upsertLog(childId, date, (done) => (on ? done.add(taskId) : done.delete(taskId)))
}

/** Sembunyikan (sudah dikuasai) atau tampilkan lagi modul harian untuk satu anak. `code` null = tampilkan semua. */
export async function setModuleHidden(childId: string, code: string | null, hidden: boolean) {
  const s = await session()
  const child = s.children.find((c) => c.id === childId)
  if (!child) throw new Error('Anak tidak ditemukan')
  const cur = new Set(Array.isArray(child.skipModules) ? (child.skipModules as string[]) : [])
  if (code === null) cur.clear()
  else if (hidden) cur.add(code)
  else cur.delete(code)
  const payload = await payloadClient()
  await payload.update({ collection: 'children', id: childId, data: { skipModules: [...cur] }, overrideAccess: false, user: s.parent })
  revalidatePath('/hari-ini')
  revalidatePath('/anak')
  revalidatePath('/keluarga')
  return [...cur]
}

export async function finishMajelis(date: string, syukur: Record<string, string>) {
  const s = await session()
  const payload = await payloadClient()
  for (const [childId, raw] of Object.entries(syukur)) {
    if (!s.children.some((c) => c.id === childId)) continue
    const text = raw.trim()
    const where: Where = { and: [{ family: { equals: s.family.id } }, { child: { equals: childId } }, { date: { equals: date } }, { source: { equals: 'majelis' } }] }
    const ex = (await payload.find({ collection: 'moments', where, limit: 1, depth: 0, overrideAccess: false, user: s.parent })).docs[0]
    if (!text) {
      if (ex) await payload.delete({ collection: 'moments', id: ex.id, overrideAccess: false, user: s.parent })
      continue
    }
    const data = { family: s.family.id, child: childId, date, category: 'syukur' as const, source: 'majelis' as const, text: `Bersyukur untuk: ${text}` }
    if (ex) await payload.update({ collection: 'moments', id: ex.id, data, overrideAccess: false, user: s.parent })
    else await payload.create({ collection: 'moments', data, overrideAccess: false, user: s.parent })
  }
  return upsertLog(null, date, (done) => done.add(FAMILY_MAJELIS))
}

export async function majelisDrafts(date: string) {
  const s = await session()
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'moments',
    where: { and: [{ family: { equals: s.family.id } }, { date: { equals: date } }, { source: { equals: 'majelis' } }] },
    limit: 50, depth: 0, overrideAccess: false, user: s.parent,
  })
  return Object.fromEntries(res.docs.map((m) => [typeof m.child === 'object' ? m.child.id : m.child, (m.text ?? '').replace(/^Bersyukur untuk: /, '')]))
}

/** Statistik Kebun keluarga: 28 hari tema berjalan, 7 hari terakhir, dan total. */
export async function kebunStats(monthStart: string) {
  const s = await session()
  const today = localNow(Number(s.family.tz ?? 7)).date
  const from = monthStart < addDays(today, -60) ? monthStart : addDays(today, -60)
  const progress = await progressRange(s, from, today)
  const payload = await payloadClient()
  const own = { family: { equals: s.family.id } }
  const [logs, moments] = await Promise.all([
    payload.find({ collection: 'dailyLogs', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent, select: { done: true, date: true, child: true } }),
    payload.count({ collection: 'moments', where: own, overrideAccess: false, user: s.parent }),
  ])
  let steps = 0, majelis = 0
  const days = new Set<string>()
  for (const l of logs.docs) {
    const n = ((l.done as string[]) ?? []).length
    steps += n
    if (n) days.add(l.date)
    if (!l.child && (l.done as string[])?.includes(FAMILY_MAJELIS)) majelis++
  }
  return { today, progress, streak: streakFrom(progress, today), steps, days: days.size, majelis, moments: moments.totalDocs }
}
