'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useOffline } from 'next/offline'
import { Button, buttonVariants } from '@/components/ui/primitives'

// Galat di salah satu tab: tab bar tetap ada, pengguna bisa mencoba lagi atau pindah tab.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = useOffline()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 grid size-20 place-items-center rounded-[24px] bg-brand-soft text-4xl" aria-hidden>
        {offline ? '🌙' : '🌧️'}
      </div>
      <h1 className="text-[1.5rem] font-bold">{offline ? 'Sedang tidak tersambung' : 'Halaman ini gagal dimuat'}</h1>
      <p className="mt-2 max-w-[34ch] text-[0.9375rem] text-ink-2">
        {offline ? 'Periksa sinyal atau Wi-Fi. Halaman akan dimuat otomatis saat tersambung.' : 'Maaf, ada kendala sementara. Data Anda tetap aman.'}
      </p>
      <div className="mt-6 grid w-full max-w-[320px] gap-2">
        <Button variant="primary" block onClick={() => reset()}>Coba lagi</Button>
        <Link href="/hari-ini" className={buttonVariants({ block: true })}>Kembali ke Hari ini</Link>
      </div>
    </div>
  )
}
