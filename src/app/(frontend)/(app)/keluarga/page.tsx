import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { localNow } from '@/lib/curriculum/core'
import { rupiah } from '@/lib/billing/rules'
import { billingFor } from '@/lib/server/billing'
import { getBranchList, getThemes } from '@/lib/server/content'
import { getFamily, getParent } from '@/lib/server/payload'
import { signOut } from '../../(auth)/actions'
import { KeluargaView } from './view'

export const metadata = { title: 'Keluarga' }

export default async function KeluargaPage() {
  const [parent, ctx, branchList, themes] = await Promise.all([getParent(), getFamily(), getBranchList(), getThemes()])
  if (!parent || !ctx) redirect('/masuk')
  const { family, children } = ctx

  const tz = Number(family.tz ?? 7)
  const today = localNow(tz).date

  const b = billingFor(ctx)
  const billing =
    b.locked.length ? { summary: `${b.locked.length} anak belum aktif · ${rupiah(b.price)}/anak/tahun`, attention: true }
    : b.trialDaysLeft > 0 && b.children.some((c) => c.status === 'trial') ? { summary: `Masa coba gratis · ${b.trialDaysLeft} hari lagi`, attention: !!b.remind }
    : b.remind ? { summary: `Perlu diperpanjang ${b.remind.daysLeft} hari lagi`, attention: true }
    : { summary: b.children.length ? 'Semua anak aktif' : `Gratis 1 bulan, lalu ${rupiah(b.price)}/anak/tahun`, attention: false }

  return (
    <PageTransition>
      <KeluargaView
        today={today}
        billing={billing}
        themes={themes.map((t) => ({ order: t.order, title: t.title, surah: t.surah }))}
        parent={{
          id: parent.id,
          name: parent.name,
          email: parent.email,
        }}
        family={{
          id: family.id,
          name: family.name,
          city: family.city,
          lat: family.lat,
          lon: family.lon,
          tz: family.tz,
          themeStart: family.themeStart,
          themeOffset: family.themeOffset ?? 0,
          appearance: family.appearance,
        }}
        kids={children.map((c) => ({
          id: c.id,
          name: c.name,
          dob: c.dob,
          sex: c.sex,
          abilityOverrides: c.abilityOverrides as Record<string, string> | null,
          load: c.load ?? 'seimbang',
          tahfidzTarget: c.tahfidzTarget ?? 'juz30',
          skipModules: Array.isArray(c.skipModules) ? (c.skipModules as string[]) : [],
        }))}
        branches={branchList.map((b) => ({ code: b.code, name: b.name }))}
        signOutAction={signOut}
      />
    </PageTransition>
  )
}
