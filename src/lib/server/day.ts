import 'server-only'
import { unstable_cache } from 'next/cache'
import type { Child, Family, Parent } from '@/payload-types'
import { CONTENT_TAG } from '@/fields/content'
import { WAKTU_KEYS, type Waktu } from '@/lib/curriculum/constants'
import { addDays, ageMonths, bandOf, isDue, prayerFor, themeInfo } from '@/lib/curriculum/core'
import { tasksFor, type ModuleLite, type TasksByWaktu } from '@/lib/curriculum/tasks'
import { childOpenOn } from './billing'
import { getBands, getMajelis, getThemes, getThemeWeek } from './content'
import { payloadClient } from './payload'

export const FAMILY_MAJELIS = 'majelis'

const approved = () => (process.env.CONTENT_INCLUDE_UNREVIEWED === 'true' ? { reviewStatus: { not_equals: 'revise' } } : { reviewStatus: { equals: 'approved' } })

/** Modul harian beserta kode cabangnya (di-cache, dibersihkan saat materi berubah). */
export const getDailyModules = unstable_cache(
  async (): Promise<ModuleLite[]> => {
    const p = await payloadClient()
    const res = await p.find({ collection: 'modules', where: { and: [approved(), { daily: { equals: true } }] }, limit: 0, pagination: false, depth: 1 })
    return res.docs.map((m) => ({
      code: m.code,
      branchCode: typeof m.branch === 'object' && m.branch ? m.branch.code : '',
      minMonths: m.minMonths,
      maxMonths: m.maxMonths,
      daily: !!m.daily,
      waktu: m.waktu ?? null,
      title: m.title,
      description: m.description ?? null,
      tier: m.tier ?? 'penuh',
    }))
  },
  ['content', 'dailyModules'],
  { tags: [CONTENT_TAG], revalidate: 3600 },
)

type Ctx = { parent: Parent; family: Family; children: Child[] }
export const childLite = (c: Child) => ({
  id: c.id,
  dob: c.dob,
  abilityOverrides: (c.abilityOverrides as Record<string, string> | null) ?? null,
  load: c.load ?? null,
  skipModules: Array.isArray(c.skipModules) ? (c.skipModules as string[]) : [],
})

/** Subuh besok dan Isya hari ini di kota keluarga, untuk menghitung jam tidur. */
export function sleepPrayer(family: Family, date: string) {
  const city = { city: family.city, lat: family.lat, lon: family.lon, tz: Number(family.tz ?? 7) }
  return { subuhBesok: prayerFor(city, addDays(date, 1)).subuh, isya: prayerFor(city, date).isya }
}

async function quranDueByChild(ctx: Ctx, date: string) {
  const p = await payloadClient()
  const res = await p.find({ collection: 'quranEntries', where: { family: { equals: ctx.family.id } }, limit: 0, pagination: false, depth: 0, overrideAccess: false, user: ctx.parent })
  const out: Record<string, string[]> = {}
  for (const e of res.docs) {
    const cid = typeof e.child === 'object' ? e.child.id : e.child
    if (isDue({ base: e.base, done: (e.done as number[]) ?? [] }, date)) (out[cid] ??= []).push(e.label)
  }
  return out
}

const emptyTasks = () => Object.fromEntries(WAKTU_KEYS.map((w) => [w, []])) as unknown as TasksByWaktu

/** Tugas setiap anak untuk satu tanggal. */
async function tasksOn(ctx: Ctx, date: string, quranDue: Record<string, string[]> = {}) {
  const [themes, bands, modules] = await Promise.all([getThemes(), getBands(), getDailyModules()])
  const th = themeInfo(ctx.family.themeStart, ctx.family.themeOffset ?? 0, date)
  const prayer = sleepPrayer(ctx.family, date)
  const theme = themes.find((t) => t.order === th.idx + 1) ?? null
  const kids = await Promise.all(
    ctx.children.map(async (c) => {
      const m = ageMonths(c.dob, date)
      const band = bandOf(bands, m)
      // Langganan belum aktif pada tanggal itu: tugas per anak tidak dikirim ke browser.
      if (!childOpenOn(ctx.family, c, date)) return { child: c, months: m, band, tasks: emptyTasks(), locked: true }
      const rows = theme ? await getThemeWeek(theme.id, band.id, th.week) : []
      const tasks = tasksFor({
        child: childLite(c),
        date,
        modules,
        theme: { idx: th.idx, week: th.week, dayIn: th.dayIn, bandCode: band.code, tasks: rows.length ? rows.map((r) => ({ text: r.text, waktu: r.waktu, order: r.order })) : null },
        quranDueLabels: quranDue[c.id] ?? [],
        prayer,
      })
      return { child: c, months: m, band, tasks, locked: false }
    }),
  )
  return { th, theme, kids }
}

