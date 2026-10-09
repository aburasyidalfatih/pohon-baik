'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { CITIES, DEFAULT_LOAD, DEFAULT_TAHFIDZ, LOADS, TAHFIDZ_TARGETS, type Load, type TahfidzTarget } from '@/lib/curriculum/constants'
import { localNow } from '@/lib/curriculum/core'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import { THEME_COOKIE } from '@/lib/theme'
import type { Family } from '@/payload-types'

const validLoad = (v?: string): Load => (LOADS.some((l) => l.id === v) ? (v as Load) : DEFAULT_LOAD)
const validTahfidz = (v?: string): TahfidzTarget => (TAHFIDZ_TARGETS.some((t) => t.id === v) ? (v as TahfidzTarget) : DEFAULT_TAHFIDZ)
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

async function session() {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) throw new Error('Sesi berakhir, silakan masuk lagi')
  return { parent, ...ctx }
}

export async function updateFamilySettings(data: {
  name: string
  city: string
  lat?: number
  lon?: number
  tz: string
  themeStart: string
  themeOffset: number
  appearance: 'auto' | 'light' | 'dark'
}) {
  const s = await session()
  const payload = await payloadClient()

  const appearance = data.appearance === 'light' || data.appearance === 'dark' ? data.appearance : 'auto'
  const updateData: Partial<Family> = {
    name: data.name.trim() || s.family.name,
    themeOffset: Math.max(0, Math.min(11, Math.trunc(Number(data.themeOffset) || 0))),
    appearance,
  }
  if (validDate(data.themeStart)) updateData.themeStart = data.themeStart

  if (data.city === 'custom') {
    const lat = Number(data.lat), lon = Number(data.lon)
    if (data.lat === undefined || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Lintang harus antara -90 dan 90')
    if (data.lon === undefined || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('Bujur harus antara -180 dan 180')
    updateData.city = 'custom'
    updateData.lat = lat
    updateData.lon = lon
    updateData.tz = (['7', '8', '9'].includes(data.tz) ? data.tz : '7') as Family['tz']
  } else if (CITIES[data.city]) {
    updateData.city = data.city as Family['city']
    updateData.tz = String(CITIES[data.city][3]) as Family['tz']
  }

  await payload.update({
    collection: 'families',
    id: s.family.id,
    data: updateData,
    overrideAccess: false,
    user: s.parent,
  })

  // Cookie tampilan dibaca skrip di <head> sebelum halaman tergambar (tanpa kedip tema yang salah).
  const jar = await cookies()
  if (appearance === 'auto') jar.delete(THEME_COOKIE)
  else jar.set(THEME_COOKIE, appearance, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  revalidatePath('/keluarga')
  revalidatePath('/hari-ini')
  revalidatePath('/tema')
}

export async function saveChild(
  childId: string | 'new',
  data: {
    name: string
    dob: string
    sex?: 'L' | 'P'
    abilityOverrides?: Record<string, string>
    load?: Load
    tahfidzTarget?: TahfidzTarget
  },
) {
  const s = await session()
  if (!data.name.trim()) throw new Error('Nama anak wajib diisi')
  if (!validDate(data.dob)) throw new Error('Tanggal lahir tidak valid')
  if (data.dob > localNow(Number(s.family.tz ?? 7)).date) throw new Error('Tanggal lahir tidak boleh di masa depan')

  const payload = await payloadClient()
  const cleanOverrides = Object.fromEntries(
    Object.entries(data.abilityOverrides ?? {}).filter(([, v]) => v && v !== 'auto'),
  )

  if (childId === 'new') {
    await payload.create({
      collection: 'children',
      data: {
        family: s.family.id,
        name: data.name.trim(),
        dob: data.dob,
        sex: data.sex,
        abilityOverrides: cleanOverrides,
        load: validLoad(data.load),
        tahfidzTarget: validTahfidz(data.tahfidzTarget),
      },
      overrideAccess: false,
      user: s.parent,
    })
  } else {
    if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')
    await payload.update({
      collection: 'children',
      id: childId,
      data: {
        name: data.name.trim(),
        dob: data.dob,
        sex: data.sex,
        abilityOverrides: cleanOverrides,
        load: validLoad(data.load),
        tahfidzTarget: validTahfidz(data.tahfidzTarget),
      },
      overrideAccess: false,
      user: s.parent,
    })
  }

  revalidatePath('/keluarga')
  revalidatePath('/hari-ini')
  revalidatePath('/anak')
  revalidatePath('/quran')
  revalidatePath('/tema')
}

export async function deleteChild(childId: string) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')

  const payload = await payloadClient()
  await payload.delete({
    collection: 'children',
    id: childId,
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/keluarga')
  revalidatePath('/hari-ini')
  revalidatePath('/anak')
  revalidatePath('/quran')
  revalidatePath('/tema')
}

export async function exportBackupJson(): Promise<string> {
  const s = await session()
  const payload = await payloadClient()
  const own = { family: { equals: s.family.id } }

  const [logs, quran, rapor, moments, miles] = await Promise.all([
    payload.find({ collection: 'dailyLogs', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent }),
    payload.find({ collection: 'quranEntries', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent }),
    payload.find({ collection: 'raporEntries', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent }),
    payload.find({ collection: 'moments', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent }),
    payload.find({ collection: 'milestones', where: own, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: s.parent }),
  ])

  // Bangun checks map (date|cid|tid -> 1)
  const checks: Record<string, number> = {}
  for (const l of logs.docs) {
    const cid = l.child ? (typeof l.child === 'object' ? l.child.id : l.child) : 'family'
    const doneList = Array.isArray(l.done) ? (l.done as string[]) : []
    for (const tid of doneList) {
      checks[`${l.date}|${cid}|${tid}`] = 1
    }
  }

  // Bangun quran map per anak
  const quranMap: Record<string, { label: string; base: string; done: number[] }[]> = {}
  for (const q of quran.docs) {
    const cid = typeof q.child === 'object' ? q.child.id : q.child
    quranMap[cid] ??= []
    quranMap[cid].push({
      label: q.label,
      base: q.base,
      done: Array.isArray(q.done) ? (q.done as number[]) : [],
    })
  }

  // Bangun rapor map per anak -> semester -> branch -> { lv, note }
  const raporMap: Record<string, Record<string, Record<string, { lv: number; note: string }>>> = {}
  for (const r of rapor.docs) {
    const cid = typeof r.child === 'object' ? r.child.id : r.child
    raporMap[cid] ??= {}
    raporMap[cid][r.semester] ??= {}
    raporMap[cid][r.semester][r.branch] = { lv: r.level ?? 0, note: r.note ?? '' }
  }

  // Bangun milestones map per anak -> key -> seenAt
  const milesMap: Record<string, Record<string, string>> = {}
  for (const m of miles.docs) {
    const cid = typeof m.child === 'object' ? m.child.id : m.child
    milesMap[cid] ??= {}
    milesMap[cid][m.key] = m.seenAt || ''
  }

  const backupObj = {
    settings: {
      family: s.family.name,
      city: s.family.city,
      lat: s.family.lat ?? undefined,
      lon: s.family.lon ?? undefined,
      tz: s.family.tz ?? '7',
      themeStart: s.family.themeStart,
      themeOffset: s.family.themeOffset ?? 0,
      appearance: s.family.appearance ?? 'auto',
    },
    children: s.children.map((c) => ({
      id: c.id,
      name: c.name,
      dob: c.dob,
      sex: c.sex ?? undefined,
      abil: (c.abilityOverrides as Record<string, string> | null) ?? {},
      load: c.load ?? undefined,
      tahfidz: c.tahfidzTarget ?? undefined,
      skip: Array.isArray(c.skipModules) ? (c.skipModules as string[]) : [],
    })),
    checks,
    quran: quranMap,
    rapor: raporMap,
    moments: moments.docs.map((m) => ({
      cid: typeof m.child === 'object' ? m.child.id : m.child,
      cat: m.category,
      date: m.date,
      text: m.text ?? '',
      mile: m.milestoneKey ?? undefined,
      mj: m.source === 'majelis' ? '1' : undefined,
    })),
    miles: milesMap,
  }

  return JSON.stringify(backupObj, null, 2)
}
