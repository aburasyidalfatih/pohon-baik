'use client'

// Bottom sheet & overlay layar penuh dengan perilaku native:
// - tombol/gestur Back Android menutup overlay (lewat history), bukan meninggalkan halaman
// - latar belakang `inert`, fokus berpindah ke overlay, Tab terkunci di dalamnya, fokus dikembalikan saat tutup
// - Escape menutup overlay paling atas; scroll halaman dikunci
// - sheet: geser ke bawah pada pegangan/judul untuk menutup, animasi keluar, naik di atas keyboard (--kb)
import { X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { haptic } from './celebrate'

const stack: string[] = []
const noopSubscribe = () => () => {}
/** false saat render server & hidrasi pertama, true setelahnya (portal hanya ada di klien). */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false)
const APP_ROOT_ID = 'pb-app'
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),summary'

// Entri history milik overlay yang sudah tertutup (mis. dua sheet tertutup bersamaan) dilewati otomatis.
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const o = history.state?.pbOverlay
    if (o && !stack.includes(o)) history.back()
  })
}

function setBackgroundLocked(locked: boolean) {
  const root = document.getElementById(APP_ROOT_ID)
  if (locked) {
    root?.setAttribute('inert', '')
    document.documentElement.style.overflow = 'hidden'
  } else {
    root?.removeAttribute('inert')
    document.documentElement.style.overflow = ''
  }
}

/**
 * Perilaku modal bersama untuk Sheet dan overlay layar penuh (mis. Majelis Malam).
 * `active` = overlay sedang terbuka (termasuk saat animasi masuk); `onClose` dipanggil
 * saat Back/Escape/ketuk latar. Mengembalikan `requestClose` untuk tombol tutup di UI.
 */
export function useOverlay(active: boolean, onClose: () => void, panelRef: RefObject<HTMLElement | null>) {
  const id = useId()
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose })
  const viaHistory = useRef(false)

  useEffect(() => {
    if (!active) return
    const opener = document.activeElement as HTMLElement | null
    stack.push(id)
    setBackgroundLocked(true)

    // Fokus: elemen [autofocus] di dalam panel, atau panel itu sendiri.
    const panel = panelRef.current
    requestAnimationFrame(() => {
      const auto = panel?.querySelector<HTMLElement>('[autofocus],[data-autofocus]')
      ;(auto ?? panel)?.focus({ preventScroll: true })
    })

    // Back Android: satu entri history per overlay (salin state Next.js agar navigasinya tetap utuh).
    if (history.state?.pbOverlay !== id) history.pushState({ ...(history.state ?? {}), pbOverlay: id }, '')
    viaHistory.current = false
    const onPop = () => {
      if (stack[stack.length - 1] !== id) return
      viaHistory.current = true
      closeRef.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      } else if (e.key === 'Tab' && panel) {
        const els = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null)
        if (!els.length) return e.preventDefault()
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('popstate', onPop)
    document.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('popstate', onPop)
      document.removeEventListener('keydown', onKey)
      const i = stack.lastIndexOf(id)
      if (i >= 0) stack.splice(i, 1)
      if (!stack.length) setBackgroundLocked(false)
      // Ditutup dari UI (bukan tombol Back): buang entri history milik overlay ini.
      // Ditunda satu tick agar efek ganda StrictMode (cleanup lalu pasang ulang) tidak ikut mundur.
      const fromHistory = viaHistory.current
      setTimeout(() => {
        if (stack.includes(id)) return
        if (!fromHistory && history.state?.pbOverlay === id) history.back()
        opener?.focus?.({ preventScroll: true })
      }, 0)
    }
    // requestClose stabil lewat closeRef; panelRef stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id])

  function requestClose() {
    closeRef.current()
  }
  return requestClose
}

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Area aksi yang menempel di bawah (mis. tombol Simpan), tetap terlihat saat isi digulir. */
  footer?: ReactNode
  role?: 'dialog' | 'alertdialog'
  className?: string
}

/** Bottom sheet ala iOS/Material 3. */
export function Sheet({ open, onClose, title, children, footer, role = 'dialog', className }: SheetProps) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ y: number; t: number } | null>(null)
  const hydrated = useHydrated()

  // Buka/tutup dengan animasi keluar: tetap terpasang sampai animasi selesai.
  if (open && (!mounted || closing)) {
    setMounted(true)
    setClosing(false)
  } else if (!open && mounted && !closing) {
    setClosing(true)
  }
  useEffect(() => {
    if (!closing) return
    const t = setTimeout(() => {
      setMounted(false)
      setClosing(false)
      setDrag(0)
    }, 220)
    return () => clearTimeout(t)
  }, [closing])

  useOverlay(hydrated && mounted && !closing, onClose, panelRef)

  // Sheet yang sudah terbuka sejak awal (mis. ?selamat=1) baru dipasang setelah hidrasi: HTML server = null.
  if (!mounted || !hydrated) return null

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    dragStart.current = { y: e.clientY, t: performance.now() }
    setDragging(true)
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // pointer sintetis/tidak aktif: gestur tetap jalan tanpa capture
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    setDrag(Math.max(0, e.clientY - dragStart.current.y))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return
    const dy = Math.max(0, e.clientY - dragStart.current.y)
    const v = dy / Math.max(1, performance.now() - dragStart.current.t)
    dragStart.current = null
    setDragging(false)
    const h = panelRef.current?.offsetHeight ?? 400
    if (dy > Math.min(140, h * 0.3) || (v > 0.5 && dy > 24)) {
      haptic(5)
      onClose()
    } else setDrag(0)
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 z-[60] flex items-end justify-center bg-black/35', closing ? 'animate-[fadeOut_.22s_ease-in_forwards]' : 'animate-[fadeIn_.2s]')}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          bottom: 'var(--kb)',
          maxHeight: 'calc(100dvh - var(--kb) - env(safe-area-inset-top) - 12px)',
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? 'none' : 'transform .25s cubic-bezier(.2,.9,.25,1)',
        }}
        className={cn(
          'relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-sheet bg-bg shadow-float outline-none',
          closing ? 'animate-[sheetDown_.22s_ease-in_forwards]' : 'animate-[sheetUp_.32s_cubic-bezier(.2,.9,.25,1)]',
          className,
        )}
      >
        {/* Pegangan + judul: area geser untuk menutup */}
        <div className="flex-none touch-none px-[18px] pt-2" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragStart.current = null; setDragging(false); setDrag(0) }}>
          <div className="mx-auto mt-1 mb-2.5 h-[5px] w-[38px] rounded-full bg-ink-4/60" aria-hidden />
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h2 id={titleId} className="m-0 min-w-0 text-xl font-bold">{title}</h2>
            <button
              type="button"
              onClick={() => {
                haptic(5)
                onClose()
              }}
              aria-label="Tutup"
              className="hit grid size-10 flex-none place-items-center rounded-full bg-fill text-ink transition active:scale-95"
            >
              <X size={19} />
            </button>
          </div>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-[18px]', footer ? 'pb-3' : 'pb-[calc(20px+env(safe-area-inset-bottom))]')}>{children}</div>
        {footer && <div className="flex-none border-t border-line bg-bg px-[18px] pt-3 pb-[calc(14px+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
