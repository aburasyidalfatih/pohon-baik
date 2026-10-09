'use client'

import { BookOpen, Book, Sprout, Sun, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { cn } from '@/lib/utils'

export { Sheet } from './sheet'

const TABS: [string, string, LucideIcon][] = [
  ['/hari-ini', 'Hari ini', Sun],
  ['/tema', 'Tema', BookOpen],
  ['/quran', "Qur'an", Book],
  ['/anak', 'Anakku', Sprout],
  ['/keluarga', 'Keluarga', Users],
]

/**
 * Tab bar bawah. Tab berpindah seketika saat diketuk (tidak menunggu server),
 * mengetuk tab aktif menggulir ke atas, dan lencana menampilkan jumlah yang perlu perhatian.
 */
export function TabBar({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname()
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null)
  // Navigasi selesai (path berubah) → lepas status tertunda.
  if (pending && pending.from !== path) setPending(null)
  const active = pending?.href ?? TABS.find(([href]) => path.startsWith(href))?.[0]

  return (
    <nav aria-label="Menu utama" className="tabbar fixed bottom-0 left-1/2 z-20 flex w-full max-w-[560px] -translate-x-1/2 border-t border-line bg-surface/85 px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur-xl backdrop-saturate-180">
      {TABS.map(([href, label, Icon]) => {
        const on = active === href
        const n = badges[href] ?? 0
        return (
          <Link
            key={href}
            href={href}
            transitionTypes={['tab']}
            aria-current={on ? 'page' : undefined}
            onClick={(e) => {
              haptic(8)
              if (path.startsWith(href) && !(e.metaKey || e.ctrlKey)) {
                // Ketuk tab yang sedang dibuka = kembali ke atas (pola iOS & Android).
                e.preventDefault()
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
              }
              setPending({ href, from: path })
            }}
            className={cn('flex min-h-[52px] flex-1 flex-col items-center gap-0.5 py-1 text-[0.6875rem] font-semibold transition-colors active:scale-95', on ? 'text-brand-2' : 'text-ink-3')}
          >
            <span className={cn('relative grid h-[30px] w-[52px] place-items-center rounded-[15px] transition-colors duration-200', on && 'bg-brand-soft')}>
              <Icon size={23} aria-hidden />
              {n > 0 && (
                <span className="absolute -top-1 right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger-strong px-1 text-[0.6875rem] leading-none font-bold text-white tabular-nums">
                  {n > 99 ? '99+' : n}
                  <span className="sr-only"> perlu perhatian</span>
                </span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
