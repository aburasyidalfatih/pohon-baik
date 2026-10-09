'use client'

// Umpan balik bersama untuk semua layar aplikasi:
// - useToast(): satu toast (sukses/galat/info) dengan aria-live, safe-area, dan aksi opsional (mis. "Urungkan").
// - useConfirm(): action sheet ala iOS/M3 sebagai pengganti window.confirm().
import { AlertCircle, Check, Info } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { haptic } from './celebrate'
import { Sheet } from './sheet'

type ToastVariant = 'success' | 'error' | 'info'
type ToastOpts = { variant?: ToastVariant; action?: { label: string; onClick: () => void }; duration?: number }
type ToastItem = { id: number; msg: string } & ToastOpts
type ConfirmOpts = { title: string; message?: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean }

type Ctx = {
  toast: (msg: string, opts?: ToastOpts) => void
  confirm: (opts: ConfirmOpts) => Promise<boolean>
}
const FeedbackCtx = createContext<Ctx | null>(null)

export function useToast() {
  const c = useContext(FeedbackCtx)
  if (!c) throw new Error('useToast harus dipakai di dalam <FeedbackProvider>')
  return c.toast
}
export function useConfirm() {
  const c = useContext(FeedbackCtx)
  if (!c) throw new Error('useConfirm harus dipakai di dalam <FeedbackProvider>')
  return c.confirm
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const [ask, setAsk] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null)

  const toast = useCallback((msg: string, opts: ToastOpts = {}) => {
    if (timer.current) clearTimeout(timer.current)
    const id = ++seq.current
    setItem({ id, msg, ...opts })
    if (opts.variant === 'error') haptic([10, 40, 10])
    const ms = opts.duration ?? (opts.action ? 5000 : opts.variant === 'error' ? 3800 : 2400)
    timer.current = setTimeout(() => setItem((cur) => (cur?.id === id ? null : cur)), ms)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setAsk({ ...opts, resolve })), [])
  const answer = (v: boolean) => {
    const resolve = ask?.resolve
    setAsk(null)
    // Jawab SETELAH sheet konfirmasi membuang entri riwayatnya (history.back → popstate).
    // Bila dijawab lebih dulu, aksi lanjutan yang bernavigasi (mis. keluar → /masuk) bisa
    // dibatalkan oleh navigasi mundur itu.
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.removeEventListener('popstate', onPop)
      resolve?.(v)
    }
    const onPop = () => setTimeout(finish, 0)
    window.addEventListener('popstate', onPop)
    setTimeout(finish, 450)
  }

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])
  const Icon = item?.variant === 'error' ? AlertCircle : item?.variant === 'info' ? Info : Check

  return (
    <FeedbackCtx.Provider value={value}>
      {children}

      {/* Live region selalu ada agar pembaca layar mengumumkan setiap pesan. */}
      <div
        role={item?.variant === 'error' ? 'alert' : 'status'}
        aria-live={item?.variant === 'error' ? 'assertive' : 'polite'}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom)+var(--kb))] z-[80] flex justify-center px-4"
      >
        {item && (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex max-w-[520px] animate-[toastIn_.3s] items-center gap-2 rounded-full py-2.5 pr-2.5 pl-4 text-sm font-semibold text-white shadow-float',
              item.variant === 'error' ? 'bg-danger-strong' : 'bg-toast',
              !item.action && 'pr-4',
            )}
          >
            <Icon size={17} className="flex-none" aria-hidden />
            <span className="min-w-0">{item.msg}</span>
            {item.action && (
              <button
                type="button"
                className="hit ml-1 rounded-full bg-white/15 px-3 py-1.5 text-[0.8125rem] font-bold whitespace-nowrap text-white active:bg-white/25"
                onClick={() => {
                  item.action?.onClick()
                  setItem(null)
                }}
              >
                {item.action.label}
              </button>
            )}
          </div>
        )}
      </div>

      <Sheet open={!!ask} onClose={() => answer(false)} title={ask?.title ?? ''} role="alertdialog">
        {ask?.message && <div className="mb-1 text-[0.9375rem] leading-relaxed text-ink-2">{ask.message}</div>}
        <div className="mt-4 grid gap-2">
          <Button variant={ask?.danger ? 'dangerSolid' : 'primary'} block onClick={() => answer(true)} autoFocus>
            {ask?.confirmLabel ?? 'Ya, lanjutkan'}
          </Button>
          <Button variant="default" block onClick={() => answer(false)}>
            {ask?.cancelLabel ?? 'Batal'}
          </Button>
        </div>
      </Sheet>
    </FeedbackCtx.Provider>
  )
}
