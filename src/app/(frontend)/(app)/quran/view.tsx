'use client'

import { BookOpen, Check, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useEffect, useId, useOptimistic, useRef, useState, useTransition, type FormEvent } from 'react'
import { celebrate, haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { Sheet } from '@/components/pb/sheet'
import { LockedNotice } from '@/components/pb/billing-notice'
import { ChildSwitcher, PageHeader } from '@/components/pb/ui'
import { Button, Card, EmptyState, Field, Input, SectionLabel, Select } from '@/components/ui/primitives'
import { DEFAULT_TAHFIDZ, INTERVALS, SURAH_LIST, TAHFIDZ_TARGETS } from '@/lib/curriculum/constants'
import { daysBetween, nextReview } from '@/lib/curriculum/core'
import { pesanGalat } from '@/lib/errors'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { addQuranSetoran, deleteQuranSetoran, markQuranPassed, resetQuranSetoran, restoreQuranSetoran } from './actions'

/** Data mentah setoran dari server; status jadwal dihitung di klien agar bisa berubah optimistis. */
export type QuranEntryData = {
  id: string
  label: string
  base: string
  done: number[]
}

export type QuranViewProps = {
  today: string
  activeChild: {
    id: string
    name: string
    tahfidzTarget?: string | null
  }
  childrenList: {
    id: string
    name: string
  }[]
  entries: QuranEntryData[]
  /** Diisi bila langganan anak belum aktif: hanya kartu "aktifkan" yang tampil. */
  lockedPrice?: number
}

type Optimis =
  | { type: 'pass'; id: string; interval: number }
  | { type: 'reset'; id: string; base: string }
  | { type: 'restore'; id: string; base: string; done: number[] }
  | { type: 'add'; entry: QuranEntryData }
  | { type: 'delete'; id: string }

function reduce(list: QuranEntryData[], a: Optimis): QuranEntryData[] {
  switch (a.type) {
    case 'add':
      return [a.entry, ...list]
    case 'delete':
      return list.filter((x) => x.id !== a.id)
    case 'pass':
      return list.map((x) => (x.id === a.id && !x.done.includes(a.interval) ? { ...x, done: [...x.done, a.interval] } : x))
    case 'reset':
      return list.map((x) => (x.id === a.id ? { ...x, base: a.base, done: [] } : x))
    case 'restore':
      return list.map((x) => (x.id === a.id ? { ...x, base: a.base, done: a.done } : x))
  }
}

function derive(x: QuranEntryData, today: string) {
  const nr = nextReview(x)
  return {
    ...x,
    nextInterval: nr?.interval ?? null,
    nextReviewDate: nr?.date ?? null,
    isDue: !!nr && nr.date <= today,
    isMutqin: !nr,
    lateDays: nr ? Math.max(0, daysBetween(nr.date, today)) : 0,
  }
}

const CUSTOM = '__custom'
const UNDO_MS = 5000

/** Angka ayat: kosong → null, bukan bilangan bulat positif → NaN. */
const parseAyat = (s: string) => (s.trim() === '' ? null : /^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN)

export function QuranView({ today, activeChild, childrenList, entries, lockedPrice }: QuranViewProps) {
  const router = useRouter()
  const toast = useToast()
  const [switching, startSwitch] = useTransition()

  // Daftar optimistis + status pending per item (otomatis bersih saat transisi selesai).
  const [list, applyOptimis] = useOptimistic(entries, reduce)
  const [pendingIds, markPending] = useOptimistic<string[], string>([], (s, id) => [...s, id])

  // Hapus ditunda 5 detik agar bisa diurungkan.
  const [removing, setRemoving] = useState<string[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const [sheetOpen, setSheetOpen] = useState(false)

  const items = list.filter((x) => !removing.includes(x.id)).map((x) => derive(x, today))
  const dueItems = items.filter((x) => x.isDue)
  const stats = {
    total: items.length,
    due: dueItems.length,
    mutqin: items.filter((x) => x.isMutqin).length,
  }
  const target = TAHFIDZ_TARGETS.find((x) => x.id === (activeChild.tahfidzTarget ?? DEFAULT_TAHFIDZ)) ?? TAHFIDZ_TARGETS[1]

  // Kirim hapus yang masih menunggu bila pengguna meninggalkan layar sebelum 5 detik.
  useEffect(() => {
    const map = timers.current
    return () => {
      for (const [id, t] of map) {
        clearTimeout(t)
        deleteQuranSetoran(id).catch(() => {})
      }
      map.clear()
    }
  }, [])

  /** Jalankan aksi server dengan perubahan optimistis; galat → rollback otomatis + toast. */
  const run = (id: string, change: Optimis, action: () => Promise<unknown>, fallback: string) => {
    startTransition(async () => {
      markPending(id)
      applyOptimis(change)
      try {
        await action()
      } catch (e) {
        toast(pesanGalat(e, fallback), { variant: 'error' })
      }
    })
  }

  const handleSelectChild = (childId: string) => {
    startSwitch(() => router.replace(`/quran?cid=${childId}`, { scroll: false }))
  }

  const handlePass = (id: string, interval: number) => {
    haptic([10, 50, 10])
    if (interval === 30) celebrate(24)
    toast(interval === 30 ? 'MasyaAllah, hafalan ini sudah mutqin!' : 'Alhamdulillah, murajaah lancar')
    run(id, { type: 'pass', id, interval }, () => markQuranPassed(id, interval), 'Gagal menyimpan murajaah. Coba lagi.')
  }

  const handleReset = (id: string) => {
    const prev = list.find((x) => x.id === id)
    if (!prev) return
    haptic(8)
    run(id, { type: 'reset', id, base: today }, () => resetQuranSetoran(id, today), 'Gagal mengulang jadwal. Coba lagi.')
    toast('Jadwal murajaah diulang dari awal', {
      action: {
        label: 'Urungkan',
        onClick: () =>
          run(
            id,
            { type: 'restore', id, base: prev.base, done: prev.done },
            () => restoreQuranSetoran(id, prev.base, prev.done),
            'Gagal mengurungkan. Coba lagi.',
          ),
      },
    })
  }

  const handleDelete = (id: string, label: string) => {
    haptic(6)
    setRemoving((r) => [...r, id])
    const t = setTimeout(() => {
      timers.current.delete(id)
      startTransition(async () => {
        markPending(id)
        applyOptimis({ type: 'delete', id })
        setRemoving((r) => r.filter((x) => x !== id))
        try {
          await deleteQuranSetoran(id)
        } catch (e) {
          toast(pesanGalat(e, 'Gagal menghapus setoran. Coba lagi.'), { variant: 'error' })
        }
      })
    }, UNDO_MS)
    timers.current.set(id, t)
    toast(`"${label}" dihapus`, {
      duration: UNDO_MS,
      action: {
        label: 'Urungkan',
        onClick: () => {
          clearTimeout(timers.current.get(id))
          timers.current.delete(id)
          setRemoving((r) => r.filter((x) => x !== id))
        },
      },
    })
  }

  /** Tambah setoran optimistis: sheet langsung tertutup, isi form dikosongkan hanya bila berhasil. */
  const handleAdd = (label: string, base: string, onOk: () => void) => {
    const tmpId = `tmp-${Date.now()}`
    haptic(10)
    celebrate(12)
    toast('Setoran tersimpan')
    startTransition(async () => {
      markPending(tmpId)
      applyOptimis({ type: 'add', entry: { id: tmpId, label, base, done: [] } })
      try {
        await addQuranSetoran(activeChild.id, label, base)
        onOk()
      } catch (e) {
        toast(pesanGalat(e, 'Gagal menyimpan setoran.'), {
          variant: 'error',
          action: { label: 'Buka lagi', onClick: () => setSheetOpen(true) },
        })
      }
    })
  }

  const openSheet = () => {
    haptic(5)
    setSheetOpen(true)
  }

  if (lockedPrice !== undefined) {
    return (
      <>
        <PageHeader title="Qur'an" subtitle={<>Hafalan & murajaah · {activeChild.name}</>} />
        <ChildSwitcher kids={childrenList} value={activeChild.id} onChange={handleSelectChild} />
        <LockedNotice kids={[activeChild.name]} price={lockedPrice} what="Hafalan dan jadwal murajaahnya" />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Qur'an" subtitle={<>Hafalan & murajaah · {activeChild.name}</>} />

      <ChildSwitcher kids={childrenList} value={activeChild.id} onChange={handleSelectChild} />

      <div aria-busy={switching} className={cn('transition-opacity', switching && 'opacity-60')}>
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen size={28} />}
              title="Belum ada setoran"
              action={
                <Button variant="primary" onClick={openSheet}>
                  <Plus size={18} aria-hidden /> Tambah setoran pertama
                </Button>
              }
            >
              Catat surah yang sudah disetorkan {activeChild.name}. Murajaahnya akan dijadwalkan pada hari ke-1, 2, 4, 7, 14, dan 30 agar hafalan melekat kuat.
            </EmptyState>
          </Card>
        ) : (
          /* Ringkasan statistik */
          <div className="my-3 grid grid-cols-3 gap-2.5">
            <StatCard value={stats.total} label="Hafalan" aria={`${stats.total} hafalan tercatat`} className="text-ink" />
            <StatCard value={stats.due} label="Jatuh tempo" aria={`${stats.due} hafalan jatuh tempo hari ini`} className="text-brand-2" />
            <StatCard value={stats.mutqin} label="Mutqin" aria={`${stats.mutqin} hafalan sudah mutqin`} className="text-gold-ink" />
          </div>
        )}

        {/* Target hafalan (diatur di Keluarga → Ubah data anak) */}
        <div className="mb-3 rounded-card bg-gold-soft/50 p-3.5 text-xs leading-relaxed text-ink-2 shadow-card">
          <b className="text-[0.8125rem] text-ink">Target: {target.name}</b> · {target.desc} Mutqin (lancar dan terjaga) lebih utama daripada banyak; tambah hafalan baru hanya bila murajaah hari ini sudah beres.
        </div>

        {items.length > 0 && (
          <>
            {/* Murajaah hari ini */}
            <SectionLabel>Murajaah hari ini</SectionLabel>
            <div className="overflow-hidden rounded-card bg-surface px-4 py-1 shadow-card">
              {dueItems.length === 0 ? (
                <p className="flex items-center gap-2.5 py-3 text-sm text-ink-2">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-brand-soft text-brand" aria-hidden>
                    <Check size={15} />
                  </span>
                  Murajaah hari ini sudah beres. Alhamdulillah.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {dueItems.map((e) => {
                    const busy = pendingIds.includes(e.id)
                    return (
                      <li key={e.id} aria-busy={busy} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <b className="block text-[0.9375rem] font-semibold text-ink">{e.label}</b>
                          <small className="text-xs text-ink-2">
                            Ulangan hari ke-{e.nextInterval}
                            {e.lateDays > 0 && <span className="font-medium text-danger"> · terlambat {e.lateDays} hari</span>}
                          </small>
                        </div>
                        <div className="flex flex-none gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy}
                            aria-label={`Lancar: ${e.label}`}
                            onClick={() => e.nextInterval && handlePass(e.id, e.nextInterval)}
                          >
                            <Check size={15} aria-hidden /> Lancar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            disabled={busy}
                            aria-label={`Ulang dari awal: ${e.label}`}
                            onClick={() => handleReset(e.id)}
                          >
                            <RotateCcw size={14} aria-hidden /> Ulang
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="my-3">
              <Button variant="primary" block onClick={openSheet}>
                <Plus size={18} aria-hidden /> Tambah setoran
              </Button>
            </div>

            {/* Semua hafalan */}
            <SectionLabel>Semua hafalan ({items.length})</SectionLabel>
            <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface px-4 shadow-card">
              {items.map((e) => {
                const busy = pendingIds.includes(e.id)
                return (
                  <li key={e.id} aria-busy={busy} className={cn('flex items-center justify-between gap-3 py-3 transition-opacity', busy && 'opacity-70')}>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[0.9375rem] font-semibold text-ink">{e.label}</b>
                      <small className="text-xs text-ink-2">
                        Setoran {fmtDate(e.base)} ·{' '}
                        {e.isMutqin ? (
                          <span className="font-semibold text-brand-2">
                            Mutqin <span aria-hidden>✓</span>
                          </span>
                        ) : e.nextReviewDate ? (
                          `berikutnya ${fmtDate(e.nextReviewDate)}`
                        ) : (
                          'menunggu jadwal'
                        )}
                      </small>
                      <div className="mt-2 flex items-center gap-1.5">
                        {INTERVALS.map((inv) => (
                          <span
                            key={inv}
                            aria-hidden
                            className={cn('size-2 rounded-full transition', e.done.includes(inv) ? 'bg-brand-2' : 'bg-fill ring-1 ring-ink-4/40')}
                          />
                        ))}
                        <span className="ml-1 text-[0.6875rem] text-ink-3">
                          {e.done.length}/{INTERVALS.length} putaran
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDelete(e.id, e.label)}
                      aria-label={`Hapus setoran ${e.label}`}
                      className="hit grid size-10 flex-none place-items-center rounded-full text-ink-3 transition active:scale-95 active:bg-danger-soft active:text-danger disabled:opacity-50"
                    >
                      <Trash2 size={18} aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>

            <p className="mt-3 px-1 text-xs leading-relaxed text-ink-2">
              Setelah setoran lancar, ulangan dijadwalkan pada hari ke-1, 2, 4, 7, 14, dan 30 (pengulangan berjarak). Ketuk &ldquo;Ulang&rdquo; bila hafalan tersendat agar jadwal dimulai kembali.
            </p>
          </>
        )}
      </div>

      <SetoranSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        childName={activeChild.name}
        today={today}
        onSubmit={(label, base, reset) => {
          setSheetOpen(false)
          handleAdd(label, base, reset)
        }}
      />
    </>
  )
}

function StatCard({ value, label, aria, className }: { value: number; label: string; aria: string; className?: string }) {
  return (
    <div role="group" aria-label={aria} className="rounded-card bg-surface p-3 text-center shadow-card">
      <b aria-hidden className={cn('block text-2xl font-bold tabular-nums', className)}>{value}</b>
      <small aria-hidden className="text-xs text-ink-2">{label}</small>
    </div>
  )
}

type Errs = Partial<Record<'custom' | 'from' | 'to' | 'date', string>>

/** Sheet "Tambah setoran" sebagai <form> dengan validasi inline. */
function SetoranSheet({
  open,
  onClose,
  childName,
  today,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  childName: string
  today: string
  onSubmit: (label: string, base: string, reset: () => void) => void
}) {
  const formId = useId()
  const [surah, setSurah] = useState(SURAH_LIST[0][0])
  const [customSurah, setCustomSurah] = useState('')
  const [fromAyat, setFromAyat] = useState('')
  const [toAyat, setToAyat] = useState('')
  const [baseDate, setBaseDate] = useState(today)
  const [tried, setTried] = useState(false)

  const isCustom = surah === CUSTOM
  const name = isCustom ? customSurah.trim() : surah
  const maxAyat = isCustom ? undefined : SURAH_LIST.find(([n]) => n === surah)?.[1]
  const from = parseAyat(fromAyat)
  const to = parseAyat(toAyat)

  const validate = (): Errs => {
    const e: Errs = {}
    if (isCustom && !name) e.custom = 'Tulis nama surah atau bagian hafalan'
    const limit = maxAyat ? `${name} hanya ${maxAyat} ayat` : ''
    if (from !== null && (Number.isNaN(from) || from < 1)) e.from = 'Isi nomor ayat mulai dari 1'
    else if (from !== null && maxAyat && from > maxAyat) e.from = limit
    if (to !== null && (Number.isNaN(to) || to < 1)) e.to = 'Isi nomor ayat mulai dari 1'
    else if (to !== null && maxAyat && to > maxAyat) e.to = limit
    else if (to !== null && from !== null && !e.from && to < from) e.to = `Harus sama dengan atau setelah ayat ${from}`
    if (!baseDate) e.date = 'Pilih tanggal setoran'
    else if (baseDate > today) e.date = 'Tanggal setoran tidak boleh setelah hari ini'
    return e
  }
  const errs = tried ? validate() : {}

  const reset = () => {
    setSurah(SURAH_LIST[0][0])
    setCustomSurah('')
    setFromAyat('')
    setToAyat('')
    setBaseDate(today)
    setTried(false)
  }

  const buildLabel = () => {
    const a = from ?? (to !== null ? 1 : null)
    if (a === null) return name
    const b = to ?? maxAyat ?? null
    if (b === null) return `${name} (mulai ayat ${a})`
    if (a === 1 && maxAyat && b === maxAyat) return name
    return a === b ? `${name} (ayat ${a})` : `${name} (${a}–${b})`
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    setTried(true)
    const e = validate()
    const first = (['custom', 'from', 'to', 'date'] as const).find((k) => e[k])
    if (first) {
      haptic([10, 40, 10])
      document.getElementById(`${formId}-${first}`)?.focus()
      return
    }
    onSubmit(buildLabel(), baseDate, reset)
  }

  const describe = (k: keyof Errs, id: string) => (errs[k] ? `${id}-err` : `${id}-hint`)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Tambah setoran · ${childName}`}
      footer={
        <Button type="submit" form={formId} variant="primary" block>
          Simpan setoran
        </Button>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="py-1">
        <Field label="Surah" id={`${formId}-surah`}>
          <Select id={`${formId}-surah`} value={surah} onChange={(e) => setSurah(e.target.value)}>
            {SURAH_LIST.map(([n, ayat]) => (
              <option key={n} value={n}>
                {n} · {ayat} ayat
              </option>
            ))}
            <option value={CUSTOM}>Lainnya…</option>
          </Select>
        </Field>

        {isCustom && (
          <Field label="Nama surah atau bagian" id={`${formId}-custom`} error={errs.custom}>
            <Input
              id={`${formId}-custom`}
              required
              autoFocus
              autoCapitalize="words"
              autoComplete="off"
              enterKeyHint="next"
              placeholder="Misal: Al-Mulk atau Juz 29"
              value={customSurah}
              aria-invalid={!!errs.custom}
              aria-describedby={errs.custom ? `${formId}-custom-err` : undefined}
              onChange={(e) => setCustomSurah(e.target.value)}
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Dari ayat (opsional)" id={`${formId}-from`} error={errs.from} hint={maxAyat ? `1–${maxAyat}` : undefined}>
            <Input
              id={`${formId}-from`}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={maxAyat}
              enterKeyHint="next"
              placeholder="1"
              value={fromAyat}
              aria-invalid={!!errs.from}
              aria-describedby={maxAyat || errs.from ? describe('from', `${formId}-from`) : undefined}
              onChange={(e) => setFromAyat(e.target.value)}
            />
          </Field>
          <Field label="Sampai ayat (opsional)" id={`${formId}-to`} error={errs.to} hint={maxAyat ? 'Kosong = sampai akhir' : undefined}>
            <Input
              id={`${formId}-to`}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={from && !Number.isNaN(from) ? from : 1}
              max={maxAyat}
              enterKeyHint="done"
              placeholder={maxAyat ? String(maxAyat) : 'Akhir'}
              value={toAyat}
              aria-invalid={!!errs.to}
              aria-describedby={maxAyat || errs.to ? describe('to', `${formId}-to`) : undefined}
              onChange={(e) => setToAyat(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Tanggal setoran" id={`${formId}-date`} error={errs.date}>
          <Input
            id={`${formId}-date`}
            type="date"
            required
            max={today}
            value={baseDate}
            aria-invalid={!!errs.date}
            aria-describedby={errs.date ? `${formId}-date-err` : undefined}
            onChange={(e) => setBaseDate(e.target.value)}
          />
        </Field>
      </form>
    </Sheet>
  )
}
