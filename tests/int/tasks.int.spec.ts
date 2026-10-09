import { describe, expect, it } from 'vitest'
import { sleepInfo, WAKTU_KEYS, type Load } from '@/lib/curriculum/constants'
import { addDays, ageMonths, bandOf, themeInfo, weekday } from '@/lib/curriculum/core'
import { countTasks, effMonths, tasksFor, themeTasksToday, type ModuleLite } from '@/lib/curriculum/tasks'
import { loadPrototype } from '../../scripts/load-prototype'

const P = loadPrototype()
const tierOf = (lv?: number) => (lv === 1 ? 'inti' : lv === 2 ? 'seimbang' : 'penuh')
const modules: ModuleLite[] = P.MODULES.map((m) => ({
  code: m.id, branchCode: m.c, minMonths: m.min, maxMonths: m.max, daily: m.daily, waktu: m.w ?? null, title: m.t, description: m.d, tier: tierOf(m.lv),
}))
const bands = P.BANDS.map((b) => ({ code: b.id, minMonths: b.min, maxMonths: b.max }))

function build(dob: string, date: string, opt: { load?: Load; overrides?: Record<string, string>; skip?: string[]; themeStart?: string } = {}) {
  const th = themeInfo(opt.themeStart ?? '2026-09-29', 0, date)
  const band = bandOf(bands, ageMonths(dob, date))
  const plan = P.THEME_PLANS[th.idx]?.[band.code]?.[th.week - 1] ?? null
  return tasksFor({
    child: { id: 'k', dob, abilityOverrides: opt.overrides, load: opt.load, skipModules: opt.skip },
    date,
    modules,
    theme: { idx: th.idx, week: th.week, dayIn: th.dayIn, bandCode: band.code, tasks: plan && plan.map((x, order) => ({ text: x.t, waktu: x.w, order })) },
  })
}
const ids = (t: ReturnType<typeof build>) => WAKTU_KEYS.flatMap((w) => t[w].map((x) => x.id))
const dobAt = (m: number, date = '2026-10-02') => {
  const y = 2026 - Math.floor(m / 12), mo = 10 - (m % 12)
  return `${mo > 0 ? y : y - 1}-${String(mo > 0 ? mo : mo + 12).padStart(2, '0')}-02`
}

describe('tasksFor', () => {
  it('anak 2 th 4 bln (Penuh): modul sesuai usia, tanpa modul bayi, tugas tema di urutan teratas', () => {
    const t = build('2024-05-20', '2026-10-02', { load: 'penuh' })
    expect(ids(t)).toContain('a1-dzikir-tiru')
    expect(ids(t)).not.toContain('a1-dzikir-bayi')
    const tema = ids(t).filter((x) => x.startsWith('tema-'))
    expect(tema.length).toBeGreaterThan(0)
    for (const w of WAKTU_KEYS) {
      const i = t[w].findIndex((x) => x.kind !== 'tema')
      if (i > 0) expect(t[w].slice(i).every((x) => x.kind !== 'tema')).toBe(true)
    }
    expect(t.isya.at(-1)?.id).toBe('tidur')
  })

  it('setiap modul yang muncul berada dalam rentang usia dan bebannya, untuk semua usia 0–15 th', () => {
    for (const load of ['inti', 'seimbang', 'penuh'] as const) {
      for (let m = 0; m <= 191; m += 1) {
        const t = build(dobAt(m), '2026-10-02', { load })
        for (const w of WAKTU_KEYS) {
          for (const x of t[w]) {
            if (x.kind !== 'mod') continue
            const mod = P.MODULES.find((z) => z.id === x.id)!
            expect(m >= mod.min && m <= mod.max, `${x.id} pada usia ${m} bln`).toBe(true)
            expect(mod.w).toBe(w)
            if (load === 'inti') expect(mod.lv, `${x.id} bukan modul Inti`).toBe(1)
            if (load === 'seimbang') expect([1, 2]).toContain(mod.lv)
          }
        }
        expect(countTasks(t)).toBeGreaterThan(0)
      }
    }
  })

  it('beban harian bertingkat: Inti 3–5 modul, Seimbang ≤10, Penuh paling banyak', () => {
    for (let m = 0; m <= 191; m += 1) {
      const n = (load: Load) => ids(build(dobAt(m), '2026-10-02', { load })).filter((x) => modules.some((z) => z.code === x)).length
      const [inti, seimbang, penuh] = [n('inti'), n('seimbang'), n('penuh')]
      expect(inti, `Inti pada ${m} bln`).toBeGreaterThanOrEqual(3)
      expect(inti, `Inti pada ${m} bln`).toBeLessThanOrEqual(5)
      expect(seimbang, `Seimbang pada ${m} bln`).toBeLessThanOrEqual(10)
      expect(inti).toBeLessThanOrEqual(seimbang)
      expect(seimbang).toBeLessThanOrEqual(penuh)
    }
  })

  it('di atas 15 tahun tidak ada tugas', () => {
    expect(countTasks(build('2010-01-01', '2026-10-02'))).toBe(0)
  })

  it('penyesuaian kemampuan menggeser usia efektif per cabang', () => {
    const child = { id: 'k', dob: '2024-05-20', abilityOverrides: { B2: 'F2' } }
    expect(effMonths(child, 'B2', '2026-10-02')).toBe(36)
    expect(effMonths(child, 'A1', '2026-10-02')).toBe(28)
  })

  it('modul yang sudah dikuasai bisa disembunyikan per anak', () => {
    const before = ids(build('2024-05-20', '2026-10-02', { load: 'penuh' }))
    expect(before).toContain('a1-dzikir-tiru')
    const after = ids(build('2024-05-20', '2026-10-02', { load: 'penuh', skip: ['a1-dzikir-tiru'] }))
    expect(after).not.toContain('a1-dzikir-tiru')
  })
})

