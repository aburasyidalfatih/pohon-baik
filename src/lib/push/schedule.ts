// Kapan pengingat dikirim (fungsi murni, teruji). Cron boleh berjalan tiap 5 menit atau tidak teratur:
// pengingat dikirim sekali per waktu, dalam jendela WINDOW_MIN menit setelah waktu shalat masuk.
import type { PrayerTimes } from '@/lib/prayer/praytimes'

export const PUSH_WAKTU = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const
export type PushWaktu = (typeof PUSH_WAKTU)[number]
export const WINDOW_MIN = 40

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Waktu yang perlu diingatkan sekarang (atau null). `lastSent` = kunci `tanggal|waktu` terakhir yang terkirim. */
export function dueWaktu(pt: PrayerTimes, date: string, nowMin: number, lastSent?: string | null): PushWaktu | null {
  // Ambil waktu terakhir yang sudah masuk: bila dua waktu lewat (cron sempat mati), hanya yang terbaru.
  let due: PushWaktu | null = null
  for (const w of PUSH_WAKTU) {
    const start = toMin(pt[w])
    if (nowMin >= start && nowMin < start + WINDOW_MIN) due = w
  }
  if (!due || lastSent === `${date}|${due}`) return null
  return due
}

/** Teks notifikasi ringkas: maksimal 2 tugas per anak, sisanya dihitung. */
export function composeBody(kids: { name: string; tasks: string[] }[], majelis?: string | null) {
  const parts = kids
    .filter((k) => k.tasks.length)
    .map((k) => `${k.name}: ${k.tasks.slice(0, 2).join(', ')}${k.tasks.length > 2 ? ` +${k.tasks.length - 2}` : ''}`)
  if (majelis) parts.push(`Majelis Malam: ${majelis}`)
  return parts.join(' · ')
}
