import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { ageMonths, bandOf, localNow, themeInfo } from '@/lib/curriculum/core'
import { getBands, getThemeMajelisList, getThemes, getThemeTasksByBand } from '@/lib/server/content'
import { getFamily, getParent } from '@/lib/server/payload'
import { TemaView } from './view'

export const metadata = { title: 'Tema' }

export default async function TemaPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; band?: string; cid?: string }>
}) {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const { family, children } = ctx

  const tz = Number(family.tz ?? 7)
  const today = localNow(tz).date

  const th = themeInfo(family.themeStart, family.themeOffset ?? 0, today)
  const { t, band, cid } = await searchParams

  const [themes, bands] = await Promise.all([getThemes(), getBands()])

  // Kelompok usia tiap anak (menentukan rencana yang ditampilkan secara otomatis)
  const kids = children.map((c) => ({
    id: c.id,
    name: c.name,
    bandCode: bandOf(bands, ageMonths(c.dob, today)).code,
  }))
  const activeKid = kids.find((k) => k.id === cid) ?? kids[0] ?? null

  // Tema yang dipilih (0..11)
  const activeIdx = t != null && t !== '' && !Number.isNaN(Number(t)) ? Math.max(0, Math.min(11, Math.trunc(Number(t)))) : th.idx
  const selectedTheme = themes.find((x) => x.order === activeIdx + 1) ?? themes[0]

  // Kelompok usia: milik anak terpilih, kecuali pengguna sengaja melihat kelompok lain (?band=)
  const kidBandCode = activeKid?.bandCode ?? bands[0]?.code ?? 'b0'
  const otherBand = band && band !== kidBandCode && bands.some((b) => b.code === band) ? band : null
  const selectedBand = bands.find((b) => b.code === (otherBand ?? kidBandCode)) ?? bands[0]

  // Ambil tugas 4 minggu dan 28 majelis
  const [tasks, majDocs] = await Promise.all([
    selectedTheme && selectedBand ? getThemeTasksByBand(selectedTheme.id, selectedBand.id) : Promise.resolve([]),
    selectedTheme ? getThemeMajelisList(selectedTheme.id) : Promise.resolve([]),
  ])

  const tasksByWeek: Record<number, { id: string; text: string; waktu: string; order: number }[]> = { 1: [], 2: [], 3: [], 4: [] }
  for (const item of tasks) {
    tasksByWeek[item.week]?.push({ id: item.id, text: item.text, waktu: item.waktu, order: item.order })
  }

  const majelisList = majDocs.map((m) => {
    const qList = (m.questions ?? []) as (string | { text: string })[]
    return {
      id: m.id,
      day: m.day,
      story: m.story,
      questions: qList.map((q) => (typeof q === 'string' ? q : q.text)).join(' · '),
    }
  })

  return (
    <PageTransition>
      <TemaView
        activeIdx={activeIdx}
        runningIdx={th.idx}
        runningWeek={th.week}
        runningDayIn={th.dayIn}
        themes={themes.map((x) => ({
          id: x.id,
          order: x.order,
          title: x.title,
          surah: x.surah,
          ayat: x.ayat,
          science: x.science,
          skill: x.skill,
        }))}
        bands={bands.map((b) => ({ code: b.code, label: b.label }))}
        selectedBandCode={selectedBand?.code ?? kidBandCode}
        kids={kids}
        activeKidId={activeKid?.id ?? null}
        tasksByWeek={tasksByWeek}
        majelisList={majelisList}
      />
    </PageTransition>
  )
}