async function logsBetween(ctx: Ctx, from: string, to: string) {
  const p = await payloadClient()
  const res = await p.find({
    collection: 'dailyLogs',
    where: { and: [{ family: { equals: ctx.family.id } }, { date: { greater_than_equal: from } }, { date: { less_than_equal: to } }] },
    limit: 0, pagination: false, depth: 0, overrideAccess: false, user: ctx.parent,
  })
  const map = new Map<string, Set<string>>() // `${date}|${childId|family}` → kunci tugas
  for (const l of res.docs) {
    const cid = l.child ? (typeof l.child === 'object' ? l.child.id : l.child) : 'family'
    map.set(`${l.date}|${cid}`, new Set((l.done as string[]) ?? []))
  }
  return map
}

export type DayKid = { id: string; name: string; dob: string; months: number; bandLabel: string; tasks: TasksByWaktu; done: string[]; load: string; locked: boolean }
export type DayData = {
  date: string
  themeIdx: number
  week: number
  dayIn: number
  theme: { title: string; surah: string } | null
  majelis: { story: string; questions: string[] } | null
  kids: DayKid[]
  familyDone: string[]
}

export async function getDay(ctx: Ctx, date: string): Promise<DayData> {
  const quranDue = await quranDueByChild(ctx, date)
  const [{ th, theme, kids }, logs] = await Promise.all([tasksOn(ctx, date, quranDue), logsBetween(ctx, date, date)])
  const mj = theme ? await getMajelis(theme.id, th.dayIn) : null
  return {
    date,
    themeIdx: th.idx,
    week: th.week,
    dayIn: th.dayIn,
    theme: theme ? { title: theme.title, surah: theme.surah } : null,
    majelis: mj ? { story: mj.story, questions: (mj.questions ?? []).map((q) => q.text) } : null,
    kids: kids.map((k) => ({
      id: k.child.id, name: k.child.name, dob: k.child.dob, months: k.months, bandLabel: k.band.label, tasks: k.tasks, load: k.child.load ?? 'seimbang', locked: k.locked,
      done: [...(logs.get(`${date}|${k.child.id}`) ?? [])],
    })),
    familyDone: [...(logs.get(`${date}|family`) ?? [])],
  }
}

/** Persentase tuntas keluarga per tanggal (untuk strip pekan, kebun, dan konsistensi). */
export async function progressRange(ctx: Ctx, from: string, to: string) {
  const logs = await logsBetween(ctx, from, to)
  const out: Record<string, { total: number; done: number; pct: number }> = {}
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const { kids, theme } = await tasksOn(ctx, d)
    let total = theme ? 1 : 0, done = 0
    if (theme && logs.get(`${d}|family`)?.has(FAMILY_MAJELIS)) done++
    for (const k of kids) {
      const set = logs.get(`${d}|${k.child.id}`)
      for (const w of WAKTU_KEYS as readonly Waktu[]) for (const t of k.tasks[w]) { total++; if (set?.has(t.id)) done++ }
    }
    out[d] = { total, done, pct: total ? done / total : 0 }
  }
  return out
}

/** Hari berturut-turut dengan ≥50% tugas tuntas (hari ini ikut dihitung bila sudah ≥50%). */
export function streakFrom(progress: Record<string, { pct: number }>, today: string) {
  let d = today, n = 0
  if ((progress[d]?.pct ?? 0) < 0.5) d = addDays(d, -1)
  while (progress[d] && progress[d].pct >= 0.5) { n++; d = addDays(d, -1) }
  return n
}
