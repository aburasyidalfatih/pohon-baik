// Perkiraan waktu shalat (parameter mirip Kemenag RI: Subuh 20°, Isya 18°,
// Ashar madzhab Syafi'i, ihtiyat). Dipindah apa adanya dari prototype
// `app/praytimes.js`; perilakunya dijaga oleh uji golden di tests/int.

export type PrayerKey = 'subuh' | 'terbit' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'
export type PrayerTimes = Record<PrayerKey, string> // "HH:MM" waktu lokal kota

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const fix = (a: number, b: number) => {
  const x = a - b * Math.floor(a / b)
  return x < 0 ? x + b : x
}

function julian(y: number, m: number, d: number) {
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * D, 360)
  const q = fix(280.459 + 0.98564736 * D, 360)
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360)
  const e = 23.439 - 0.00000036 * D
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15
  const eqt = q / 15 - fix(RA, 24)
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))))
  return { decl, eqt }
}

const IHTIYAT: Record<PrayerKey, number> = { subuh: 2, terbit: -2, dzuhur: 3, ashar: 2, maghrib: 2, isya: 2 }

/** @param isoDate tanggal lokal "YYYY-MM-DD" */
export function computePrayerTimes(isoDate: string, lat: number, lng: number, tz: number): PrayerTimes {
  const [y, m, d] = isoDate.split('-').map(Number)
  const jd = julian(y, m, d) - lng / (15 * 24)
  const midday = (t: number) => fix(12 - sunPosition(jd + t / 24).eqt, 24)
  const angleTime = (angle: number, t: number, ccw = false) => {
    const { decl } = sunPosition(jd + t / 24)
    const noon = midday(t)
    const cosv =
      (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) / (Math.cos(rad(decl)) * Math.cos(rad(lat)))
    const T = deg(Math.acos(Math.max(-1, Math.min(1, cosv)))) / 15
    return noon + (ccw ? -T : T)
  }
  const asrTime = (factor: number, t: number) => {
    const { decl } = sunPosition(jd + t / 24)
    const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - decl))))))
    return angleTime(angle, t)
  }

  let t: Record<PrayerKey, number> = { subuh: 5, terbit: 6, dzuhur: 12, ashar: 13, maghrib: 18, isya: 18 }
  for (let i = 0; i < 2; i++) {
    t = {
      subuh: angleTime(20, t.subuh, true),
      terbit: angleTime(0.833, t.terbit, true),
      dzuhur: midday(t.dzuhur),
      ashar: asrTime(1, t.ashar),
      maghrib: angleTime(0.833, t.maghrib),
      isya: angleTime(18, t.isya),
    }
  }
  const adj = tz - lng / 15
  const out = {} as PrayerTimes
  for (const k of Object.keys(t) as PrayerKey[]) {
    const h = fix(t[k] + adj + IHTIYAT[k] / 60, 24)
    const hh = Math.floor(h)
    const mm = Math.floor((h - hh) * 60)
    out[k] = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  return out
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
