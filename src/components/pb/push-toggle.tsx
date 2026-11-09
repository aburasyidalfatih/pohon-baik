'use client'

import { useEffect, useState } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { cn } from '@/lib/utils'
import { deletePushSubscription, savePushSubscription } from '@/app/(frontend)/(app)/keluarga/actions'

type State = 'loading' | 'unsupported' | 'blocked' | 'off' | 'on'

const b64ToBytes = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

async function registration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  // Service worker hanya dipasang di build production (lihat pwa-register.tsx).
  return (await navigator.serviceWorker.getRegistration('/')) ?? null
}

/** Lepas langganan notifikasi perangkat ini (dipanggil saat keluar akun: HP bisa dipakai bersama). */
export async function disablePushHere() {
  try {
    const sub = await (await registration())?.pushManager.getSubscription()
    if (!sub) return
    await deletePushSubscription(sub.endpoint).catch(() => {})
    await sub.unsubscribe()
  } catch {
    // tidak fatal
  }
}

/** Sakelar "Pengingat waktu shalat" untuk perangkat ini. */
export function PushToggle({ vapidKey, rowCls }: { vapidKey: string; rowCls: string }) {
  const toast = useToast()
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const reg = await registration()
      if (!alive) return
      if (!vapidKey || !reg || typeof Notification === 'undefined') return setState('unsupported')
      if (Notification.permission === 'denied') return setState('blocked')
      setState((await reg.pushManager.getSubscription()) ? 'on' : 'off')
    })()
    return () => {
      alive = false
    }
  }, [vapidKey])

  async function toggle() {
    if (busy || (state !== 'on' && state !== 'off')) return
    setBusy(true)
    haptic(8)
    try {
      const reg = await registration()
      if (!reg) return setState('unsupported')
      if (state === 'on') {
        await disablePushHere()
        setState('off')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'blocked' : 'off')
        return
      }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey) })
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await savePushSubscription(json, navigator.userAgent)
      setState('on')
      toast('Pengingat aktif. Kami kabari saat waktu shalat masuk.', { variant: 'success' })
    } catch {
      toast('Pengingat belum bisa diaktifkan. Coba lagi.', { variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const note =
    state === 'unsupported' ? 'Pasang aplikasi ke layar utama dulu (di iPhone: Bagikan → Tambah ke Layar Utama)'
    : state === 'blocked' ? 'Notifikasi diblokir. Izinkan di pengaturan situs/aplikasi pada HP ini'
    : 'Tugas setiap waktu shalat, dan Majelis Malam saat Maghrib'

  return (
    <div className={rowCls}>
      <span id="push-label" className="min-w-0">
        <span className="block text-[0.9375rem]">Pengingat waktu shalat</span>
        <span className="block text-[0.8125rem] text-ink-2">{note}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={state === 'on'}
        aria-labelledby="push-label"
        aria-busy={busy || state === 'loading'}
        disabled={state === 'unsupported' || state === 'blocked' || state === 'loading' || busy}
        onClick={toggle}
        className={cn('hit relative h-8 w-[3.25rem] flex-none rounded-full transition-colors disabled:opacity-50', state === 'on' ? 'bg-brand-2' : 'bg-fill')}
      >
        <span aria-hidden className={cn('absolute top-1 left-1 size-6 rounded-full bg-surface shadow-card transition-transform', state === 'on' && 'translate-x-5')} />
      </button>
    </div>
  )
}
