'use client'

// Perilaku "aplikasi" yang berlaku di semua tab:
// - tinggi keyboard virtual → CSS var --kb (sheet & toast naik di atas keyboard, terutama iOS)
// - aplikasi dibuka lagi dari latar belakang → muat ulang data bila hari berganti atau sudah >15 menit
// - animasi tak berujung dijeda saat aplikasi tersembunyi
// - banner offline (Next.js useOffline: aksi yang tertunda dikirim ulang otomatis saat tersambung)
// - pemberitahuan versi baru dari service worker
import { WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useOffline } from 'next/offline'
import { useEffect, useRef } from 'react'
import { localNow } from '@/lib/curriculum/core'
import { useToast } from './feedback'
import { applyUpdate, SW_UPDATE_EVENT } from './pwa-register'

const STALE_MS = 15 * 60 * 1000

export function AppRuntime({ today, tz }: { today: string; tz: number }) {
  const router = useRouter()
  const toast = useToast()
  const offline = useOffline()
  const hiddenAt = useRef<number | null>(null)

  // Keyboard virtual (visualViewport). Android dengan interactive-widget=resizes-content melaporkan 0.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const update = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
      root.style.setProperty('--kb', kb > 80 ? `${kb}px` : '0px')
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      root.style.setProperty('--kb', '0px')
    }
  }, [])

  // Kembali dari latar belakang.
  useEffect(() => {
    const root = document.documentElement
    const onVis = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now()
        root.dataset.hidden = ''
        return
      }
      delete root.dataset.hidden
      const away = hiddenAt.current ? Date.now() - hiddenAt.current : 0
      hiddenAt.current = null
      if (localNow(tz).date !== today || away > STALE_MS) router.refresh()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [router, today, tz])

  // Versi baru aplikasi siap.
  useEffect(() => {
    const onUpdate = () =>
      toast('Versi baru Pohon Baik tersedia', { variant: 'info', duration: 15000, action: { label: 'Muat ulang', onClick: applyUpdate } })
    window.addEventListener(SW_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate)
  }, [toast])

  if (!offline) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[70] flex justify-center px-3 pt-[calc(6px+env(safe-area-inset-top))]">
      <div className="flex max-w-[520px] items-center gap-2 rounded-full bg-toast px-3.5 py-2 text-[0.8125rem] font-semibold text-white shadow-float">
        <WifiOff size={15} aria-hidden />
        Sedang offline. Centang dan perubahan akan terkirim otomatis saat tersambung.
      </div>
    </div>
  )
}
