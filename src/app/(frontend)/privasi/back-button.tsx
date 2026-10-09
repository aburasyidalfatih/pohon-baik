'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

/** Tombol kembali bergaya aplikasi: mundur di riwayat bila ada, selain itu ke `fallback`. */
export function BackButton({ fallback = '/', label = 'Kembali' }: { fallback?: string; label?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.replace(fallback))}
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-[1.0625rem] font-medium text-brand-2 transition active:opacity-60"
    >
      <ChevronLeft size={24} aria-hidden /> {label}
    </button>
  )
}
