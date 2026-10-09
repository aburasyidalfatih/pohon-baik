import type { ReactNode } from 'react'

/** Layar status penuh (404, galat, offline) bergaya aplikasi, dengan jalan keluar yang jelas. */
export function StatusScreen({ emoji, title, children, actions }: { emoji: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[calc(24px+env(safe-area-inset-bottom))] text-center">
      <div className="mb-5 grid size-24 place-items-center rounded-[28px] bg-brand-soft text-5xl" aria-hidden>
        {emoji}
      </div>
      <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
      {children && <div className="mt-2 max-w-[34ch] text-[0.9375rem] text-ink-2">{children}</div>}
      {actions && <div className="mt-6 grid w-full max-w-[320px] gap-2">{actions}</div>}
    </main>
  )
}
