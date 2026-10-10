'use client'

import { Camera, PenLine, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { EmptyState } from '@/components/ui/primitives'
import { pesanGalat } from '@/lib/errors'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { deleteMoment } from './actions'
import { useAnak } from './anak-client'
import { MOMENT_CATS, type Moment, type MomentCategory } from './types'

const UNDO_MS = 5000
const FILTERS: { key: 'all' | MomentCategory; label: string; emoji: string }[] = [
  { key: 'all', label: 'Semua', emoji: '🌟' },
  ...MOMENT_CATS,
]

/**
 * Daftar momen + filter kategori. Hapus memakai pola "hapus + Urungkan": momen langsung hilang,
 * penghapusan sebenarnya dikirim setelah 5 detik kecuali pengguna mengetuk "Urungkan".
 */
export function MomenList({ moments }: { moments: Moment[] }) {
  const toast = useToast()
  const { openMoment } = useAnak()
  const [filter, setFilter] = useState<'all' | MomentCategory>('all')
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  // Meninggalkan halaman sebelum 5 detik: kirim penghapusan yang masih tertunda.
  useEffect(() => {
    const map = timers.current
    return () => {
      for (const [id, t] of map) {
        clearTimeout(t)
        deleteMoment(id).catch(() => {})
      }
      map.clear()
    }
  }, [])

  const unhide = (id: string) =>
    setHidden((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })

  const undo = (id: string) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    haptic(5)
    unhide(id)
  }

  const remove = (m: Moment) => {
    haptic(6)
    setHidden((s) => new Set(s).add(m.id))
    const t = setTimeout(async () => {
      timers.current.delete(m.id)
      try {
        await deleteMoment(m.id)
      } catch (e) {
        unhide(m.id)
        toast(pesanGalat(e, 'Gagal menghapus momen. Coba lagi.'), { variant: 'error' })
      }
    }, UNDO_MS)
    timers.current.set(m.id, t)
    toast('Momen dihapus', { variant: 'info', duration: UNDO_MS, action: { label: 'Urungkan', onClick: () => undo(m.id) } })
  }

  const visible = moments.filter((m) => !hidden.has(m.id))
  const list = filter === 'all' ? visible : visible.filter((m) => m.category === filter)

  return (
    <>
      <div role="group" aria-label="Saring kategori momen" className="no-scrollbar scroll-fade -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
        {FILTERS.map(({ key, label, emoji }) => {
          const on = filter === key
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (on) return
                haptic(5)
                setFilter(key)
              }}
              className={cn(
                'hit flex min-h-10 flex-none items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-semibold transition active:scale-95',
                on ? 'bg-brand-2 text-on-brand shadow-card' : 'bg-surface text-ink-2 shadow-card',
              )}
            >
              <span aria-hidden>{emoji}</span>
              {label}
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-card bg-surface shadow-card">
          <EmptyState icon={<Sparkles size={28} />} title={visible.length ? 'Belum ada di kategori ini' : 'Halaman momen masih kosong'}>
            {visible.length
              ? 'Coba kategori lain, atau catat momen baru.'
              : 'Satu kalimat hari ini akan sangat berharga di masa depan.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => {
            const cat = MOMENT_CATS.find((c) => c.key === m.category) ?? MOMENT_CATS[MOMENT_CATS.length - 1]
            return (
              <li key={m.id} className="rounded-card bg-surface py-2 pr-1.5 pl-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-[0.8125rem]">
                    <span aria-hidden>{cat.emoji}</span>
                    <span className="font-bold text-ink-2">{cat.label}</span>
                    <span className="text-ink-3" aria-hidden>
                      ·
                    </span>
                    <time dateTime={m.date} className="text-ink-3">
                      {fmtDate(m.date)}
                    </time>
                  </div>
                  <span className="flex flex-none">
                  {m.source !== 'majelis' && (
                    <button
                      type="button"
                      onClick={() => openMoment({ mode: 'edit', moment: m })}
                      aria-label={`Lengkapi momen ${fmtDate(m.date)}: cerita, usaha, foto`}
                      className="grid size-11 flex-none place-items-center rounded-full text-ink-3 transition active:scale-95 active:bg-fill"
                    >
                      <PenLine size={18} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label={`Hapus momen ${fmtDate(m.date)}`}
                    className="grid size-11 flex-none place-items-center rounded-full text-ink-3 transition active:scale-95 active:bg-danger-soft active:text-danger"
                  >
                    <Trash2 size={18} aria-hidden />
                  </button>
                  </span>
                </div>
                <p className="pr-2.5 pb-2 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{m.text}</p>
                {m.effort && (
                  <p className="mr-2.5 mb-2 rounded-tile bg-gold-soft px-3 py-2 text-[0.875rem] text-gold-ink">
                    <b>Usahanya:</b> {m.effort}
                  </p>
                )}
                {m.photo && (
                  <a href={m.photo.url} target="_blank" rel="noopener" className="mr-2.5 mb-2 block w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- berkas privat lewat endpoint ber-cookie */}
                    <img src={m.photo.thumb} alt={`Foto momen ${fmtDate(m.date)}`} loading="lazy" className="max-h-56 rounded-tile object-cover" />
                  </a>
                )}
                {(m.source === 'milestone' || m.source === 'target' || (m.hasPhoto && !m.photo)) && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {m.source === 'milestone' && (
                      <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-brand">
                        Dari tonggak kemampuan
                      </span>
                    )}
                    {m.source === 'target' && (
                      <span className="rounded-md bg-gold-soft px-1.5 py-0.5 text-[0.6875rem] font-semibold text-gold-ink">
                        <span aria-hidden>🏅</span> Target capaian tercapai
                      </span>
                    )}
                    {m.hasPhoto && !m.photo && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-fill px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-2">
                        <Camera size={12} aria-hidden /> Ada foto di cadangan lama
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
