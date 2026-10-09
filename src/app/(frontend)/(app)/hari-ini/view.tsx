'use client'

import { BookOpen, Check, ChevronLeft, ChevronRight, EyeOff, Moon, RotateCw, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { celebrate, haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { LockedNotice, RemindNotice } from '@/components/pb/billing-notice'
import { InstallBanner } from '@/components/pb/install-banner'
import { MajelisMode } from '@/components/pb/majelis-mode'
import { PrayerHero, useNowMin } from '@/components/pb/prayer-hero'
import { Sheet } from '@/components/pb/sheet'
import { ProgressBar, ProgressRing, TreeSvg } from '@/components/pb/tree'
import { ChildSwitcher, PageHeader, kidColor } from '@/components/pb/ui'
import { TaskRow, WaktuSection } from '@/components/pb/waktu'
import { WelcomeSheet } from '@/components/pb/welcome-sheet'
import { Button, Chip, SectionLabel, Skeleton, buttonVariants } from '@/components/ui/primitives'
import { WAKTU, type Waktu } from '@/lib/curriculum/constants'
import { ageLabel, currentWaktu } from '@/lib/curriculum/core'
import type { Task } from '@/lib/curriculum/tasks'
import { pesanGalat } from '@/lib/errors'
import type { PrayerTimes } from '@/lib/prayer/praytimes'
import type { DayData } from '@/lib/server/day'
import { cn } from '@/lib/utils'
import { finishMajelis, kebunStats, majelisDrafts, setModuleHidden, toggleTask } from '../actions'

type W = Exclude<Waktu, 'hari'>
type Kid = DayData['kids'][number]
type Done = Record<string, string[]>
type Stat = { total: number; done: number }
type KebunData = Awaited<ReturnType<typeof kebunStats>>
type HariDir = 'hari-maju' | 'hari-mundur'

const ORDER: W[] = ['subuh', 'pagi', 'dzuhur', 'ashar', 'maghrib', 'isya']
const SHOW_N = 4
/** Sentuhan yang dimulai sedekat ini dari tepi layar milik gestur sistem (geser-kembali), bukan geser hari. */
const EDGE = 24
const HARI3 = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const DAYNOTE: Record<number, string> = {
  5: 'Jumat · baca Al-Kahf bersama, ulasan pekan, sedekah Jumat dari celengan anak',
  6: 'Sabtu · Hari Karya: proyek tema, presentasi kecil, khidmah',
  0: 'Ahad · Hari Alam & Silaturahim, disarankan bebas gawai keluarga',
  1: 'Senin · latihan puasa sunnah untuk anak 10+ sesuai kemampuan',
  4: 'Kamis · kuis singkat mingguan tanpa nilai, latihan puasa sunnah 10+',
}
const STAGES: [number, string][] = [[0, 'Benih'], [15, 'Tunas'], [60, 'Pohon muda'], [200, 'Pohon rindang'], [500, 'Pohon berbuah'], [1200, 'Pohon thayyibah']]
const FALLBACK_PT: PrayerTimes = { subuh: '04:30', terbit: '05:45', dzuhur: '11:50', ashar: '15:00', maghrib: '17:55', isya: '19:05' }

/** Statistik per waktu + total untuk anak yang ditampilkan. Fungsi murni: dipakai juga untuk state berikutnya saat mencentang. */
function computeStats(kids: Kid[], set: Done, majelis: boolean) {
  const by = {} as Record<W, Stat>
  let total = 0, done = 0, fruits = 0
  for (const w of ORDER) {
    let t = 0, n = 0
    for (const k of kids) {
      const d = set[k.id] ?? []
      for (const x of k.tasks[w]) {
        t++
        if (d.includes(x.id)) n++
      }
    }
    if (w === 'maghrib' && majelis) {
      t++
      if ((set.family ?? []).includes('majelis')) n++
    }
    by[w] = { total: t, done: n }
    total += t
    done += n
    if (t && n === t) fruits++
  }
  return { by, total, done, fruits }
}

const treeMsg = (done: number, total: number) =>
  done === 0 ? 'Bismillah, tanam daun pertama' : done / total < 0.5 ? 'Mulai bertunas, terus siram' : done < total ? 'Hampir rindang' : 'Rindang dan berbuah, alhamdulillah'

export type HariIniProps = {
  day: DayData
  today: string
  dateLabel: string
  weekday: number
  isToday: boolean
  hero: { greeting: string; city: string; tz: number; today: PrayerTimes; tomorrow: PrayerTimes; nowMin: number } | null
  prayerLine: string
  week: { date: string; label: string; full: string; n: number; pct: number }[]
  prevDate: string
  nextDate: string
  streak: number
  monthStart: string
  branches: Record<string, string>
  billing: { price: number; remind: { kind: 'trial' | 'renew'; daysLeft: number; names: string[] } | null }
}

export function HariIniView(p: HariIniProps) {
  const router = useRouter()
  const toast = useToast()
  const [done, setDone] = useState<Done>(() => ({ ...Object.fromEntries(p.day.kids.map((k) => [k.id, k.done])), family: p.day.familyDone }))
  const [filter, setFilter] = useState<string>('all')
  const [more, setMore] = useState<Record<string, boolean>>({})
  const [noteOpen, setNoteOpen] = useState(false)
  const [detail, setDetail] = useState<{ kidId: string; task: Task; waktu: W } | null>(null)
  const [kebun, setKebun] = useState<null | 'loading' | 'error' | KebunData>(null)
  const [mm, setMm] = useState<null | { drafts: Record<string, string> | null; failed?: boolean }>(null)
  // Isi terakhir sheet dipertahankan selama animasi tutup agar sheet tidak kosong saat turun.
  const [lastDetail, setLastDetail] = useState(detail)
  if (detail && detail !== lastDetail) setLastDetail(detail)
  const dd = detail ?? lastDetail
  const [lastKebun, setLastKebun] = useState(kebun)
  if (kebun && kebun !== lastKebun) setLastKebun(kebun)
  const kb = kebun ?? lastKebun
  // Modul yang baru disembunyikan langsung hilang (optimistis); dikosongkan saat data server baru tiba.
  const [hidden, setHidden] = useState<Record<string, true>>({})
  const [dayRef, setDayRef] = useState(p.day)
  if (dayRef !== p.day) {
    setDayRef(p.day)
    setHidden({})
  }

  // Jam yang sama dengan PrayerHero: lencana "Sekarang" pindah sendiri saat waktu shalat berganti.
  const nowMin = useNowMin(p.hero?.tz ?? 7, p.hero?.nowMin ?? 0, !!p.hero)
  const cw: W | null = p.hero ? currentWaktu(p.hero.today, nowMin) : null

  const hasMajelis = !!p.day.majelis
  const majOn = (done.family ?? []).includes('majelis')
  const isDone = (kidId: string, id: string) => (done[kidId] ?? []).includes(id)

  const kidIdx = useMemo(() => new Map(p.day.kids.map((k, i) => [k.id, i])), [p.day.kids])
  const shown = useMemo(() => {
    const base = filter === 'all' ? p.day.kids : p.day.kids.filter((k) => k.id === filter)
    if (!Object.keys(hidden).length) return base
    return base.map((k) => ({
      ...k,
      tasks: Object.fromEntries(Object.entries(k.tasks).map(([w, l]) => [w, l.filter((t) => !hidden[`${k.id}|${t.id}`])])) as Kid['tasks'],
    }))
  }, [filter, p.day.kids, hidden])
  const stats = useMemo(() => computeStats(shown, done, hasMajelis), [shown, done, hasMajelis])
  // Urutan: tugas yang sudah selesai saat data dimuat ada di bawah. Sengaja tidak diurutkan ulang saat
  // mencentang agar baris tidak berpindah di bawah jari ketika orang tua mencentang beruntun.
  const lists = useMemo(() => {
    const m = new Map<string, Task[]>()
    for (const k of shown) {
      const was = new Set(k.done)
      for (const w of ORDER) m.set(`${w}|${k.id}`, [...k.tasks[w]].sort((a, b) => Number(was.has(a.id)) - Number(was.has(b.id))))
    }
    return m
  }, [shown])

  // Simpan jumlah daun sebelumnya agar hanya daun yang baru tumbuh yang dianimasikan.
  const treeKey = `${p.day.date}|${filter}`
  const [treeNow, setTreeNow] = useState({ key: treeKey, done: stats.done, fruits: stats.fruits })
  const [prev, setPrev] = useState<{ done: number; fruits: number } | null>(null)
  if (treeNow.key !== treeKey || treeNow.done !== stats.done || treeNow.fruits !== stats.fruits) {
    setPrev(treeNow.key === treeKey ? { done: treeNow.done, fruits: treeNow.fruits } : null)
    setTreeNow({ key: treeKey, done: stats.done, fruits: stats.fruits })
  }

  // Nomor urut permintaan per anak: hanya respons dari centang TERAKHIR yang boleh menimpa state,
  // sehingga centang beruntun tidak "berkedip hilang" karena respons yang lebih lama.
  const seq = useRef<Record<string, number>>({})
  function commit(kidId: string, id: string, on: boolean, waktu: W) {
    const cur = done[kidId] ?? []
    if (on === cur.includes(id)) return
    const next = { ...done, [kidId]: on ? [...cur, id] : cur.filter((x) => x !== id) }
    setDone(next)
    if (on) {
      const s = computeStats(shown, next, hasMajelis)
      const w = s.by[waktu]
      if (s.total && s.done === s.total) {
        celebrate(26)
        haptic([12, 60, 12])
        toast('Alhamdulillah, semua tuntas hari ini')
      } else if (w.total && w.done === w.total) {
        celebrate(12)
        haptic([10, 40, 10])
        toast(`MasyaAllah, ${WAKTU[waktu].name} tuntas`)
      } else haptic(10)
    } else haptic(5)

    const my = (seq.current[kidId] ?? 0) + 1
    seq.current[kidId] = my
    toggleTask(kidId === 'family' ? null : kidId, p.day.date, id, on).then(
      (saved) => {
        if (seq.current[kidId] === my) setDone((d) => ({ ...d, [kidId]: saved }))
      },
      (e) => {
        setDone((d) => {
          const l = d[kidId] ?? []
          return { ...d, [kidId]: on ? l.filter((x) => x !== id) : l.includes(id) ? l : [...l, id] }
        })
        toast(pesanGalat(e), { variant: 'error' })
      },
    )
  }

  // ---------- pindah hari ----------
  const hrefFor = (d: string) => (d === p.today ? '/hari-ini' : `/hari-ini?d=${d}`)
  const dirTo = (d: string): HariDir => (d > p.day.date ? 'hari-maju' : 'hari-mundur')
  const go = (d: string) => {
    haptic(5)
    router.replace(hrefFor(d), { scroll: false, transitionTypes: [dirTo(d)] })
  }
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    const el = e.target as Element
    // Abaikan: multi-sentuh, sentuhan dari tepi layar, dari sheet/overlay (portal), dan dari deretan yang bisa digeser.
    const ok =
      e.touches.length === 1 &&
      e.currentTarget.contains(el) &&
      !el.closest('.no-swipe, input, textarea, select, [role="dialog"]') &&
      t.clientX > EDGE &&
      t.clientX < window.innerWidth - EDGE
    touch.current = ok ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x, dy = e.changedTouches[0].clientY - start.y
    if (Math.abs(dx) > 80 && Math.abs(dy) < 50) go(dx < 0 ? p.nextDate : p.prevDate)
  }

  // ---------- kebun ----------
  const kebunReq = useRef(0)
  const loadKebun = () => {
    const my = ++kebunReq.current
    setKebun('loading')
    kebunStats(p.monthStart).then(
      (k) => {
        if (kebunReq.current === my) setKebun((c) => (c === null ? null : k))
      },
      () => {
        if (kebunReq.current === my) setKebun((c) => (c === null ? null : 'error'))
      },
    )
  }

  // ---------- majelis ----------
  const mmReq = useRef(0)
  const openMajelis = () => {
    const my = ++mmReq.current
    haptic(5)
    setMm({ drafts: null }) // buka seketika; draf syukur dimuat di belakang
    majelisDrafts(p.day.date).then(
      (d) => {
        if (mmReq.current === my) setMm((m) => m && { drafts: d })
      },
      (e) => {
        if (mmReq.current !== my) return
        setMm((m) => m && { drafts: {}, failed: true })
        toast(pesanGalat(e, 'Gagal memuat jawaban syukur sebelumnya.'), { variant: 'error' })
      },
    )
  }
  const finishMm = async (syukur: Record<string, string>) => {
    // Bila draf lama belum/tidak termuat, kolom kosong tidak dikirim: server menghapus syukur yang kosong.
    const safe = mm?.drafts && !mm.failed ? syukur : Object.fromEntries(Object.entries(syukur).filter(([, v]) => v.trim()))
    try {
      const saved = await finishMajelis(p.day.date, safe)
      setDone((d) => ({ ...d, family: saved }))
      setMm(null)
      celebrate(20)
      haptic([12, 60, 12])
      toast('Alhamdulillah, majelis malam ini tuntas')
    } catch (e) {
      toast(pesanGalat(e), { variant: 'error' })
    }
  }

  // ---------- sembunyikan modul ----------
  const hideModule = (kidId: string, task: Task, kidName: string) => {
    const key = `${kidId}|${task.id}`
    const unhide = () => setHidden((h) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== key)) as Record<string, true>)
    setDetail(null)
    setHidden((h) => ({ ...h, [key]: true }))
    // Tanpa router.refresh(): action sudah revalidatePath('/hari-ini').
    setModuleHidden(kidId, task.id, true).then(
      () =>
        toast(`Disembunyikan untuk ${kidName}`, {
          action: {
            label: 'Urungkan',
            onClick: () => {
              unhide()
              setModuleHidden(kidId, task.id, false).catch((e) => toast(pesanGalat(e, 'Gagal menampilkan lagi. Coba lagi.'), { variant: 'error' }))
            },
          },
        }),
      (e) => {
        unhide()
        toast(pesanGalat(e, 'Gagal menyembunyikan. Coba lagi.'), { variant: 'error' })
      },
    )
  }

  const pt = p.hero?.today
  const time: Partial<Record<Waktu, string>> = pt ? { subuh: pt.subuh, pagi: pt.terbit, dzuhur: pt.dzuhur, ashar: pt.ashar, maghrib: pt.maghrib, isya: pt.isya } : {}
  const oneKid = filter === 'all' ? null : p.day.kids.find((k) => k.id === filter) ?? null
  const treeLabel = oneKid ? `Pohon ${oneKid.name}` : p.isToday ? 'Pohon hari ini' : 'Pohon hari itu'
  const msg = treeMsg(stats.done, stats.total)
  const note = DAYNOTE[p.weekday]
  // Waktu yang sedang berjalan tampil paling atas (tepat setelah pemilih anak), sisanya tetap berurutan.
  const sections = cw ? [cw, ...ORDER.filter((w) => w !== cw)] : ORDER

  const renderSection = (w: W) => {
    const s = stats.by[w]
    if (!s.total) return null
    return (
      <WaktuSection key={w} waktu={w} time={time[w]} done={s.done} total={s.total} now={w === cw} open={w === cw}>
        {w === 'maghrib' && p.day.majelis && (
          <div className="mm-bg my-1 mb-2 flex items-start gap-3 rounded-tile py-1 pr-3.5 pl-1.5 text-white">
            <button type="button" className="pressable min-w-0 flex-1 rounded-[12px] px-2 py-2 text-left active:bg-white/10" onClick={openMajelis}>
              <span className="flex items-center gap-2 text-[0.8125rem] font-bold text-white/80"><Moon size={15} aria-hidden /> Majelis Malam · hari {p.day.dayIn}/28</span>
              <span className="mt-1 block font-semibold">{p.day.majelis.story}</span>
              <span className="mt-0.5 block text-[0.8125rem] text-white/75">{majOn ? 'Selesai. Ketuk untuk membuka lagi' : 'Ketuk untuk mulai: kisah, 3 pertanyaan, syukur, doa'}</span>
            </button>
            <button type="button" role="checkbox" aria-checked={majOn} aria-label="Majelis Malam selesai" className="chk mt-3 border-white/70" onClick={() => commit('family', 'majelis', !majOn, 'maghrib')} />
          </div>
        )}
        {shown.map((k) => {
          const list = lists.get(`${w}|${k.id}`) ?? []
          if (!list.length) return null
          const mk = `${w}|${k.id}`
          const vis = more[mk] ? list : list.slice(0, SHOW_N)
          return (
            <div key={k.id}>
              {shown.length > 1 && (
                <div className="mt-3 mb-0.5 flex items-center gap-2 text-[0.8125rem] font-semibold text-ink-2">
                  <i className="inline-block size-[18px] rounded-full" style={{ background: kidColor(kidIdx.get(k.id) ?? 0) }} aria-hidden />
                  {k.name} <span className="font-normal text-ink-3">· {ageLabel(k.dob, p.day.date)}</span>
                </div>
              )}
              {vis.map((t) => (
                <TaskRow
                  key={t.id}
                  title={t.t}
                  description={t.d}
                  tag={t.c === 'tema' ? 'Tema' : p.branches[t.c] ?? t.c}
                  tagTone={t.c === 'tema' ? 'gold' : 'brand'}
                  done={isDone(k.id, t.id)}
                  onToggle={() => commit(k.id, t.id, !isDone(k.id, t.id), w)}
                  onOpen={() => setDetail({ kidId: k.id, task: t, waktu: w })}
                />
              ))}
              {list.length > SHOW_N && (
                <button type="button" aria-expanded={!!more[mk]} onClick={() => setMore((m) => ({ ...m, [mk]: !m[mk] }))} className="min-h-11 pt-1 text-sm font-semibold text-brand-2 active:opacity-70">
                  {more[mk] ? 'Tampilkan lebih sedikit' : `+${list.length - SHOW_N} lainnya`}
                </button>
              )}
            </div>
          )
        })}
      </WaktuSection>
    )
  }

  return (
    <div className="touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null }}>
      <PageHeader
        title={p.isToday ? 'Hari ini' : p.dateLabel.split(',')[0]}
        subtitle={p.dateLabel}
        className="[&_p]:mb-2"
        action={!p.isToday && (
          <Link href="/hari-ini" replace scroll={false} transitionTypes={[dirTo(p.today)]} className={buttonVariants({ variant: 'default', size: 'sm' })}>
            Hari ini
          </Link>
        )}
      />

      {/* strip pekan */}
      <nav aria-label="Pilih hari" className="no-swipe -mx-3 mb-1 flex items-center">
        <button type="button" onClick={() => go(p.prevDate)} aria-label="Hari sebelumnya" className="grid size-11 flex-none place-items-center rounded-full text-ink-2 active:bg-fill">
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-7">
          {p.week.map((d) => {
            const sel = d.date === p.day.date, fut = d.date > p.today
            return (
              <Link
                key={d.date}
                href={hrefFor(d.date)}
                replace
                scroll={false}
                transitionTypes={[dirTo(d.date)]}
                aria-current={sel ? 'date' : undefined}
                aria-label={`${d.full}${d.date === p.today ? ', hari ini' : ''}${fut ? '' : `, ${Math.round(d.pct * 100)}% tuntas`}`}
                className={cn('flex flex-col items-center gap-0.5 rounded-[14px] py-1 text-[0.6875rem] font-semibold transition active:scale-95', sel ? 'bg-surface text-brand-2 shadow-card' : fut ? 'text-ink-3' : 'text-ink-2')}
              >
                {d.label}
                <span className="relative grid size-9 place-items-center">
                  <span className="absolute inset-0"><ProgressRing value={fut ? 0 : d.pct} size={36} r={15} stroke={3} /></span>
                  <span className={cn('relative text-[0.875rem] font-bold', d.date === p.today ? 'text-brand-2' : fut ? 'text-ink-3' : 'text-ink')}>{d.n}</span>
                </span>
              </Link>
            )
          })}
        </div>
        <button type="button" onClick={() => go(p.nextDate)} aria-label="Hari berikutnya" className="grid size-11 flex-none place-items-center rounded-full text-ink-2 active:bg-fill">
          <ChevronRight size={20} aria-hidden />
        </button>
      </nav>

      {p.hero ? (
        <PrayerHero greeting={p.hero.greeting} city={p.hero.city} today={p.hero.today} tomorrow={p.hero.tomorrow} nowMin={nowMin} />
      ) : (
        <p className="my-2.5 rounded-tile bg-surface px-3.5 py-2.5 text-[0.8125rem] text-ink-2 shadow-card">{p.prayerLine}</p>
      )}

      {/* pohon + tema dalam satu baris ringkas */}
      <div className="mt-3 mb-2.5 flex items-stretch overflow-hidden rounded-card bg-surface shadow-card">
        <button
          type="button"
          onClick={loadKebun}
          aria-label={`${treeLabel}: ${msg}. ${stats.done} dari ${stats.total} daun${stats.fruits ? `, ${stats.fruits} buah` : ''}${p.streak ? `, ${p.streak} hari konsisten` : ''}. Buka kebun keluarga`}
          className="pressable flex w-[45%] min-w-0 flex-none items-center gap-1 py-2 pr-2.5 pl-1 text-left"
        >
          <span className="w-[50px] flex-none"><TreeSvg total={stats.total} done={stats.done} fruits={stats.fruits} prevDone={prev?.done} prevFruits={prev?.fruits} /></span>
          <span className="min-w-0 flex-1" aria-hidden>
            <b className="block truncate text-[0.9375rem] tabular-nums">{stats.done}/{stats.total} daun{stats.fruits ? ` · ${stats.fruits} buah` : ''}</b>
            <ProgressBar value={stats.total ? stats.done / stats.total : 0} className="my-1" />
            <small className="block truncate text-[0.75rem] text-ink-2">
              {oneKid ? `${oneKid.name} · ${ageLabel(oneKid.dob, p.day.date)}` : p.streak ? `${p.streak} hari konsisten` : msg}
            </small>
          </span>
        </button>
        {p.day.theme && (
          <>
            <span className="my-2.5 w-px flex-none bg-line" aria-hidden />
            <Link
              href="/tema"
              aria-label={`Tema: ${p.day.theme.title}, ${p.day.theme.surah}, minggu ${p.day.week}, hari ${p.day.dayIn} dari 28`}
              className="pressable flex min-w-0 flex-1 items-center py-2 pr-3 pl-3"
            >
              <span className="min-w-0 flex-1" aria-hidden>
                <small className="flex items-center gap-1 truncate text-[0.75rem] text-gold-ink"><BookOpen size={13} className="flex-none" />{p.day.theme.surah} · {p.day.dayIn}/28</small>
                <b className="line-clamp-2 text-[0.84375rem] leading-snug">{p.day.theme.title}</b>
              </span>
            </Link>
          </>
        )}
      </div>

      {note && (
        <button
          type="button"
          aria-expanded={noteOpen}
          onClick={() => setNoteOpen((o) => !o)}
          className="pressable hit mb-3 flex max-w-full items-start gap-1.5 rounded-[16px] bg-brand-soft px-3 py-1.5 text-left text-[0.8125rem] text-brand-ink"
        >
          <Sparkles size={15} className="mt-0.5 flex-none" aria-hidden />
          <span className={cn('min-w-0', !noteOpen && 'truncate')}>{note}</span>
        </button>
      )}

      {p.isToday && <RemindNotice remind={p.billing.remind} price={p.billing.price} />}
      {p.day.kids.length > 1 && <ChildSwitcher kids={p.day.kids} value={filter} onChange={setFilter} allLabel="Semua" className="no-swipe" />}
      <LockedNotice kids={shown.filter((k) => k.locked).map((k) => k.name)} price={p.billing.price} />
      {!p.day.kids.length && <p className="my-3 rounded-card bg-brand-soft p-4 text-sm text-brand-ink">Belum ada data anak. Tambahkan dari menu Keluarga.</p>}

      {/* kartu waktu: yang sedang berjalan lebih dulu */}
      {sections.map((w, i) => (
        <div key={w} className="contents">
          {renderSection(w)}
          {i === 0 && <InstallBanner />}
        </div>
      ))}

      {/* detail tugas */}
      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={dd?.task.t ?? ''}
        footer={dd && (() => {
          const on = isDone(dd.kidId, dd.task.id)
          const kid = p.day.kids.find((k) => k.id === dd.kidId)
          return (
            <div className="grid gap-2">
              <Button variant={on ? 'default' : 'primary'} block onClick={() => { commit(dd.kidId, dd.task.id, !on, dd.waktu); setDetail(null) }}>
                {on ? 'Batalkan tanda selesai' : <><Check size={18} aria-hidden /> Tandai selesai</>}
              </Button>
              {dd.task.kind === 'mod' && kid && (
                <Button variant="default" block onClick={() => hideModule(dd.kidId, dd.task, kid.name)}>
                  <EyeOff size={16} aria-hidden /> Sudah dikuasai, sembunyikan
                </Button>
              )}
            </div>
          )
        })()}
      >
        {dd && (() => {
          const kid = p.day.kids.find((k) => k.id === dd.kidId)
          return (<>
            <div className="mt-1.5 mb-3 flex flex-wrap gap-1.5">
              <Chip tone={dd.task.c === 'tema' ? 'gold' : 'brand'}>{dd.task.c === 'tema' ? 'Tema' : p.branches[dd.task.c] ?? dd.task.c}</Chip>
              <Chip tone="soft">{WAKTU[dd.waktu].name}</Chip>
              {kid && <Chip tone="soft">{kid.name}</Chip>}
            </div>
            <div className="text-base leading-relaxed">
              {dd.task.d && <p>{dd.task.d}</p>}
              {dd.task.kind === 'tema' && p.day.theme && <p className="mt-2">Bagian dari tema <b>{p.day.theme.title}</b> ({p.day.theme.surah}). Rencana lengkap ada di tab Tema.</p>}
              {dd.task.kind === 'quran' && <p className="mt-2">Buka tab Qur&apos;an untuk menandai setiap hafalan lancar atau perlu diulang.</p>}
            </div>
            {dd.task.kind === 'mod' && <p className="mt-3 text-[0.78125rem] text-ink-3">Modul yang disembunyikan bisa ditampilkan lagi dari menu Keluarga → Ubah data anak.</p>}
          </>)
        })()}
      </Sheet>

      {/* kebun */}
      <Sheet open={kebun !== null} onClose={() => setKebun(null)} title="Kebun keluarga">
        {kb === 'error' ? (
          <div role="alert" className="flex flex-col items-center py-8 text-center">
            <p className="text-ink-2">Gagal memuat kebun.</p>
            <Button variant="soft" size="sm" className="mt-3" onClick={loadKebun}><RotateCw size={16} aria-hidden /> Coba lagi</Button>
          </div>
        ) : kb && kb !== 'loading' ? (
          <KebunBody k={kb} monthStart={p.monthStart} themeTitle={p.day.theme?.title ?? ''} />
        ) : (
          <div aria-busy="true">
            <span className="sr-only" role="status">Memuat kebun…</span>
            <Skeleton className="my-1.5 h-[104px] rounded-card" />
            <div className="mt-3 grid grid-cols-4 gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-tile" />)}</div>
            <Skeleton className="mt-5 h-48 rounded-card" />
          </div>
        )}
      </Sheet>

      {mm && p.day.majelis && (
        <MajelisMode
          dayIn={p.day.dayIn}
          themeTitle={p.day.theme?.title ?? ''}
          story={p.day.majelis.story}
          questions={p.day.majelis.questions}
          kids={p.day.kids.filter((k) => k.months >= 24).map((k) => ({ id: k.id, name: k.name }))}
          pt={p.hero?.today ?? FALLBACK_PT}
          drafts={mm.drafts}
          onClose={() => {
            mmReq.current++
            setMm(null)
          }}
          onFinish={finishMm}
        />
      )}

      <WelcomeSheet />
    </div>
  )
}

