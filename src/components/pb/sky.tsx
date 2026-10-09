import { useId } from 'react'
import { toMinutes, type PrayerTimes } from '@/lib/prayer/praytimes'
import type { Waktu } from '@/lib/curriculum/constants'

const STARS: [number, number, number][] = [
  [30, 22, 1.2], [64, 48, 0.8], [96, 16, 1], [140, 36, 0.7], [182, 20, 1.1], [220, 52, 0.8], [250, 14, 0.9], [288, 66, 0.7],
  [334, 26, 1.2], [48, 84, 0.6], [120, 74, 0.7], [200, 92, 0.6], [262, 100, 0.7], [320, 86, 0.6], [160, 8, 0.8], [90, 108, 0.5],
]

/**
 * Langit yang mengikuti waktu shalat: posisi matahari nyata di siang hari, bulan & bintang di malam hari.
 * Ini ilustrasi, jadi warna hex di sini disengaja (bukan token tema). Kedip bintang dimatikan oleh
 * aturan reduced-motion global. Teks di atasnya perlu selubung gelap (lihat PrayerHero) agar lolos AA.
 */
export function SkyScene({ waktu, pt, nowMin, className, landscape = true }: {
  waktu: Exclude<Waktu, 'hari'>
  pt: PrayerTimes
  nowMin: number
  className?: string
  landscape?: boolean
}) {
  // id unik: hero dan Majelis Malam bisa tampil bersamaan di satu dokumen.
  const glow = `pb-sun-glow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const day = waktu === 'pagi' || waktu === 'dzuhur' || waktu === 'ashar'
  let sun: { x: number; y: number } | null = null
  if (day) {
    const a = toMinutes(pt.terbit), b = toMinutes(pt.maghrib)
    const f = Math.min(1, Math.max(0, (nowMin - a) / (b - a)))
    // Busur di sisi kanan agar tidak berada di belakang angka hitung mundur (kiri).
    sun = { x: Math.round(215 + f * 130), y: Math.round(160 - Math.sin(f * Math.PI) * 100) }
  }
  const nStars = waktu === 'isya' ? STARS.length : waktu === 'maghrib' ? 6 : 10
  return (
    <svg className={className} viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#fff3c4" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      {sun ? (
        <>
          <g fill="#fff" opacity=".16">
            <ellipse cx="210" cy="34" rx="38" ry="8" />
            <ellipse cx="230" cy="28" rx="20" ry="9" />
            <ellipse cx="318" cy="98" rx="30" ry="7" />
          </g>
          <circle cx={sun.x} cy={sun.y} r="60" fill={`url(#${glow})`} opacity=".5" />
          <circle cx={sun.x} cy={sun.y} r="12" fill="#fff8e1" opacity=".9" />
        </>
      ) : (
        <>
          {STARS.slice(0, nStars).map(([x, y, r], i) => (
            <circle key={i} className="star" cx={x} cy={y} r={r} style={{ animationDelay: `${((i * 0.37) % 3).toFixed(2)}s` }} />
          ))}
          {waktu === 'subuh' && <ellipse cx="180" cy="215" rx="240" ry="70" fill="#ffb98a" opacity=".35" />}
          {waktu === 'maghrib' && <ellipse cx="300" cy="215" rx="220" ry="70" fill="#ff9a5c" opacity=".4" />}
          {waktu !== 'subuh' && <path transform="translate(312 46) rotate(-25)" d="M0-13A13 13 0 0 0 0 13A16 16 0 0 1 0-13z" fill="#fdf3cf" />}
        </>
      )}
      {landscape && (
        <>
          <path d="M0 182c60-26 120-18 180-12s120-18 180-8v38H0z" fill="#000" opacity=".13" />
          <path d="M0 194c90-18 200-4 360-14v20H0z" fill="#000" opacity=".12" />
          <g opacity=".2" fill="#000">
            <rect x="316" y="152" width="3" height="14" />
            <circle cx="317.5" cy="148" r="9" />
          </g>
        </>
      )}
    </svg>
  )
}
