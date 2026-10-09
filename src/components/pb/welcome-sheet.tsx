'use client'

import { Clock, Download, Moon, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { usePwaInstall } from './pwa-register'
import { Sheet } from './sheet'

type Slide = { icon: LucideIcon; cls: string; title: string; text: string }
const SLIDES: Slide[] = [
  {
    icon: Clock,
    cls: 'wk-subuh',
    title: 'Ritme mengikuti waktu shalat',
    text: 'Hari ini dibagi per waktu shalat, dari Subuh sampai Isya. Kerjakan tugas kecil di setiap waktu, lalu ketuk lingkarannya untuk mencentang.',
  },
  {
    icon: SlidersHorizontal,
    cls: 'wk-hari',
    title: 'Atur beban harian anak',
    text: 'Di menu Keluarga, pilih beban harian setiap anak: Inti (±15 menit), Seimbang (±45 menit), atau Penuh untuk keluarga homeschool.',
  },
  {
    icon: Moon,
    cls: 'wk-maghrib',
    title: 'Majelis Malam & pasang aplikasi',
    text: 'Selepas Maghrib, kumpulkan keluarga di Majelis Malam. Pasang Pohon Baik di layar utama HP agar terbuka cepat seperti aplikasi.',
  },
]

/** Lembar sambutan 3 slide untuk pengguna baru (URL berisi `?selamat=1`, dikirim setelah mendaftar). */
export function WelcomeSheet() {
  return (
    <Suspense fallback={null}>
      <Welcome />
    </Suspense>
  )
}

function Welcome() {
  const params = useSearchParams()
  const [closed, setClosed] = useState(false)
  const [i, setI] = useState(0)
  const { canInstall, isStandalone, triggerInstall } = usePwaInstall()
  const open = params.get('selamat') === '1' && !closed

  function close() {
    setClosed(true)
    // Tunggu sheet membuang entri riwayat miliknya (history.back), baru hapus ?selamat dari URL
    // tanpa menambah entri baru. replaceState(null, …) disinkronkan dengan router Next.js.
    let done = false
    const clean = () => {
      if (done) return
      done = true
      window.removeEventListener('popstate', onPop)
      const url = new URL(window.location.href)
      if (!url.searchParams.has('selamat')) return
      url.searchParams.delete('selamat')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
    const onPop = () => setTimeout(clean, 0)
    window.addEventListener('popstate', onPop)
    setTimeout(clean, 500)
  }

  const s = SLIDES[i]
  const last = i === SLIDES.length - 1
  const Icon = s.icon

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Selamat datang"
      footer={
        <div className="flex gap-2.5">
          {last ? (
            canInstall && !isStandalone ? (
              <Button className="flex-1" onClick={() => void triggerInstall()}>
                <Download size={18} aria-hidden /> Pasang
              </Button>
            ) : null
          ) : (
            <Button className="flex-1" onClick={close}>
              Lewati
            </Button>
          )}
          <Button variant="primary" className="flex-[2]" onClick={() => (last ? close() : setI(i + 1))}>
            {last ? 'Mulai' : 'Lanjut'}
          </Button>
        </div>
      }
    >
      <div className="pt-2 pb-1" aria-live="polite">
        <span aria-hidden className={cn('grid size-14 place-items-center rounded-tile', s.cls)}>
          <Icon size={28} />
        </span>
        <h3 className="mt-3 text-[1.25rem] font-bold">{s.title}</h3>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{s.text}</p>
      </div>
      <div className="mt-3 flex items-center justify-center gap-1" role="group" aria-label={`Slide ${i + 1} dari ${SLIDES.length}`}>
        {SLIDES.map((x, n) => (
          <button
            key={x.title}
            type="button"
            aria-label={`Slide ${n + 1}: ${x.title}`}
            aria-current={n === i ? 'step' : undefined}
            onClick={() => setI(n)}
            className="grid size-11 place-items-center"
          >
            <span aria-hidden className={cn('block h-2 rounded-full transition-all', n === i ? 'w-6 bg-brand-2' : 'w-2 bg-ink-4')} />
          </button>
        ))}
      </div>
    </Sheet>
  )
}
