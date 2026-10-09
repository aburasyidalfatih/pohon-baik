import { describe, expect, it } from 'vitest'
import { computePrayerTimes } from '@/lib/prayer/praytimes'
import { CITIES } from '@/lib/curriculum/constants'
import {
  addDays,
  ageLabel,
  ageMonths,
  bandOf,
  currentWaktu,
  daysBetween,
  localNow,
  nextPrayer,
  nextReview,
  phaseOf,
  themeInfo,
} from '@/lib/curriculum/core'
import { loadPrototype } from '../../scripts/load-prototype'

const proto = loadPrototype()

describe('waktu shalat (golden: sama persis dengan prototype)', () => {
  it('semua kota, setiap 5 hari selama 2026–2027', () => {
    let checked = 0
    for (const [, [, lat, lng, tz]] of Object.entries(CITIES)) {
      for (let i = 0; i < 730; i += 5) {
        const iso = addDays('2026-01-01', i)
        const [y, m, d] = iso.split('-').map(Number)
        expect(computePrayerTimes(iso, lat, lng, tz)).toEqual(proto.PrayTimes.compute(new Date(y, m - 1, d), lat, lng, tz))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(4000)
  })

  it('Jakarta 2 Okt 2026 mendekati jadwal Kemenag', () => {
    expect(computePrayerTimes('2026-10-02', -6.2088, 106.8456, 7)).toEqual({
      subuh: '04:21', terbit: '05:35', dzuhur: '11:45', ashar: '14:49', maghrib: '17:48', isya: '18:58',
    })
  })
})

describe('usia', () => {
  it('menghitung bulan penuh', () => {
    expect(ageMonths('2024-05-20', '2026-10-02')).toBe(28)
    expect(ageMonths('2024-05-20', '2026-09-19')).toBe(27)
    expect(ageMonths('2026-09-30', '2026-10-02')).toBe(0)
    expect(ageLabel('2026-09-30', '2026-10-02')).toBe('2 hari')
    expect(ageLabel('2025-01-01', '2026-10-02')).toBe('21 bulan')
    expect(ageLabel('2024-05-20', '2026-10-02')).toBe('2 th 4 bln')
  })
  it('fase & kelompok usia mengikuti batas prototype', () => {
    const bands = proto.BANDS.map((b) => ({ code: b.id, minMonths: b.min, maxMonths: b.max }))
    for (let m = 0; m <= 200; m++) {
      const want = proto.BANDS.find((b) => m >= b.min && m <= b.max) ?? proto.BANDS[proto.BANDS.length - 1]
      expect(bandOf(bands, m).code).toBe(want.id)
    }
    expect(phaseOf(0).id).toBe('F1')
    expect(phaseOf(36).id).toBe('F2')
    expect(phaseOf(250).id).toBe('F5')
  })
})

describe('tema 28 hari', () => {
  it('hari, minggu, dan pergantian tema', () => {
    expect(themeInfo('2026-09-29', 0, '2026-10-02')).toMatchObject({ idx: 0, dayIn: 4, week: 1 })
    expect(themeInfo('2026-09-01', 0, '2026-09-29')).toMatchObject({ idx: 1, dayIn: 1, monthStart: '2026-09-29' })
    expect(themeInfo('2026-01-01', 11, '2026-01-29').idx).toBe(0) // berputar setelah 12
  })
})

describe('kartu waktu aktif', () => {
  const pt = computePrayerTimes('2026-10-02', -6.2088, 106.8456, 7) // 04:21 05:35 11:45 14:49 17:48 18:58
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }
  it.each([
    ['03:00', 'isya'], ['04:21', 'subuh'], ['05:34', 'subuh'], ['05:35', 'pagi'], ['11:45', 'dzuhur'],
    ['14:49', 'ashar'], ['17:48', 'maghrib'], ['18:58', 'isya'], ['23:59', 'isya'],
  ])('%s → %s', (t, w) => expect(currentWaktu(pt, at(t))).toBe(w))

  it('shalat berikutnya melewati tengah malam', () => {
    const tomorrow = computePrayerTimes('2026-10-03', -6.2088, 106.8456, 7)
    expect(nextPrayer(pt, tomorrow, at('11:00'))).toMatchObject({ k: 'dzuhur', mins: 45 })
    expect(nextPrayer(pt, tomorrow, at('20:00')).k).toBe('subuh')
  })

  it('jam lokal keluarga tidak bergantung zona server', () => {
    const utcNoon = Date.UTC(2026, 9, 2, 17, 30) // 00:30 WIB tanggal 3
    expect(localNow(7, utcNoon)).toMatchObject({ date: '2026-10-03', minutes: 30 })
    expect(localNow(9, utcNoon).date).toBe('2026-10-03')
  })
})

describe('murajaah berjarak', () => {
  it('jadwal 1, 2, 4, 7, 14, 30 hari lalu mutqin', () => {
    expect(nextReview({ base: '2026-10-01', done: [] })).toEqual({ interval: 1, date: '2026-10-02' })
    expect(nextReview({ base: '2026-10-01', done: [1, 2, 4] })).toEqual({ interval: 7, date: '2026-10-08' })
    expect(nextReview({ base: '2026-10-01', done: [1, 2, 4, 7, 14, 30] })).toBeNull()
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30)
  })
})

describe('materi prototype lengkap', () => {
  it('jumlah sesuai laporan materi', () => {
    let tasks = 0
    for (const t of Object.values(proto.THEME_PLANS)) for (const weeks of Object.values(t)) for (const w of weeks) tasks += w.length
    expect(tasks).toBe(1129)
    expect(proto.MODULES).toHaveLength(167)
    expect(Object.values(proto.MAJELIS).flat()).toHaveLength(336)
    expect(proto.PROFIL).toHaveLength(15)
    expect(proto.THEMES).toHaveLength(12)
  })

  it('tanda perlu konsultasi menutup usia 0–191 bulan tanpa celah dan tumpang tindih', () => {
    const w = [...proto.WARNINGS].sort((x, y) => x.min - y.min)
    expect(w[0].min).toBe(0)
    expect(w.at(-1)!.max).toBe(191)
    for (let i = 1; i < w.length; i++) expect(w[i].min).toBe(w[i - 1].max + 1)
  })

  it('kartu layanan krisis tersedia untuk semua usia', () => {
    const m = proto.MODULES.find((x) => x.id === 'd3-layanan-krisis')
    expect(m?.min).toBe(0)
    expect(m?.max).toBe(191)
  })
})
