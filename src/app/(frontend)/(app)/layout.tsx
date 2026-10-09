import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppRuntime } from '@/components/pb/app-runtime'
import { FeedbackProvider } from '@/components/pb/feedback'
import { TabBar } from '@/components/pb/shell'
import { ThemeSync } from '@/components/pb/theme-sync'
import { isDue, localNow } from '@/lib/curriculum/core'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'

// Halaman aplikasi selalu dirender per permintaan (data per keluarga).
export const dynamic = 'force-dynamic'

/** Jumlah hafalan yang jatuh tempo hari ini (lencana tab Qur'an). */
async function quranDueCount(familyId: string, parent: NonNullable<Awaited<ReturnType<typeof getParent>>>, today: string) {
  try {
    const p = await payloadClient()
    const res = await p.find({
      collection: 'quranEntries',
      where: { family: { equals: familyId } },
      limit: 0, pagination: false, depth: 0, select: { base: true, done: true },
      overrideAccess: false, user: parent,
    })
    return res.docs.filter((e) => isDue({ base: e.base, done: (e.done as number[]) ?? [] }, today)).length
  } catch {
    return 0
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const parent = await getParent()
  if (!parent) redirect('/masuk')
  const ctx = await getFamily()
  const tz = Number(ctx?.family.tz ?? 7)
  const today = localNow(tz).date
  const due = ctx ? await quranDueCount(ctx.family.id, parent, today) : 0
  return (
    <FeedbackProvider>
      {/* #pb-app dibuat `inert` saat sheet/overlay terbuka (lihat components/pb/sheet.tsx). */}
      <div id="pb-app" className="relative mx-auto min-h-dvh max-w-[560px] sm:shadow-[0_0_0_1px_var(--line)]">
        <ThemeSync appearance={ctx?.family.appearance ?? 'auto'} />
        <main className="px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>
        <TabBar badges={{ '/quran': due }} />
      </div>
      <AppRuntime today={today} tz={tz} />
    </FeedbackProvider>
  )
}
