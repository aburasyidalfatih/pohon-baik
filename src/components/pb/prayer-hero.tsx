'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { currentWaktu, localNow, nextPrayer } from '@/lib/curriculum/core'
import { toMinutes, type PrayerKey, type PrayerTimes } from '@/lib/prayer/praytimes'
import { cn } from '@/lib/utils'
import { SkyScene } from './sky'

const NAMES: Record<PrayerKey, string> = { subuh: 'Subuh', terbit: 'Terbit', dzuhur: 'Dzuhur', ashar: 'Ashar', maghrib: 'Maghrib', isya: 'Isya' }
const KEYS = Object.keys(NAMES) as PrayerKey[]
const fmtCountdown = (mins: number) => {
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60)
  return h ? `${h} j ${m} m` : `${m} menit`
}
const fmtCountdownLong = (mins: number) => {
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60)
  return h ? `${h} jam ${m} menit` : `${m} menit`
}

/**
 * Menit-dalam-hari pada zona waktu keluarga. Nilai awal dari server (HTML pertama sudah benar),
 * lalu berdetak tiap 20 detik dan langsung diperbarui saat aplikasi kembali terlihat.
 * Dipakai bersama oleh PrayerHero dan lencana "Sekarang" di Hari ini agar keduanya selalu sama.
 */
export function useNowMin(tz: number, initial: number, enabled = true) {
  const [nowMin, setNowMin] = useState(initial)
  useEffect(() => {
    if (!enabled) return
    const tick = () => setNowMin(localNow(tz).minutes)
    const id = setInterval(tick, 20000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [tz, enabled])
  return nowMin
}

/**
 * Kartu waktu shalat yang ringkas (±130px) di Hari ini: hitung mundur ke shalat berikutnya
 * di atas langit yang mengikuti waktu. Bila `nowMin` diberikan, jam dikendalikan induk
 * (lihat `useNowMin`); bila tidak, kartu berdetak sendiri dari `initialNowMin`.
 */
export function PrayerHero({ greeting, city, tz = 7, today, tomorrow, nowMin: controlled, initialNowMin = 0 }: {
  greeting: string
  city: string
  tz?: number
  today: PrayerTimes
  tomorrow: PrayerTimes
  nowMin?: number
  initialNowMin?: number
}) {
  const own = useNowMin(tz, initialNowMin, controlled === undefined)
  const nowMin = controlled ?? own
  const waktu = currentWaktu(today, nowMin)
  const np = nextPrayer(today, tomorrow, nowMin)

  return (
    <section aria-label="Waktu shalat" className={cn('relative my-2.5 overflow-hidden rounded-[24px] px-4 pt-3 pb-2.5 text-white shadow-float', `sky-${waktu}`)}>
      <SkyScene waktu={waktu} pt={today} nowMin={nowMin} className="pointer-events-none absolute inset-0 size-full" />
      {/* Selubung tipis agar teks putih tetap terbaca (≥4,5:1) di langit terang seperti Ashar/Dzuhur. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/15 to-black/10" />
      <div className="relative [text-shadow:0_1px_6px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[0.8125rem] font-medium">{greeting}</p>
          <span className="flex flex-none items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[0.75rem] font-medium whitespace-nowrap">
            <MapPin size={12} aria-hidden /> {city}
          </span>
        </div>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2" aria-label={`${fmtCountdownLong(np.mins)} lagi menuju ${NAMES[np.k]}, pukul ${np.t}`}>
          <span className="text-[1.875rem] leading-none font-bold tracking-[-0.02em] tabular-nums" aria-hidden>{fmtCountdown(np.mins)}</span>
          <span className="text-[0.875rem] font-medium" aria-hidden>menuju {NAMES[np.k]} · {np.t}</span>
        </p>
      </div>
      <ol className="relative mt-2.5 grid grid-cols-6 gap-0.5 rounded-[14px] bg-black/25 p-0.5" aria-label="Jadwal shalat hari ini">
        {KEYS.map((k) => {
          const next = k === np.k
          const past = !next && toMinutes(today[k]) <= nowMin
          return (
            <li key={k} aria-current={next ? 'time' : undefined} className={cn('rounded-[11px] py-1 text-center leading-tight', next && 'bg-white/25 font-semibold', past && 'text-white/75')}>
              <span className="block text-[0.6875rem]">{NAMES[k]}</span>
              <b className="block text-[0.8125rem] tabular-nums">{today[k]}</b>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
