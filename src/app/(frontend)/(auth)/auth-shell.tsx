import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/** Kerangka halaman masuk/daftar/sandi: tombol kembali (≥44px), logo kecil, judul besar. */
export function AuthShell({ back, title, subtitle, children }: { back: { href: string; label: string }; title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="page-enter mx-auto min-h-dvh max-w-[560px] px-5 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Link
        href={back.href}
        className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-[1.0625rem] font-medium text-brand-2 transition active:opacity-60"
      >
        <ChevronLeft size={24} aria-hidden /> {back.label}
      </Link>
      <span aria-hidden className="mt-4 grid size-12 place-items-center rounded-[0.875rem] bg-brand-2 text-2xl shadow-card">
        🌳
      </span>
      <h1 className="mt-3 text-[2rem] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
      {subtitle && <p className="mt-1 mb-4 text-[0.9375rem] text-ink-2">{subtitle}</p>}
      {children}
    </main>
  )
}
