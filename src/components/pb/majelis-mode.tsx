'use client'

import { ChevronLeft, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { PrayerTimes } from '@/lib/prayer/praytimes'
import { cn } from '@/lib/utils'
import { useOverlay } from './sheet'
import { SkyScene } from './sky'

const HINTS = [
  'Mulai dari anak termuda. Terima jawaban apa pun dengan senyum.',
  'Dengarkan sampai selesai, jangan buru-buru membetulkan.',
  'Ayah dan Bunda ikut menjawab, anak belajar dari teladan.',
]

// Layar ini selalu bertema malam (ilustrasi), jadi teksnya putih dengan berbagai tingkat opasitas.
const K = ({ children }: { children: ReactNode }) => <p className="text-[0.78125rem] font-bold tracking-[.08em] text-white/75 uppercase">{children}</p>
const H = ({ children }: { children: ReactNode }) => <h2 className="my-3 text-[1.75rem] leading-tight font-bold tracking-[-0.01em] text-white">{children}</h2>
const Hint = ({ children }: { children: ReactNode }) => <p className="mt-2.5 text-[0.90625rem] text-white/70">{children}</p>
const Arab = ({ children }: { children: ReactNode }) => (
  <p lang="ar" dir="rtl" className="my-4 text-center font-arabic text-[1.75rem] leading-[2.1] text-white">{children}</p>
)

/** Majelis Malam layar penuh: pembuka, kisah, pertanyaan satu per satu, syukur, doa penutup. */
export function MajelisMode({ dayIn, themeTitle, story, questions, kids, pt, drafts: loaded, onClose, onFinish }: {
  dayIn: number
  themeTitle: string
  story: string
  questions: string[]
  kids: { id: string; name: string }[]
  pt: PrayerTimes
  /** Jawaban syukur yang sudah tersimpan. `null` = masih dimuat (layar tetap bisa dipakai). */
  drafts: Record<string, string> | null
  onClose: () => void
  onFinish: (syukur: Record<string, string>) => Promise<void>
}) {
  const steps = ['intro', 'kisah', ...questions.map((_, i) => `q${i}`), 'syukur', 'doa']
  const [st, setSt] = useState(0)
  const [drafts, setDrafts] = useState<Record<string, string>>(loaded ?? {})
  const [seen, setSeen] = useState(loaded)
  const [busy, setBusy] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)
  const shownStep = useRef(0)
  const s = steps[st]
  const last = st === steps.length - 1

  // Draf yang datang belakangan digabung tanpa menimpa isian yang sudah diketik.
  if (loaded !== seen) {
    setSeen(loaded)
    if (loaded) setDrafts((d) => ({ ...loaded, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v)) }))
  }

  const requestClose = useOverlay(true, onClose, panelRef)

  // Pindah langkah: fokus ke isi langkah agar pembaca layar membacakan langkah baru.
  useEffect(() => {
    if (shownStep.current === st) return
    shownStep.current = st
    stepRef.current?.focus({ preventScroll: true })
  }, [st])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Majelis Malam"
      tabIndex={-1}
      className="mm-bg fixed inset-0 z-[55] flex flex-col overflow-hidden px-[22px] pt-[calc(10px+env(safe-area-inset-top))] pb-[calc(16px+env(safe-area-inset-bottom))] text-white outline-none motion-safe:animate-[fadeIn_.3s]"
    >
      <SkyScene waktu="isya" pt={pt} nowMin={1260} landscape={false} className="pointer-events-none absolute inset-x-0 top-0 h-[45%] w-full opacity-90" />
      <div className="relative z-[1] mx-auto flex w-full max-w-[520px] items-center gap-3">
        <div className="flex flex-1 gap-[5px]" role="progressbar" aria-label="Langkah majelis" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={st + 1}>
          {steps.map((_, i) => <i key={i} className={cn('h-[3px] flex-1 rounded-full transition-colors', i <= st ? 'bg-white/85' : 'bg-white/20')} />)}
        </div>
        <button type="button" onClick={requestClose} aria-label="Tutup majelis" className="grid size-11 place-items-center rounded-full bg-white/12 text-white transition active:scale-95 active:bg-white/20">
          <X size={20} aria-hidden />
        </button>
      </div>

      <div
        key={st}
        ref={stepRef}
        tabIndex={-1}
        className="page-enter relative z-[1] mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center overflow-y-auto py-5 text-base leading-relaxed text-white/85 outline-none"
      >
        {s === 'intro' && (<>
          <K>Majelis Malam · hari {dayIn}/28</K>
          <H>Kumpul sebentar, yuk</H>
          <p>Parkir semua gawai, duduk melingkar, lalu buka dengan basmalah.</p>
          <Arab>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Arab>
          <Hint>Tema: {themeTitle}</Hint>
        </>)}
        {s === 'kisah' && (<>
          <K>Kisah malam ini</K>
          <H>{story}</H>
          <Hint>Ceritakan 3–5 menit dengan bahasa yang dipahami anak termuda. Berhenti sejenak dan tanyakan, &quot;Menurutmu, apa yang terjadi selanjutnya?&quot;</Hint>
        </>)}
        {s.startsWith('q') && (() => {
          const i = Number(s.slice(1))
          return (<>
            <K>Pertanyaan {i + 1} dari {questions.length}</K>
            <H>{questions[i]}</H>
            <Hint>{HINTS[i] ?? HINTS[0]}</Hint>
          </>)
        })()}
        {s === 'syukur' && (<>
          <K>Penutup</K>
          <H>Hari ini aku bersyukur untuk…</H>
          <Hint>Setiap orang menyebut satu hal. Tulis jawaban anak agar tersimpan di Momen (boleh dikosongkan).</Hint>
          {loaded === null && <p className="mt-2 text-[0.8125rem] text-white/70" role="status">Memuat jawaban yang tersimpan…</p>}
          {kids.map((c) => (
            <label key={c.id} className="my-2 flex min-h-12 items-center gap-2.5 rounded-[14px] bg-white/8 py-1 pr-1 pl-3.5">
              <span className="min-w-16 text-sm font-bold text-white/80">{c.name}</span>
              <input
                value={drafts[c.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                placeholder="…"
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="done"
                className="min-w-0 flex-1 border-0 bg-transparent px-1.5 py-2.5 text-base text-white outline-none placeholder:text-white/50"
              />
            </label>
          ))}
        </>)}
        {s === 'doa' && (<>
          <K>Doa penutup majelis</K>
          <Arab>سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ</Arab>
          <p><i>Subhānakallāhumma wa bihamdika, asyhadu an lā ilāha illā anta, astaghfiruka wa atūbu ilaik.</i></p>
          <p className="mt-2">&quot;Mahasuci Engkau ya Allah dan segala puji bagi-Mu. Aku bersaksi tiada tuhan selain Engkau. Aku memohon ampun dan bertaubat kepada-Mu.&quot;</p>
          <Hint>HR Abu Dawud &amp; Tirmidzi</Hint>
        </>)}
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-[520px] gap-2.5">
        {st > 0 && (
          <button type="button" onClick={() => setSt(st - 1)} aria-label="Langkah sebelumnya" className="grid min-h-12 min-w-12 place-items-center rounded-[14px] bg-white/12 px-4 text-white transition active:scale-[.97] active:bg-white/20">
            <ChevronLeft size={20} aria-hidden />
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!last) return setSt(st + 1)
            setBusy(true)
            try {
              await onFinish(drafts)
            } finally {
              setBusy(false)
            }
          }}
          className="min-h-12 flex-1 rounded-[14px] bg-white px-4 py-3 font-semibold text-neutral-900 transition active:scale-[.98] active:opacity-90 disabled:opacity-60"
        >
          {last ? (busy ? 'Menyimpan…' : 'Selesai, alhamdulillah') : st === 0 ? 'Bismillah, mulai' : 'Lanjut'}
        </button>
      </div>
    </div>,
    document.body,
  )
}