function KebunBody({ k, monthStart, themeTitle }: { k: KebunData; monthStart: string; themeTitle: string }) {
  const { i, nx, pct, days, last7 } = useMemo(() => {
    let i = 0
    while (i + 1 < STAGES.length && k.steps >= STAGES[i + 1][0]) i++
    const nx = STAGES[i + 1]
    const pct = nx ? (k.steps - STAGES[i][0]) / (nx[0] - STAGES[i][0]) : 1
    const days = Array.from({ length: 28 }, (_, n) => {
      const d = new Date(Date.parse(`${monthStart}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
      return { d, n: Number(d.slice(8)), p: k.progress[d]?.pct, fut: d > k.today }
    })
    const last7 = Array.from({ length: 7 }, (_, n) => {
      const d = new Date(Date.parse(`${k.today}T00:00:00Z`) - (6 - n) * 86400000)
      return { label: HARI3[d.getUTCDay()], p: k.progress[d.toISOString().slice(0, 10)]?.pct ?? 0 }
    })
    return { i, nx, pct, days, last7 }
  }, [k, monthStart])
  const lvl = (p?: number) =>
    p == null || p === 0 ? 'bg-fill text-ink-2'
      : p < 0.34 ? 'bg-[color-mix(in_srgb,var(--brand-2)_22%,var(--surface))]'
        : p < 0.67 ? 'bg-[color-mix(in_srgb,var(--brand-2)_45%,var(--surface))]'
          : p < 1 ? 'bg-[color-mix(in_srgb,var(--brand-2)_70%,var(--surface))] text-on-brand'
            : 'bg-brand-2 text-on-brand'
  return (
    <>
      <div className="my-1.5 mb-3 flex items-center gap-3 rounded-card bg-gradient-to-br from-brand-soft to-surface py-2.5 pr-3.5 pl-1">
        <div className="w-[120px] flex-none"><TreeSvg total={30} done={Math.round(((i + pct) / (STAGES.length - 1)) * 30)} fruits={i >= 4 ? 7 : i >= 3 ? 3 : 0} /></div>
        <div className="min-w-0 flex-1">
          <small className="text-[0.78125rem] text-ink-2">Tahap pohon keluarga</small>
          <b className="block text-[1.375rem] tracking-[-0.02em]">{STAGES[i][1]}</b>
          <ProgressBar value={pct} />
          <p className="text-[0.8125rem] text-ink-2">{nx ? <>{nx[0] - k.steps} langkah baik lagi menuju <b>{nx[1]}</b></> : 'MasyaAllah, terus dirawat'}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {([[k.days, 'Hari ditanam'], [k.steps, 'Langkah baik'], [k.majelis, 'Majelis'], [k.moments, 'Momen']] as const).map(([v, l]) => (
          <div key={l} className="rounded-tile bg-surface px-1.5 py-2.5 text-center shadow-card"><b className="block text-xl tracking-[-0.02em]">{v}</b><small className="text-[0.6875rem] text-ink-2">{l}</small></div>
        ))}
      </div>
      <SectionLabel>{themeTitle} · 28 hari</SectionLabel>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <i
            key={d.d}
            className={cn('grid aspect-square place-items-center rounded-[9px] text-xs font-semibold not-italic', lvl(d.p), d.fut && 'opacity-35', d.d === k.today && 'shadow-[0_0_0_2px_var(--gold)]')}
          >
            {d.n}{!d.fut && <span className="sr-only">, {Math.round((d.p ?? 0) * 100)}%</span>}
          </i>
        ))}
      </div>
      <SectionLabel>7 hari terakhir</SectionLabel>
      <div className="flex h-[110px] gap-2">
        {last7.map((d, n) => (
          <div key={n} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end overflow-hidden rounded-lg bg-fill" aria-hidden>
              <i className="block w-full rounded-lg bg-gradient-to-b from-(--leaf-hi) to-brand-2" style={{ height: `${Math.max(4, Math.round(d.p * 100))}%` }} />
            </div>
            <small className="text-[0.6875rem] font-semibold text-ink-2">{d.label} <span className="sr-only">{Math.round(d.p * 100)}%</span></small>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-[0.8125rem] text-ink-2">Pohon tumbuh dari kebiasaan kecil yang diulang. Tidak perlu sempurna setiap hari, yang penting kembali lagi besok. &quot;Amalan yang paling dicintai Allah adalah yang terus-menerus walaupun sedikit.&quot; (HR Bukhari &amp; Muslim)</p>
    </>
  )
}
