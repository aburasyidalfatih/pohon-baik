'use client'

import { Download, ExternalLink, Share, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { usePwaInstall } from '@/components/pb/pwa-register'
import { Button } from '@/components/ui/primitives'

const DISMISS_KEY = 'pohonbaik_pwa_dismissed'
const dismissListeners = new Set<() => void>()
const readDismissed = () => {
  try {
    return !!localStorage.getItem(DISMISS_KEY)
  } catch {
    return true
  }
}
const subscribeDismissed = (fn: () => void) => {
  dismissListeners.add(fn)
  return () => dismissListeners.delete(fn)
}

export function InstallBanner() {
  const { canInstall, isStandalone, isIos, isInApp, triggerInstall } = usePwaInstall()
  // Server: anggap sudah ditutup (tidak dirender) agar tidak ada kedip saat hidrasi.
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true)
  const [showIosGuide, setShowIosGuide] = useState(false)

  if (isStandalone || dismissed) return null
  // Tampil bila Chrome/Android menyediakan prompt, di iPhone/iPad, atau di browser dalam aplikasi (WA/IG).
  if (!canInstall && !isIos && !isInApp) return null

  const handleDismiss = () => {
    haptic(5)
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {}
    dismissListeners.forEach((fn) => fn())
  }

  const handleInstallClick = async () => {
    haptic(10)
    if (canInstall) await triggerInstall()
    else if (isIos) setShowIosGuide(true)
  }

  return (
    <aside aria-label="Pasang aplikasi" className="relative my-3 overflow-hidden rounded-[20px] border border-brand-2/20 bg-gradient-to-r from-brand-soft via-surface to-brand-soft/40 p-3.5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="grid size-10 flex-none place-items-center rounded-2xl bg-brand-2 text-on-brand shadow-sm" aria-hidden>
          {isInApp ? <ExternalLink size={20} /> : <Download size={20} />}
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h2 className="text-[0.9375rem] font-bold text-ink">{isInApp ? 'Buka di Chrome atau Safari' : 'Pasang Pohon Baik'}</h2>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-2">
            {isInApp
              ? 'Anda membuka dari WhatsApp/Instagram. Ketuk menu ⋮ atau ··· lalu pilih "Buka di browser" agar bisa dipasang di layar utama.'
              : 'Buka dari layar utama HP seperti aplikasi biasa: lebih cepat dan tanpa bilah browser.'}
          </p>
          {!isInApp && (
            <div className="mt-2.5 flex items-center gap-1">
              <Button variant="primary" size="sm" onClick={handleInstallClick}>
                {isIos && !canInstall ? 'Cara pasang di iPhone' : 'Pasang aplikasi'}
              </Button>
              <Button variant="link" size="sm" onClick={handleDismiss} className="px-3 text-ink-2">
                Nanti saja
              </Button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup saran pemasangan"
        className="hit absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full text-ink-3 transition active:bg-fill"
      >
        <X size={16} />
      </button>

      {showIosGuide && (
        <div className="mt-3 animate-[fadeIn_.2s] border-t border-line/60 pt-2.5 text-[0.8125rem] text-ink-2">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
            <Share size={14} className="text-brand-2" aria-hidden /> Langkah memasang di Safari:
          </p>
          <ol className="list-inside list-decimal space-y-1 pl-1">
            <li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).</li>
            <li>Pilih <b>Tambah ke Layar Utama</b>.</li>
            <li>Ketuk <b>Tambah</b> di pojok kanan atas.</li>
          </ol>
        </div>
      )}
    </aside>
  )
}
