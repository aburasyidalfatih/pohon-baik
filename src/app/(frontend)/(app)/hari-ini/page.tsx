import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { CITIES } from '@/lib/curriculum/constants'
import { addDays, localNow, prayerFor, themeInfo, weekday } from '@/lib/curriculum/core'
import { fmtDate, hijri } from '@/lib/format'
import { getBranches } from '@/lib/server/content'
import { billingFor } from '@/lib/server/billing'
import { getDay, progressRange, streakFrom } from '@/lib/server/day'
import { getFamily, getParent } from '@/lib/server/payload'
import { HariIniView } from './view'

export const metadata = { title: 'Hari ini' }
const HARI3 = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default async function HariIniPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const { family } = ctx

  // Semua perhitungan waktu memakai zona waktu keluarga, bukan zona server.
  const tz = Number(family.tz ?? 7)
  const now = localNow(tz)
  const today = now.date
  const { d } = await searchParams
  const date = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today
  const isToday = date === today
  const city = { city: family.city, lat: family.lat, lon: family.lon, tz }
  const pt = prayerFor(city, date)

  const weekStart = addDays(date, -((weekday(date) + 6) % 7)) // Senin
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const lastShown = week[6] < today ? week[6] : today
  const from = weekStart < addDays(today, -60) ? weekStart : addDays(today, -60)
  const s = { parent, ...ctx }
  const billing = billingFor(ctx)
  const [day, progress, branches] = await Promise.all([getDay(s, date), progressRange(s, from, lastShown >= from ? lastShown : from), getBranches()])

  // key={date}: tiap hari adalah "halaman" tersendiri sehingga geser hari memicu animasi masuk/keluar berarah.
  return (
    <PageTransition key={date}>
      <HariIniView
        key={date}
        day={day}
        today={today}
        dateLabel={`${fmtDate(date)} · ${hijri(date)}`}
        weekday={weekday(date)}
        isToday={isToday}
        hero={isToday ? {
          greeting: `Assalamu'alaikum, ${family.name}`,
          city: CITIES[family.city]?.[0] ?? 'Lokasi saya',
          tz,
          today: pt,
          tomorrow: prayerFor(city, addDays(today, 1)),
          nowMin: now.minutes,
        } : null}
        prayerLine={`Subuh ${pt.subuh} · Dzuhur ${pt.dzuhur} · Ashar ${pt.ashar} · Maghrib ${pt.maghrib} · Isya ${pt.isya}`}
        week={week.map((x) => ({ date: x, label: HARI3[weekday(x)], full: fmtDate(x), n: Number(x.slice(8)), pct: progress[x]?.pct ?? 0 }))}
        prevDate={addDays(date, -1)}
        nextDate={addDays(date, 1)}
        streak={streakFrom(progress, today)}
        monthStart={themeInfo(family.themeStart, family.themeOffset ?? 0, date).monthStart}
        branches={branches}
        billing={{ price: billing.price, remind: billing.remind }}
      />
    </PageTransition>
  )
}
