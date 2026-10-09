'use client'

import { useEffect, useState } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

/** Event jendela saat versi baru service worker sudah terpasang dan menunggu. */
export const SW_UPDATE_EVENT = 'pb:sw-update'
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'

let deferredPrompt: BeforeInstallPromptEvent | null = null
let waitingWorker: ServiceWorker | null = null
const listeners = new Set<(canInstall: boolean) => void>()

export function registerPrompt(e: BeforeInstallPromptEvent | null) {
  deferredPrompt = e
  listeners.forEach((fn) => fn(Boolean(e)))
}

/** Pasang versi baru: SW yang menunggu diaktifkan, lalu halaman dimuat ulang sekali (controllerchange). */
export function applyUpdate() {
  if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  else location.reload()
}

/** Hapus semua cache aplikasi (dipanggil saat keluar akun agar data keluarga tidak tertinggal di HP). */
export async function clearAppCaches() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR' })
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
  } catch {
    // tidak fatal
  }
}

function detectPlatform() {
  const ua = navigator.userAgent
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  const isIos = /iPhone|iPad|iPod/i.test(ua) || iPadOS
  // Browser di dalam aplikasi (WhatsApp, Instagram, Facebook, LINE, TikTok) tidak bisa memasang PWA.
  const isInApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|musical_ly|; wv\)/i.test(ua)
  return { isIos, isInApp }
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(Boolean(deferredPrompt))
  const [isStandalone, setIsStandalone] = useState<boolean>(false)
  const [isIos, setIsIos] = useState<boolean>(false)
  const [isInApp, setIsInApp] = useState<boolean>(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari standalone navigator property
      Boolean(window.navigator?.standalone)
    const p = detectPlatform()
    // Nilai bergantung pada browser, jadi baru bisa dibaca setelah hidrasi.
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsStandalone(standalone)
    setIsIos(p.isIos)
    setIsInApp(p.isInApp)
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStateChange = (state: boolean) => setCanInstall(state)
    listeners.add(onStateChange)
    return () => {
      listeners.delete(onStateChange)
    }
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return false
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        registerPrompt(null)
        return true
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err)
    }
    return false
  }

  return { canInstall, isStandalone, isIos, isInApp, triggerInstall }
}

export function PwaRegister() {
  useEffect(() => {
    // 1. Service worker (hanya production agar dev tidak tersangkut cache).
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const notify = (w: ServiceWorker) => {
        waitingWorker = w
        window.dispatchEvent(new Event(SW_UPDATE_EVENT))
      }
      const register = () =>
        navigator.serviceWorker
          .register(`/sw.js?v=${encodeURIComponent(APP_VERSION)}`, { scope: '/', updateViaCache: 'none' })
          .then((reg) => {
            if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting)
            reg.addEventListener('updatefound', () => {
              const w = reg.installing
              w?.addEventListener('statechange', () => {
                if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w)
              })
            })
            // Periksa versi baru saat aplikasi kembali dibuka.
            document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}))
          })
          .catch((err) => console.debug('SW reg info:', err))
      // Pendaftaran tidak boleh terlewat bila event `load` sudah lewat sebelum hidrasi.
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })

      let reloaded = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded || !waitingWorker) return
        reloaded = true
        location.reload()
      })
    }

    // 2. Tangkap event beforeinstallprompt
    const handleBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      registerPrompt(e)
    }
    const handleAppInstalled = () => registerPrompt(null)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return null
}
