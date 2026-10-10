import { Baby } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { PageHeader } from '@/components/pb/ui'
import { buttonVariants, Card, EmptyState } from '@/components/ui/primitives'
import { LOADS, PHASES, SLOT_ILMU, screenRule, sleepInfo, WARNING_ALWAYS } from '@/lib/curriculum/constants'
import {
  ageLabel,
  ageMonths,
  bandOf,
  daysBetween,
  localNow,
  nextBirthday,
  phaseOf,
  profileYear,
} from '@/lib/curriculum/core'
import {
  getAgeProfile,
  getAllModules,
  getBands,
  getBranchList,
  getWarnings,
} from '@/lib/server/content'
import { addYears, PRICE_PER_CHILD_YEAR } from '@/lib/billing/rules'
import { childOpenOn } from '@/lib/server/billing'
import { sleepPrayer } from '@/lib/server/day'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import type { Branch, MomentCategory, Pustaka, RaporMap } from './types'
import { AnakView, LockedAnakView } from './view'

export const metadata = { title: 'Anakku' }

const SUBTITLE = 'Kenali tumbuh kembangnya, catat momen, isi rapor'

export default async function AnakPage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string; tab?: string; sem?: string }>
}) {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const { family, children } = ctx

  if (children.length === 0) {
    return (
      <PageTransition>
        <PageHeader title="Anakku" subtitle={SUBTITLE} />
        <Card>
          <EmptyState
            icon={<Baby size={28} />}
            title="Belum ada anak terdaftar"
            action={
              <Link href="/keluarga" className={buttonVariants({ variant: 'primary' })}>
                Tambah anak di menu Keluarga
              </Link>
            }
          >
            Tambahkan anak di menu Keluarga untuk mulai mengenali tumbuh kembangnya.
          </EmptyState>
        </Card>
      </PageTransition>
    )
  }

  const tz = Number(family.tz ?? 7)
  const now = localNow(tz)
  const today = now.date

  // `tab` dibaca di klien (AnakTabs) sehingga berganti sub-tab tidak perlu ke server.
  const { cid, sem } = await searchParams
  const activeChild = children.find((c) => c.id === cid) ?? children[0]
  const childIndex = Math.max(0, children.findIndex((c) => c.id === activeChild.id))

  const months = ageMonths(activeChild.dob, today)
  const currentPhase = phaseOf(months)
  const currentYear = profileYear(months)

  // Langganan belum aktif: profil, momen, rapor, dan modul tidak diambil; tanda bahaya tetap tampil.
  if (!childOpenOn(family, activeChild, today)) {
    const [warnings, profile, kurikulum] = await Promise.all([
      getWarnings(),
      getAgeProfile(currentYear),
      (await payloadClient()).findGlobal({ slug: 'kurikulum', depth: 0 }).catch(() => null),
    ])
    const w = warnings.find((x) => months >= x.minMonths && months <= x.maxMonths)
    return (
      <PageTransition>
        <LockedAnakView
          child={{ id: activeChild.id, name: activeChild.name }}
          childrenList={children.map((c) => ({ id: c.id, name: c.name }))}
          warnings={(w?.items ?? []).map((x) => (typeof x === 'string' ? x : x.text))}
          consult={(profile?.consult ?? []).map((c) => (typeof c === 'string' ? c : c.text))}
          warningAlways={kurikulum?.warningAlways || WARNING_ALWAYS}
          price={PRICE_PER_CHILD_YEAR}
        />
      </PageTransition>
    )
  }

  const daysLived = Math.max(0, daysBetween(activeChild.dob, today)) + 1
  const nbDate = nextBirthday(activeChild.dob, today)
  const daysToNextBirthday = Math.max(0, daysBetween(today, nbDate))
  // Awal tahun usia berjalan (ulang tahun terakhir), untuk "Kenang bersama".
  const lastBirthday = nbDate === today ? today : addYears(nbDate, -1) < activeChild.dob ? activeChild.dob : addYears(nbDate, -1)

  // Semester perhitungan rapor
  const defaultSemester = `${today.slice(0, 4)}-S${Number(today.slice(5, 7)) <= 6 ? 1 : 2}`
  const selectedSemester = sem || defaultSemester

  const payload = await payloadClient()

  // Ambil data konten & data pengguna secara paralel
  const [
    profileDoc,
    nextProfileDoc,
    bands,
    branchList,
    modules,
    warnings,
    milesRes,
    momentsRes,
    raporRes,
  ] = await Promise.all([
    getAgeProfile(currentYear),
    currentYear < 14 ? getAgeProfile(currentYear + 1) : Promise.resolve(null),
    getBands(),
    getBranchList(),
    getAllModules(),
    getWarnings(),
    payload.find({
      collection: 'milestones',
      where: {
        and: [{ family: { equals: family.id } }, { child: { equals: activeChild.id } }],
      },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      user: parent,
    }),
    payload.find({
      collection: 'moments',
      where: {
        and: [{ family: { equals: family.id } }, { child: { equals: activeChild.id } }],
      },
      // Cukup untuk "Kenang bersama" sejak ulang tahun terakhir.
      limit: 300,
      pagination: false,
      sort: '-date',
      depth: 1,
      overrideAccess: false,
      user: parent,
    }),
    payload.find({
      collection: 'raporEntries',
      where: {
        and: [
          { family: { equals: family.id } },
          { child: { equals: activeChild.id } },
          { semester: { equals: selectedSemester } },
        ],
      },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      user: parent,
    }),
  ])

  // Map milestones yang sudah tercapai
  const milestonesDone: Record<string, string> = {}
  for (const m of milesRes.docs) {
    milestonesDone[m.key] = m.seenAt || today
  }

  // Map rapor entries
  const raporMap: RaporMap = {}
  for (const r of raporRes.docs) {
    raporMap[r.branch] = { level: r.level ?? 0, note: r.note ?? '' }
  }

  // Susun cabang berdasarkan lapis
  const branchesByLapis: Record<string, Branch[]> = {
    Akar: [],
    Batang: [],
    Cabang: [],
    Buah: [],
  }
  for (const b of branchList) {
    if (branchesByLapis[b.lapis]) {
      branchesByLapis[b.lapis].push({ code: b.code, name: b.name, lapis: b.lapis })
    }
  }

  // Helper usia efektif per cabang bila ada abilityOverrides
  const childOverrides = (activeChild.abilityOverrides as Record<string, string> | null) ?? {}
  const effMonths = (branchCode: string) => {
    const ov = childOverrides[branchCode]
    if (ov && ov !== 'auto') {
      const ph = PHASES.find((p) => p.id === ov)
      if (ph) return Math.round((ph.min + ph.max) / 2)
    }
    return months
  }

  // Modul per lapis dan cabang
  const modulesByLapis: Pustaka['modulesByLapis'] = { Akar: [], Batang: [], Cabang: [], Buah: [] }

  for (const lapis of ['Akar', 'Batang', 'Cabang', 'Buah']) {
    const list = branchesByLapis[lapis] ?? []
    for (const br of list) {
      const em = effMonths(br.code)
      const matchingMods = modules.filter((m) => {
        const brCode = typeof m.branch === 'object' && m.branch ? m.branch.code : ''
        return brCode === br.code && em >= m.minMonths && em <= m.maxMonths
      })
      if (matchingMods.length > 0) {
        modulesByLapis[lapis].push({
          branchName: br.name,
          branchCode: br.code,
          items: matchingMods.map((m) => ({
            id: m.id,
            title: m.title,
            desc: m.description ?? '',
            daily: !!m.daily,
            waktu: m.waktu ?? null,
          })),
        })
      }
    }
  }

  // Band & targets
  const currentBand = bandOf(bands, months)
  const targets = (currentBand.targets ?? []).map((t, i) => ({ key: `t-${currentBand.code}-${i}`, text: typeof t === 'string' ? t : t.text }))

  const kurikulum = await payload.findGlobal({ slug: 'kurikulum', depth: 0 }).catch(() => null)
  const load = activeChild.load ?? 'seimbang'
  const loadInfo = LOADS.find((l) => l.id === load) ?? LOADS[1]

  // Warnings
  const activeWarning = warnings.find((w) => months >= w.minMonths && months <= w.maxMonths)
  const warningItems = activeWarning
    ? (activeWarning.items ?? []).map((x) => (typeof x === 'string' ? x : x.text))
    : null

  // Format profil aktif
  const profileData = profileDoc
    ? {
        year: profileDoc.year,
        label: profileDoc.label,
        title: profileDoc.title,
        summary: profileDoc.summary,
        feelings: (profileDoc.feelings ?? []).map((f) => (typeof f === 'string' ? f : f.text)),
        normal: (profileDoc.normal ?? []).map((n) => ({ q: n.q, a: n.a })),
        milestones: (profileDoc.milestones ?? []).map((m) => ({
          age: m.age,
          items: (m.items ?? []).map((it) => (typeof it === 'string' ? it : it.text)),
        })),
        abilities: (profileDoc.abilities ?? []).map((a) => ({
          domain: a.domain,
          items: (a.items ?? []).map((it) => (typeof it === 'string' ? it : it.text)),
        })),
        limits: (profileDoc.limits ?? []).map((l) => (typeof l === 'string' ? l : l.text)),
        stimulation: (profileDoc.stimulation ?? []).map((s) => (typeof s === 'string' ? s : s.text)),
        avoid: (profileDoc.avoid ?? []).map((a) => (typeof a === 'string' ? a : a.text)),
        islam: (profileDoc.islam ?? []).map((x) => ({ text: x.text, source: x.source ?? null })),
        worship: profileDoc.worship ?? null,
        consult: (profileDoc.consult ?? []).map((c) => (typeof c === 'string' ? c : c.text)),
      }
    : null

  // Format next profile teaser
  const nextProfileData = nextProfileDoc
    ? {
        year: nextProfileDoc.year,
        label: nextProfileDoc.label,
        title: nextProfileDoc.title,
        summary: nextProfileDoc.summary.split('. ')[0] + '.',
        wajarSamples: (nextProfileDoc.normal ?? []).slice(0, 3).map((w) => w.q),
      }
    : null

  return (
    <PageTransition>
      <AnakView
        today={today}
        activeChild={{
          id: activeChild.id,
          name: activeChild.name,
          ageLabel: ageLabel(activeChild.dob, today),
          phaseName: currentPhase.name,
        }}
        childIndex={childIndex}
        childrenList={children.map((c) => ({ id: c.id, name: c.name }))}
        daysLived={daysLived}
        daysToNextBirthday={daysToNextBirthday}
        lastBirthday={lastBirthday}
        ageYears={Math.floor(months / 12)}
        profile={profileData}
        nextProfile={nextProfileData}
        milestonesDone={milestonesDone}
        moments={momentsRes.docs.map((m) => ({
          id: m.id,
          date: m.date,
          category: m.category as MomentCategory,
          text: m.text ?? '',
          effort: m.effort ?? null,
          photo: m.photo && typeof m.photo === 'object' && m.photo.url ? { url: m.photo.url, thumb: m.photo.sizes?.thumb?.url ?? m.photo.url } : null,
          source: m.source ?? 'manual',
          milestoneKey: m.milestoneKey ?? null,
          hasPhoto: !!m.hasPhoto,
        }))}
        semester={selectedSemester}
        raporMap={raporMap}
        branchesByLapis={branchesByLapis}
        pustaka={{
          slotIlmu:
            load === 'penuh' || months < 72
              ? SLOT_ILMU[currentPhase.id]
              : `Beban ${loadInfo.name} (${loadInfo.label}): pagi adalah waktu sekolah. Di rumah cukup ±20–45 menit belajar termasuk PR; selebihnya main, gerak, dan ngobrol. (Jalur homeschool: ${SLOT_ILMU[currentPhase.id]})`,
          sleep: sleepInfo(months, sleepPrayer(family, today)),
          screen: screenRule(months),
          targets,
          modulesByLapis,
          warnings: warningItems,
        }}
        warningAlways={kurikulum?.warningAlways || WARNING_ALWAYS}
      />
    </PageTransition>
  )
}
