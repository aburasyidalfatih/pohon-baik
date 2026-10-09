import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Posisi daun mengikuti pola filotaksis (sudut emas) agar tajuk tumbuh merata dari tengah.
const LEAF_POS = Array.from({ length: 30 }, (_, i) => {
  const r = Math.sqrt((i + 0.6) / 30), a = i * 2.39996
  return [80 + r * 50 * Math.cos(a), 56 + r * 38 * Math.sin(a), ((a * 57.3) % 180) - 90] as const
})
const FRUIT_POS = [[64, 46], [97, 40], [80, 66], [56, 62], [104, 60], [76, 30], [90, 52]] as const

/**
 * Pohon keluarga. `total` = jumlah slot (tugas), `done` = daun yang sudah tumbuh,
 * `fruits` = waktu yang tuntas. `prevDone`/`prevFruits` menandai daun yang baru
 * tumbuh agar hanya daun itu yang dianimasikan.
 */
export function TreeSvg({ total, done, fruits, prevDone, prevFruits, className }: {
  total: number
  done: number
  fruits: number
  prevDone?: number
  prevFruits?: number
  className?: string
}) {
  const slots = Math.min(LEAF_POS.length, Math.max(6, total))
  const lit = total ? Math.round((done / total) * slots) : 0
  const fr = Math.min(FRUIT_POS.length, fruits)
  const pl = Math.min(prevDone ?? lit, lit), pf = Math.min(prevFruits ?? fr, fr)
  return (
    <svg viewBox="0 0 160 140" className={cn('block h-auto w-full overflow-visible', className)} aria-hidden="true">
      <ellipse cx="80" cy="134" rx="44" ry="5" fill="var(--fill)" />
      <path d="M75 134c1.5-14 2.5-28 1-44h8c-1.5 16-.5 30 1 44z" fill="var(--trunk)" />
      <g className="tree-canopy">
        <ellipse cx="80" cy="58" rx="60" ry="46" fill="var(--brand-soft)" opacity=".55" />
        <path d="M80 98c-8-8-15-16-20-28M80 94c8-8 15-16 20-28M80 92V60" fill="none" stroke="var(--trunk)" strokeWidth="3.2" strokeLinecap="round" />
        {LEAF_POS.slice(0, slots).map(([x, y, a], i) => {
          const on = i < lit
          return (
            <g key={i} transform={`rotate(${a.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`}>
              <ellipse
                className={cn('leaf', on && `on c${(i % 3) + 1}`, on && i >= pl && 'new')}
                cx={x.toFixed(1)} cy={y.toFixed(1)} rx="7.5" ry="4.2"
                style={{ animationDelay: `${Math.max(0, i - pl) * 70}ms` }}
              />
            </g>
          )
        })}
        {FRUIT_POS.slice(0, fr).map(([x, y], i) => (
          <circle key={i} className={cn('fruit', i >= pf && 'new')} cx={x} cy={y} r="4.6" style={{ animationDelay: `${Math.max(0, i - pf) * 90 + 200}ms` }} />
        ))}
      </g>
    </svg>
  )
}

export function TreeCard({ total, done, fruits, streak, label = 'Pohon hari ini' }: {
  total: number
  done: number
  fruits: number
  streak?: number
  label?: string
}) {
  const pct = total ? done / total : 0
  const msg = done === 0 ? 'Bismillah, tanam daun pertama' : pct < 0.5 ? 'Mulai bertunas, terus siram' : pct < 1 ? 'Hampir rindang' : 'Rindang dan berbuah, alhamdulillah'
  return (
    <div className="my-3 flex w-full items-center gap-2.5 rounded-card bg-surface py-2.5 pr-3.5 pl-1.5 text-left shadow-card">
      <div className="w-[104px] flex-none">
        <TreeSvg total={total} done={done} fruits={fruits} />
      </div>
      <div className="min-w-0 flex-1">
        <small className="block text-[0.78125rem] text-ink-2">{label}</small>
        <b className="my-px block text-[1.03125rem] tracking-[-0.01em]">{msg}</b>
        <ProgressBar value={pct} />
        <small className="block text-[0.78125rem] text-ink-2">
          {done}/{total} daun{fruits ? ` · ${fruits} buah` : ''}{streak ? ` · ${streak} hari konsisten` : ''}
        </small>
      </div>
      <ChevronRight className="text-ink-3" size={20} aria-hidden />
    </div>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div aria-hidden className={cn('my-2 h-1.5 overflow-hidden rounded-full bg-fill', className)}>
      <i className="block h-full rounded-full bg-gradient-to-r from-brand-2 to-(--leaf-hi) transition-[width] duration-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  )
}

export function ProgressRing({ value, color = 'var(--brand-2)', size = 66, r = 30, stroke = 4 }: { value: number; color?: string; size?: number; r?: number; stroke?: number }) {
  const C = 2 * Math.PI * r, c = size / 2
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(1, value))} className="transition-[stroke-dashoffset] duration-500" />
    </svg>
  )
}
