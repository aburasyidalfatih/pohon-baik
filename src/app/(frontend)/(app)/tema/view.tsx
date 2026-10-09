'use client'

import { BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useOptimistic, useRef, useState, useTransition } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { ChildSwitcher, PageHeader } from '@/components/pb/ui'
import { Button, Card, Chip, EmptyState, SectionLabel } from '@/components/ui/primitives'
import { WAKTU, WEEK_NAMES, type Waktu } from '@/lib/curriculum/constants'
import { cn } from '@/lib/utils'

type ThemeLite = {
  id: string
  order: number
  title: string
  surah: string
  ayat?: string | null
  science?: string | null
  skill?: string | null
}

export type TemaViewProps = {
  activeIdx: number
  runningIdx: number
  runningWeek: number
  runningDayIn: number
  themes: ThemeLite[]
  bands: { code: string; label: string }[]
  selectedBandCode: string
  kids: { id: string; name: string; bandCode: string }[]
  activeKidId: string | null
  tasksByWeek: Record<number, { id: string; text: string; waktu: string; order: number }[]>
  majelisList: {
    id: string
    day: number
    story: string
    questions: string
  }[]
}

type Sel = { idx: number; kidId: string | null; bandCode: string }

export function TemaView({
  activeIdx,
  runningIdx,
  runningWeek,
  runningDayIn,
  themes,
  bands,
  selectedBandCode,
  kids,
  activeKidId,
  tasksByWeek,
  majelisList,
}: TemaViewProps) {
  const router = useRouter()
  const heroRef = useRef<HTMLElement>(null)
  const bandsLabelId = useId()
  const [majelisOpen, setMajelisOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Pilihan langsung berubah di layar (judul tema, pil anak/usia), data rencana menyusul dari server.
  const [sel, setSel] = useOptimistic<Sel>({ idx: activeIdx, kidId: activeKidId, bandCode: selectedBandCode })
  const kidBandOf = (kidId: string | null) => kids.find((k) => k.id === kidId)?.bandCode ?? bands[0]?.code

  const selectedTheme = themes.find((x) => x.order === sel.idx + 1) ?? themes[0]
  const isRunningTheme = sel.idx === runningIdx
  const activeKid = kids.find((k) => k.id === sel.kidId) ?? null
  const kidBand = bands.find((b) => b.code === activeKid?.bandCode)
  const shownBand = bands.find((b) => b.code === sel.bandCode) ?? bands[0]
  const isOtherBand = !!activeKid && sel.bandCode !== activeKid.bandCode
  // Data rencana/majelis masih milik pilihan sebelumnya sampai server menjawab.
  const planStale = isPending && (sel.idx !== activeIdx || sel.bandCode !== selectedBandCode)

  const urlFor = (s: Sel) => {
    const p = new URLSearchParams()
    if (s.idx !== runningIdx) p.set('t', String(s.idx))
    if (s.kidId && s.kidId !== kids[0]?.id) p.set('cid', s.kidId)
    if (s.bandCode !== kidBandOf(s.kidId)) p.set('band', s.bandCode)
    const q = p.toString()
    return q ? `/tema?${q}` : '/tema'
  }

  const go = (next: Partial<Sel>) => {
    const s = { ...sel, ...next }
    startTransition(() => {
      setSel(s)
      router.replace(urlFor(s), { scroll: false })
    })
  }

  const selectKid = (kidId: string) => go({ kidId, bandCode: kidBandOf(kidId) ?? sel.bandCode })

  const selectBand = (bandCode: string) => {
    if (bandCode === sel.bandCode) return
    haptic(5)
    go({ bandCode })
  }

  const selectTheme = (idx: number, scroll: boolean) => {
    if (idx !== sel.idx) {
      haptic(5)
      go({ idx })
    }
    if (scroll) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      heroRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }

  if (!selectedTheme) {
    return (
      <>
        <PageHeader title="Tema" subtitle="12 surah, 12 tema · setiap tema 4 minggu" />
        <Card>
          <EmptyState icon={<BookOpen size={28} />} title="Tema sedang disusun">
            Kurikulum 12 tema belum tersedia. Coba buka lagi nanti.
          </EmptyState>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Tema" subtitle="12 surah, 12 tema · setiap tema 4 minggu" />

      {/* Kartu tema terpilih */}
      <section
        ref={heroRef}
        aria-labelledby="tema-hero-title"
        className="my-3 scroll-mt-[calc(env(safe-area-inset-top)+3.5rem)] rounded-[26px] bg-gradient-to-br from-brand-soft to-surface p-5 shadow-card"
      >
        <div className="text-xs font-bold tracking-wider text-brand-2 uppercase">
          {isRunningTheme ? `Sedang berjalan · minggu ${runningWeek} · hari ${runningDayIn}/28` : `Tema ${sel.idx + 1} dari 12`}
        </div>
        <h2 id="tema-hero-title" aria-live="polite" className="mt-1.5 mb-1 text-2xl font-bold tracking-tight text-ink">
          {selectedTheme.title}
        </h2>
        <p className="font-semibold text-brand-ink">
          {selectedTheme.surah} {selectedTheme.ayat ? `(${selectedTheme.ayat})` : ''}
        </p>
        {selectedTheme.science && (
          <p className="mt-2 text-sm text-ink-2">
            <b className="text-ink">Sains: </b>
            {selectedTheme.science}
          </p>
        )}
        {selectedTheme.skill && (
          <p className="mt-1 text-sm text-ink-2">
            <b className="text-ink">Keterampilan: </b>
            {selectedTheme.skill}
          </p>
        )}
        {!isRunningTheme && (
          <div className="mt-4">
            <Button variant="soft" size="sm" onClick={() => selectTheme(runningIdx, false)}>
              Kembali ke tema berjalan
            </Button>
          </div>
        )}
      </section>

      {/* Rencana 4 minggu: anak menentukan kelompok usia, kelompok lain bisa dilihat terpisah */}
      <SectionLabel>Rencana 4 minggu</SectionLabel>

      <ChildSwitcher kids={kids} value={sel.kidId ?? ''} onChange={selectKid} />

      <div className="mb-2 rounded-tile bg-surface px-3.5 py-3 text-sm text-ink-2 shadow-card" aria-live="polite">
        {activeKid && !isOtherBand ? (
          <p>
            Rencana untuk <b className="text-ink">{activeKid.name}</b> · kelompok usia <b className="text-ink">{shownBand?.label}</b>
          </p>
        ) : (
          <p>
            Menampilkan kelompok usia <b className="text-ink">{shownBand?.label}</b>
            {activeKid && kidBand && <> · bukan usia {activeKid.name} ({kidBand.label})</>}
          </p>
        )}
        {isOtherBand && activeKid && (
          <Button variant="link" className="hit mt-1.5 text-sm" onClick={() => selectKid(activeKid.id)}>
            Kembali ke usia {activeKid.name}
          </Button>
        )}
      </div>

      {bands.length > 1 && (
        <div className="mb-3">
          <p id={bandsLabelId} className="mx-1 mb-1.5 text-[0.8125rem] font-semibold text-ink-2">
            {activeKid ? 'Lihat kelompok usia lain' : 'Pilih kelompok usia'}
          </p>
          <div role="group" aria-labelledby={bandsLabelId} className="no-scrollbar scroll-fade -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
            {bands.map((b) => {
              const on = b.code === sel.bandCode
              const isKidBand = b.code === activeKid?.bandCode
              return (
                <button
                  key={b.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => selectBand(b.code)}
                  className={cn(
                    'hit flex min-h-10 flex-none items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.875rem] font-semibold transition active:scale-95',
                    on ? 'bg-brand-2 text-on-brand shadow-card' : 'bg-surface text-ink-2 shadow-card',
                  )}
                >
                  {b.label}
                  {isKidBand && (
                    <>
                      <span aria-hidden className={cn('size-1.5 rounded-full', on ? 'bg-on-brand' : 'bg-brand-2')} />
                      <span className="sr-only">(usia {activeKid?.name})</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div aria-busy={planStale} className={cn('space-y-3 transition-opacity', planStale && 'opacity-60')}>
        {[1, 2, 3, 4].map((w, wi) => {
          const isCurrentWeek = isRunningTheme && w === runningWeek
          const tasks = tasksByWeek[w] ?? []
          return (
            <section
              key={w}
              aria-labelledby={`minggu-${w}`}
              aria-current={isCurrentWeek ? 'date' : undefined}
              className={cn('rounded-card bg-surface p-4 shadow-card transition', isCurrentWeek && 'ring-2 ring-gold')}
            >
              <div className="mb-2.5 flex min-h-6 items-center justify-between gap-2">
                <h3 id={`minggu-${w}`} className="text-xs font-bold tracking-wider text-gold-ink uppercase">
                  Minggu {w} · {WEEK_NAMES[wi]}
                </h3>
                {isCurrentWeek && <Chip tone="gold">Minggu ini</Chip>}
              </div>
              {tasks.length > 0 ? (
                <ul className="divide-y divide-line">
                  {tasks.map((t) => {
                    const wKey: Waktu = t.waktu in WAKTU ? (t.waktu as Waktu) : 'hari'
                    return (
                      <li key={t.id} className="flex items-start justify-between gap-3 py-2 text-[0.90625rem] leading-snug text-ink first:pt-0 last:pb-0">
                        <span className="flex-1">{t.text}</span>
                        <span className={cn('mt-px flex-none rounded-md px-2 py-0.5 text-[0.75rem] font-semibold', `wk-${wKey}`)}>
                          {WAKTU[wKey].name}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">Rencana rinci untuk kelompok usia ini sedang disusun.</p>
              )}
            </section>
          )
        })}
      </div>

      {/* Majelis malam */}
      <SectionLabel>Majelis malam (28 hari)</SectionLabel>
      <div aria-busy={planStale} className={cn('overflow-hidden rounded-card bg-surface p-4 shadow-card transition-opacity', planStale && 'opacity-60')}>
        {majelisList.length > 0 ? (
          <div>
            <ol id="majelis-list" className="divide-y divide-line">
              {(majelisOpen ? majelisList : majelisList.slice(0, 7)).map((m) => {
                const isToday = isRunningTheme && m.day === runningDayIn
                return (
                  <li
                    key={m.id}
                    aria-current={isToday ? 'date' : undefined}
                    className={cn('flex gap-3 py-3 first:pt-1 last:pb-1', isToday && '-mx-4 rounded-lg bg-brand-soft/40 px-4')}
                  >
                    <span
                      className={cn(
                        'grid size-7 flex-none place-items-center rounded-full text-xs font-bold',
                        isToday ? 'bg-[var(--w-maghrib)] text-[var(--w-maghrib-bg)]' : 'bg-fill text-ink',
                      )}
                    >
                      <span className="sr-only">Malam ke-</span>
                      {m.day}
                    </span>
                    <div className="flex-1">
                      <b className="block text-sm text-ink">
                        {m.story}
                        {isToday && (
                          <Chip tone="soft" className="ml-1.5">
                            Malam ini
                          </Chip>
                        )}
                      </b>
                      {m.questions && <small className="mt-1 block text-xs leading-relaxed text-ink-2">{m.questions}</small>}
                    </div>
                  </li>
                )
              })}
            </ol>
            {majelisList.length > 7 && (
              <Button
                variant="default"
                size="sm"
                block
                className="mt-3"
                aria-expanded={majelisOpen}
                aria-controls="majelis-list"
                onClick={() => setMajelisOpen((o) => !o)}
              >
                {majelisOpen ? 'Tampilkan 7 malam saja' : `Lihat semua ${majelisList.length} malam`}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-3">Majelis malam untuk tema ini sedang disusun.</p>
        )}
      </div>

      {/* Kalender 12 tema: memilih tema menggulir ke kartu tema di atas */}
      <SectionLabel>Kalender 12 tema</SectionLabel>
      <div className="grid grid-cols-2 gap-2.5">
        {themes.map((t, idx) => {
          const isSelected = idx === sel.idx
          const isRunning = idx === runningIdx
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => selectTheme(idx, true)}
              className={cn(
                'pressable min-h-16 rounded-tile bg-surface p-3 text-left shadow-card',
                isSelected && 'ring-2 ring-brand-2',
              )}
            >
              <small className="block text-xs text-ink-2">
                {isRunning && (
                  <>
                    <span aria-hidden className="mr-1 inline-block size-1.5 rounded-full bg-gold align-middle" />
                    <span className="sr-only">Sedang berjalan: </span>
                  </>
                )}
                {t.order}. {t.surah}
              </small>
              <b className="mt-0.5 line-clamp-1 block text-sm font-bold text-ink">{t.title}</b>
            </button>
          )
        })}
      </div>
    </>
  )
}
