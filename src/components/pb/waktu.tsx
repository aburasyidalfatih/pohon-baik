import { Bed, Check, ChevronRight, Clock, Moon, Sun, Sunrise, Sunset, Utensils, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { WAKTU, type Waktu } from '@/lib/curriculum/constants'
import { cn } from '@/lib/utils'
import { Chip } from '@/components/ui/primitives'

export const WAKTU_ICON: Record<Waktu, LucideIcon> = { subuh: Sunrise, pagi: Sun, dzuhur: Utensils, ashar: Sunset, maghrib: Moon, isya: Bed, hari: Clock }

/** Kartu satu waktu (Ba'da Subuh, Pagi, …). Terbuka otomatis saat waktunya aktif. */
export function WaktuSection({ waktu, time, done, total, now, open, children }: {
  waktu: Waktu
  time?: string
  done: number
  total: number
  now?: boolean
  open?: boolean
  children: ReactNode
}) {
  const Icon = WAKTU_ICON[waktu]
  const allDone = total > 0 && done === total
  const name = WAKTU[waktu].name
  // Ringkasan dibacakan utuh oleh pembaca layar: nama waktu, status, dan progres.
  const label = `${name}${now ? ', sedang berjalan' : ''}${time ? `, pukul ${time}` : ''}. ${allDone ? 'Semua tuntas' : `${done} dari ${total} selesai`}`
  return (
    <details className={cn('wsec my-3 overflow-hidden rounded-card bg-surface shadow-card', now && 'shadow-[0_0_0_2px_var(--brand-2),var(--sh-1)]')} open={open}>
      <summary aria-label={label} className="flex min-h-11 cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors active:bg-fill/60">
        <div className={cn('grid size-10 flex-none place-items-center rounded-[13px]', allDone ? 'bg-brand-2 text-on-brand' : `wk-${waktu}`)} aria-hidden>
          {allDone ? <Check size={20} /> : <Icon size={20} />}
        </div>
        <div className="min-w-0 flex-1" aria-hidden>
          <b className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-base">
            <span className="whitespace-nowrap">{name}</span>
            {now && <span className="rounded-full bg-brand-2 px-2 py-0.5 align-[2px] text-[0.6875rem] font-bold tracking-[.04em] text-on-brand uppercase">Sekarang</span>}
          </b>
          <small className="text-[0.78125rem] text-ink-2">{time ? `${time} · ` : ''}{WAKTU[waktu].sub}</small>
        </div>
        {!allDone && (
          <span className="h-1 w-[34px] flex-none overflow-hidden rounded-full bg-fill" aria-hidden>
            <i className="block h-full rounded-full bg-brand-2" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </span>
        )}
        <span className={cn('rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold tabular-nums', allDone ? 'bg-brand-soft text-brand' : 'bg-fill text-ink-2')} aria-hidden>
          {done}/{total}
        </span>
        <ChevronRight className="wsec-chev text-ink-3 transition-transform" size={20} aria-hidden />
      </summary>
      <div className="px-4 pb-3">{children}</div>
    </details>
  )
}

/**
 * Baris tugas: teks di kiri (tombol "lihat detail"), centang di kanan, tanpa coretan saat selesai.
 * Centang memakai role="checkbox" agar statusnya terbaca; area sentuhnya 44px lewat `.chk::before`.
 */
export function TaskRow({ title, description, tag, tagTone = 'brand', done, onToggle, onOpen }: {
  title: string
  description?: string | null
  tag?: string
  tagTone?: 'brand' | 'gold' | 'soft'
  done?: boolean
  onToggle?: () => void
  /** Membuka detail tugas. Tanpa ini, isi baris hanya teks biasa. */
  onOpen?: () => void
}) {
  const body = (
    <>
      <span className={cn('block text-[0.96875rem]', done && 'text-ink-2')}>
        {title} {tag && <Chip tone={tagTone} className="ml-1">{tag}</Chip>}
        {onOpen && <span className="sr-only">, lihat detail</span>}
      </span>
      {description && <span className={cn('mt-0.5 line-clamp-2 block text-[0.8125rem]', done ? 'text-ink-3' : 'text-ink-2')}>{description}</span>}
    </>
  )
  return (
    <div className="flex items-start gap-3 border-b border-line last:border-b-0">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="pressable -mx-2 min-h-11 min-w-0 flex-1 rounded-tile px-2 py-3 text-left">
          {body}
        </button>
      ) : (
        <div className="min-w-0 flex-1 py-3">{body}</div>
      )}
      <button type="button" role="checkbox" aria-checked={!!done} aria-label={title} className="chk mt-3" onClick={onToggle} disabled={!onToggle} />
    </div>
  )
}
