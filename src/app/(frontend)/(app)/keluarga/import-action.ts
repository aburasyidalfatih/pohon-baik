'use server'

import type { Where } from 'payload'
import { CITIES, LOADS, PHASES, TAHFIDZ_TARGETS, type Load, type TahfidzTarget } from '@/lib/curriculum/constants'

/** Kolom anak tambahan (versi aplikasi web); cadangan prototype lama tidak memilikinya. */
const extras = (c: { load?: string; tahfidz?: string; skip?: string[] }) => ({
  ...(LOADS.some((l) => l.id === c.load) ? { load: c.load as Load } : {}),
  ...(TAHFIDZ_TARGETS.some((t) => t.id === c.tahfidz) ? { tahfidzTarget: c.tahfidz as TahfidzTarget } : {}),
  ...(Array.isArray(c.skip) ? { skipModules: c.skip.filter((x) => typeof x === 'string').slice(0, 500) } : {}),
})
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import type { Family } from '@/payload-types'

/* Format file cadangan prototype (localStorage `pohonbaik_v1`). */
type Backup = {
  settings?: { family?: string; city?: string; lat?: string | number; lon?: string | number; tz?: string | number; themeStart?: string; themeOffset?: string | number; appearance?: string }
  children?: { id: string; name: string; dob: string; sex?: string; abil?: Record<string, string>; load?: string; tahfidz?: string; skip?: string[] }[]
  checks?: Record<string, number>
  quran?: Record<string, { label: string; base: string; done: number[] }[]>
  rapor?: Record<string, Record<string, Record<string, { lv?: number; note?: string } | string>>>
  moments?: { cid: string; cat?: string; date: string; text?: string; photo?: boolean; mile?: string; mj?: string }[]
  miles?: Record<string, Record<string, string>>
}

