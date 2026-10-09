// Logika inti kurikulum, dipindah dari prototype `app/app.js`.
// Semua tanggal berupa string ISO lokal "YYYY-MM-DD" dan "sekarang" dikirim
// secara eksplisit (zona waktu keluarga), sehingga hasil di server (UTC) dan
// di HP orang tua selalu sama.

import { computePrayerTimes, toMinutes, type PrayerKey, type PrayerTimes } from '../prayer/praytimes'
import { CITIES, INTERVALS, PHASES, type Phase, type Waktu } from './constants'

// ---------- tanggal ----------
const pad = (n: number) => String(n).padStart(2, '0')
export const isoFromParts = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
export function addDays(iso: string, n: number) {
  const t = new Date(utc(iso) + n * 86400000)
  return isoFromParts(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / 86400000)
export const weekday = (iso: string) => new Date(utc(iso)).getUTCDay() // 0 = Ahad

/** Tanggal & menit-dalam-hari saat ini pada zona waktu keluarga (WIB=7, WITA=8, WIT=9). */
export function localNow(tz: number, now: number = Date.now()) {
  const t = new Date(now + tz * 3600000)
  return {
    date: isoFromParts(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes() + t.getUTCSeconds() / 60,
  }
}

// ---------- usia ----------
export function ageMonths(dob: string, ref: string) {
  const [dy, dm, dd] = dob.split('-').map(Number)
  const [ry, rm, rd] = ref.split('-').map(Number)
  let m = (ry - dy) * 12 + (rm - dm)
  if (rd < dd) m--
  return Math.max(0, m)
}
export function ageLabel(dob: string, ref: string) {
  const m = ageMonths(dob, ref)
  if (m < 1) return `${Math.max(0, daysBetween(dob, ref))} hari`
  if (m < 24) return `${m} bulan`
  return `${Math.floor(m / 12)} th${m % 12 ? ` ${m % 12} bln` : ''}`
}
export const phaseOf = (m: number): Phase =>
  PHASES.find((p) => m >= p.min && m <= p.max) ?? (m > 191 ? PHASES[4] : PHASES[0])

export type BandLike = { code: string; minMonths: number; maxMonths: number }
export function bandOf<T extends BandLike>(bands: T[], m: number): T {
  const sorted = [...bands].sort((a, b) => a.minMonths - b.minMonths)
  return sorted.find((b) => m >= b.minMonths && m <= b.maxMonths) ?? sorted[sorted.length - 1]
}
/** Tahun usia untuk profil (0–14). */
export const profileYear = (m: number) => Math.min(14, Math.floor(m / 12))

export function nextBirthday(dob: string, ref: string): string {
  const [, dm, dd] = dob.split('-').map(Number)
  const [ry] = ref.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const thisYear = `${ry}-${pad(dm)}-${pad(dd)}`
  return thisYear >= ref ? thisYear : `${ry + 1}-${pad(dm)}-${pad(dd)}`
}

// ---------- tema 28 hari ----------
export function themeInfo(themeStart: string, themeOffset: number, date: string) {
  const days = Math.max(0, daysBetween(themeStart, date))
  const idx = (Number(themeOffset || 0) + Math.floor(days / 28)) % 12
  const dayIn = (days % 28) + 1
  return { idx, dayIn, week: Math.ceil(dayIn / 7), monthStart: addDays(themeStart, Math.floor(days / 28) * 28) }
}

// ---------- waktu shalat ----------
export type CityRef = { city: string; lat?: number | null; lon?: number | null; tz?: number | null }
export function cityParams(c: CityRef): [number, number, number] {
  if (c.city === 'custom' && c.lat != null && c.lon != null) return [Number(c.lat), Number(c.lon), Number(c.tz ?? 7)]
  const x = CITIES[c.city] ?? CITIES.jakarta
  return [x[1], x[2], x[3]]
}
export function prayerFor(c: CityRef, date: string): PrayerTimes {
  const [la, lo, tz] = cityParams(c)
  return computePrayerTimes(date, la, lo, tz)
}

/** Kartu aktif: Subuh→Terbit, Terbit→Dzuhur, Dzuhur→Ashar, Ashar→Maghrib, Maghrib→Isya, Isya→Subuh. */
export function currentWaktu(pt: PrayerTimes, nowMin: number): Exclude<Waktu, 'hari'> {
  if (nowMin < toMinutes(pt.subuh)) return 'isya'
  if (nowMin < toMinutes(pt.terbit)) return 'subuh'
  if (nowMin < toMinutes(pt.dzuhur)) return 'pagi'
  if (nowMin < toMinutes(pt.ashar)) return 'dzuhur'
  if (nowMin < toMinutes(pt.maghrib)) return 'ashar'
  if (nowMin < toMinutes(pt.isya)) return 'maghrib'
  return 'isya'
}

const FARDHU: PrayerKey[] = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']
export function nextPrayer(today: PrayerTimes, tomorrow: PrayerTimes, nowMin: number) {
  for (const k of FARDHU) if (toMinutes(today[k]) > nowMin) return { k, t: today[k], mins: toMinutes(today[k]) - nowMin }
  return { k: 'subuh' as PrayerKey, t: tomorrow.subuh, mins: 1440 - nowMin + toMinutes(tomorrow.subuh) }
}

// ---------- murajaah berjarak ----------
export type QuranEntry = { base: string; done: number[] }
export function nextReview(e: QuranEntry) {
  const n = INTERVALS.find((i) => !e.done.includes(i))
  return n ? { interval: n, date: addDays(e.base, n) } : null
}
export const isDue = (e: QuranEntry, date: string) => {
  const n = nextReview(e)
  return !!n && n.date <= date
}
