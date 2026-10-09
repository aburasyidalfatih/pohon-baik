'use client'

// Komponen bersama agar semua tab terasa satu aplikasi: header, segmented control, pemilih anak.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { cn } from '@/lib/utils'

/** Warna anak ke-i (konsisten di semua layar). */
export const kidColor = (i: number) => `var(--kid-${(Math.max(0, i) % 6) + 1})`

/**
 * Judul besar halaman (pola iOS). Saat judul tergulir keluar layar, bilah ringkas
 * berjudul kecil muncul menempel di atas sehingga pengguna tetap tahu sedang di layar mana.
 */
export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { rootMargin: '-8px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-30 mx-auto max-w-[560px] border-b bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[opacity,border-color] duration-200',
          compact ? 'border-line opacity-100' : 'border-transparent opacity-0',
        )}
      >
        <div className="flex h-11 items-center justify-center px-14 text-[1.0625rem] font-semibold">{title}</div>
      </div>
      <div className={cn('flex items-start justify-between gap-3', className)}>
        <div className="min-w-0">
          <h1 ref={ref} className="mt-0.5 text-[2rem] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="mb-3.5 text-sm text-ink-2">{subtitle}</p>}
        </div>
        {action && <div className="mt-1.5 flex-none">{action}</div>}
      </div>
    </>
  )
}

/** Segmented control (iOS) / segmented buttons (M3). Semantik tab untuk pembaca layar. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex rounded-[14px] bg-fill p-1', className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => {
              if (on) return
              haptic(5)
              onChange(o.value)
            }}
            className={cn('min-h-10 flex-1 rounded-[11px] px-2 text-[0.875rem] font-semibold transition', on ? 'bg-surface text-ink shadow-card' : 'text-ink-2 active:bg-surface/50')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Pemilih anak yang sama di semua layar: pil dengan inisial berwarna. */
export function ChildSwitcher({ kids, value, onChange, className, allLabel }: {
  kids: { id: string; name: string }[]
  value: string
  onChange: (id: string) => void
  className?: string
  /** Bila diisi, tampilkan pilihan "semua anak" dengan id 'all'. */
  allLabel?: string
}) {
  if (kids.length < 2 && !allLabel) return null
  const items = allLabel ? [{ id: 'all', name: allLabel }, ...kids] : kids
  return (
    <div role="group" aria-label="Pilih anak" className={cn('no-scrollbar scroll-fade -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 py-0.5', className)}>
      {items.map((k) => {
        const on = k.id === value
        const i = kids.findIndex((x) => x.id === k.id)
        return (
          <button
            key={k.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) return
              haptic(5)
              onChange(k.id)
            }}
            className={cn(
              'hit flex min-h-10 flex-none items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[0.875rem] font-semibold transition active:scale-95',
              on ? 'bg-brand-2 text-on-brand shadow-card' : 'bg-surface text-ink-2 shadow-card',
              k.id === 'all' && 'pl-3.5',
            )}
          >
            {k.id !== 'all' && (
              <span className={cn('grid size-8 place-items-center rounded-full text-[0.8125rem] font-bold text-white', on && 'ring-2 ring-white/80')} style={{ background: kidColor(i) }} aria-hidden>
                {k.name.charAt(0).toUpperCase()}
              </span>
            )}
            {k.name}
          </button>
        )
      })}
    </div>
  )
}