describe('rotasi tugas tema', () => {
  const tasks = [0, 1, 2, 3].map((order) => ({ order }))
  it('Seimbang: satu tugas per hari, semua kebagian dalam sepekan', () => {
    const seen = new Set<number>()
    for (let d = 0; d < 7; d++) {
      const r = themeTasksToday(tasks, 'seimbang', d, (d + 1) % 7)
      expect(r).toHaveLength(1)
      seen.add(r[0].order)
    }
    expect(seen.size).toBe(4)
  })
  it('Penuh: dua tugas berbeda per hari', () => {
    for (let d = 0; d < 7; d++) {
      const r = themeTasksToday(tasks, 'penuh', d, d)
      expect(r).toHaveLength(2)
      expect(r[0].order).not.toBe(r[1].order)
    }
  })
  it('Inti: hanya Sabtu dan Ahad', () => {
    for (let wd = 0; wd < 7; wd++) expect(themeTasksToday(tasks, 'inti', 0, wd)).toHaveLength(wd === 0 || wd === 6 ? 1 : 0)
  })
  it('tugas tema tidak lagi muncul semua setiap hari', () => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays('2026-09-29', i))
    const perDay = dates.map((d) => ids(build('2018-01-15', d, { load: 'seimbang' })).filter((x) => x.startsWith('tema-')).length)
    expect(perDay.every((n) => n === 1)).toBe(true)
    const inti = dates.map((d) => ({ wd: weekday(d), n: ids(build('2018-01-15', d, { load: 'inti' })).filter((x) => x.startsWith('tema-')).length }))
    for (const x of inti) expect(x.n).toBe(x.wd === 0 || x.wd === 6 ? 1 : 0)
  })
})

describe('jam tidur dari waktu Subuh', () => {
  const pt = { subuhBesok: '04:15', isya: '18:55' }
  it('anak 8 th: tidur setelah Isya, kekurangan ditutup qailulah', () => {
    const s = sleepInfo(96, pt)
    expect(s.pukul).toBe('±19.45')
    expect(s.qailulah).toBe(60)
  })
  it('remaja 14 th: tidur ±20.30 + qailulah, target 8–10 jam', () => {
    const s = sleepInfo(168, pt)
    expect(s.jam).toBe('8–10 jam')
    expect(s.pukul).toBe('±20.30')
    expect(s.qailulah).toBe(45)
  })
  it('anak di bawah 6 th tidak dihitung dari Subuh', () => {
    expect(sleepInfo(48, pt).qailulah).toBeUndefined()
  })
  it('tugas qailulah muncul di Ba’da Dzuhur bila tidur malam kurang', () => {
    const t = tasksFor({ child: { id: 'k', dob: '2018-01-15', load: 'inti' }, date: '2026-10-02', modules, theme: { idx: 0, week: 1, bandCode: 'F3', tasks: null }, prayer: pt })
    expect(t.dzuhur.map((x) => x.id)).toContain('qailulah')
    expect(t.isya.at(-1)?.t).toBe('Tidur ±19.45')
  })
})