export type ImportResult = { ok: true; summary: string[]; photosSkipped: number } | { ok: false; error: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const CATS = ['bisa', 'kata', 'ibadah', 'lucu', 'syukur', 'catatan'] as const

export async function importPrototype(json: string, useSettings: boolean): Promise<ImportResult> {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) return { ok: false, error: 'Sesi berakhir, silakan masuk lagi' }
  let b: Backup
  try {
    b = JSON.parse(json)
    if (!Array.isArray(b.children)) throw new Error()
  } catch {
    return { ok: false, error: 'File bukan cadangan Pohon Baik yang valid' }
  }

  const payload = await payloadClient()
  const auth = { overrideAccess: false, user: parent } as const
  const fam = ctx.family.id
  const summary: string[] = []

  // 1. Pengaturan keluarga (agar tema berjalan melanjutkan hitungan yang sama)
  if (useSettings && b.settings) {
    const st = b.settings
    const data: Partial<Family> = {}
    if (st.family) data.name = st.family
    if (st.city && (CITIES[st.city] || st.city === 'custom')) data.city = st.city as Family['city']
    if (st.city === 'custom') { data.lat = Number(st.lat); data.lon = Number(st.lon); data.tz = String(st.tz ?? 7) as Family['tz'] }
    else if (st.city && CITIES[st.city]) data.tz = String(CITIES[st.city][3]) as Family['tz']
    if (st.themeStart && ISO.test(st.themeStart)) data.themeStart = st.themeStart
    if (st.themeOffset !== undefined) data.themeOffset = Number(st.themeOffset) % 12
    if (st.appearance === 'light' || st.appearance === 'dark' || st.appearance === 'auto') data.appearance = st.appearance
    await payload.update({ collection: 'families', id: fam, data, ...auth })
    summary.push('Pengaturan keluarga & tema diperbarui')
  }

  // 2. Anak: cocokkan nama + tanggal lahir, atau buat baru
  const idMap: Record<string, string> = {}
  let newKids = 0
  for (const c of b.children) {
    if (!c.name || !ISO.test(c.dob)) continue
    const ex = ctx.children.find((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase() && x.dob === c.dob)
    const abilityOverrides = Object.fromEntries(Object.entries(c.abil ?? {}).filter(([, v]) => PHASES.some((p) => p.id === v)))
    if (ex) idMap[c.id] = ex.id
    else {
      const doc = await payload.create({ collection: 'children', data: { family: fam, name: c.name, dob: c.dob, sex: c.sex === 'L' || c.sex === 'P' ? c.sex : undefined, abilityOverrides, ...extras(c) }, ...auth })
      idMap[c.id] = doc.id
      newKids++
    }
  }
  summary.push(`${Object.keys(idMap).length} anak (${newKids} baru)`)

  // 3. Centang harian → satu catatan per anak per hari
  const groups = new Map<string, Set<string>>()
  for (const [k, v] of Object.entries(b.checks ?? {})) {
    if (!v) continue
    const [date, cid, ...rest] = k.split('|')
    const tid = rest.join('|')
    if (!ISO.test(date) || !tid) continue
    const owner = cid === 'family' ? 'family' : idMap[cid]
    if (!owner) continue
    const key = `${date}|${owner}`
    if (!groups.has(key)) groups.set(key, new Set())
    groups.get(key)!.add(tid)
  }
  for (const [key, set] of groups) {
    const [date, owner] = key.split('|')
    const child = owner === 'family' ? null : owner
    const where: Where = { and: [{ family: { equals: fam } }, { date: { equals: date } }, child ? { child: { equals: child } } : { child: { exists: false } }] }
    const ex = (await payload.find({ collection: 'dailyLogs', where, limit: 1, depth: 0, ...auth })).docs[0]
    const done = [...new Set([...((ex?.done as string[]) ?? []), ...set])]
    const data = { family: fam, child: child ?? undefined, date, done }
    if (ex) await payload.update({ collection: 'dailyLogs', id: ex.id, data, ...auth })
    else await payload.create({ collection: 'dailyLogs', data, ...auth })
  }
  summary.push(`${groups.size} catatan harian (${[...groups.values()].reduce((n, s) => n + s.size, 0)} centang)`)

  // 4. Hafalan Qur'an
  let q = 0
  for (const [oldCid, list] of Object.entries(b.quran ?? {})) {
    const child = idMap[oldCid]
    if (!child) continue
    for (const e of list) {
      if (!e.label || !ISO.test(e.base)) continue
      const where: Where = { and: [{ child: { equals: child } }, { label: { equals: e.label } }] }
      const ex = (await payload.find({ collection: 'quranEntries', where, limit: 1, depth: 0, ...auth })).docs[0]
      const data = { family: fam, child, label: e.label, base: e.base, done: (e.done ?? []).filter((n) => typeof n === 'number') }
      if (ex) await payload.update({ collection: 'quranEntries', id: ex.id, data, ...auth })
      else await payload.create({ collection: 'quranEntries', data, ...auth })
      q++
    }
  }
  summary.push(`${q} hafalan`)

  // 5. Rapor
  let r = 0
  for (const [oldCid, sems] of Object.entries(b.rapor ?? {})) {
    const child = idMap[oldCid]
    if (!child) continue
    for (const [semester, fields] of Object.entries(sems)) {
      for (const [branch, v] of Object.entries(fields)) {
        const level = typeof v === 'object' ? Number(v.lv ?? 0) : 0
        const note = typeof v === 'object' ? v.note ?? '' : String(v ?? '')
        if (!level && !note) continue
        const where: Where = { and: [{ child: { equals: child } }, { semester: { equals: semester } }, { branch: { equals: branch } }] }
        const ex = (await payload.find({ collection: 'raporEntries', where, limit: 1, depth: 0, ...auth })).docs[0]
        const data = { family: fam, child, semester, branch, level, note }
        if (ex) await payload.update({ collection: 'raporEntries', id: ex.id, data, ...auth })
        else await payload.create({ collection: 'raporEntries', data, ...auth })
        r++
      }
    }
  }
  summary.push(`${r} isian rapor`)

  // 6. Tonggak kemampuan
  let ms = 0
  for (const [oldCid, map] of Object.entries(b.miles ?? {})) {
    const child = idMap[oldCid]
    if (!child) continue
    for (const [key, seenAt] of Object.entries(map)) {
      if (!ISO.test(seenAt)) continue
      const where: Where = { and: [{ child: { equals: child } }, { key: { equals: key } }] }
      if ((await payload.find({ collection: 'milestones', where, limit: 1, depth: 0, ...auth })).docs.length) continue
      await payload.create({ collection: 'milestones', data: { family: fam, child, key, seenAt }, ...auth })
      ms++
    }
  }
  summary.push(`${ms} tonggak kemampuan`)

  // 7. Momen (teks; foto menyusul bersama penyimpanan foto privat)
  let mo = 0, photosSkipped = 0
  for (const m of b.moments ?? []) {
    const child = idMap[m.cid]
    if (!child || !ISO.test(m.date)) continue
    if (m.photo) photosSkipped++
    const text = (m.text ?? '').trim()
    const where: Where = { and: [{ child: { equals: child } }, { date: { equals: m.date } }, { text: { equals: text } }] }
    if ((await payload.find({ collection: 'moments', where, limit: 1, depth: 0, ...auth })).docs.length) continue
    await payload.create({
      collection: 'moments',
      data: {
        family: fam, child, date: m.date, text,
        category: (CATS as readonly string[]).includes(m.cat ?? '') ? (m.cat as (typeof CATS)[number]) : 'catatan',
        source: m.mile ? 'milestone' : m.mj ? 'majelis' : 'manual',
        milestoneKey: m.mile, hasPhoto: !!m.photo,
      },
      ...auth,
    })
    mo++
  }
  summary.push(`${mo} momen`)

  return { ok: true, summary, photosSkipped }
}
