'use client'

// Pulau klien kecil untuk kerangka Anakku: konteks sheet "Catat momen", pemilih anak, dan wadah sub-tab.
// Isi tiap panel dirender di server dan diteruskan sebagai `panels`; berganti sub-tab tidak ke server.
import { PenLine } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createContext, startTransition, useContext, useMemo, useOptimistic, useState, type ReactNode } from 'react'
import { ChildSwitcher, kidColor, Segmented } from '@/components/pb/ui'
import { Button } from '@/components/ui/primitives'
import { MomentSheet } from './moment-sheet'
import { ANAK_TABS, toAnakTab, type AnakTab } from './types'

const AnakCtx = createContext<{ openMoment: () => void } | null>(null)

function useAnak() {
  const c = useContext(AnakCtx)
  if (!c) throw new Error('useAnak harus dipakai di dalam <AnakProvider>')
  return c
}

export function AnakProvider({
  childId,
  childName,
  today,
  children,
}: {
  childId: string
  childName: string
  today: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const value = useMemo(() => ({ openMoment: () => setOpen(true) }), [])
  return (
    <AnakCtx.Provider value={value}>
      {children}
      <MomentSheet open={open} onClose={() => setOpen(false)} childId={childId} childName={childName} today={today} />
    </AnakCtx.Provider>
  )
}

/** Avatar inisial anak dengan warna yang sama di semua layar (`kidColor`). */
export function KidAvatar({ index, name }: { index: number; name: string }) {
  return (
    <div
      aria-hidden
      className="grid size-14 flex-none place-items-center rounded-tile text-2xl font-bold text-white shadow-sm"
      style={{ background: kidColor(index) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

/** Tombol ikon di kartu identitas anak. */
export function CatatMomenButton() {
  const { openMoment } = useAnak()
  return (
    <Button variant="soft" size="icon" onClick={openMoment} aria-label="Catat momen">
      <PenLine size={18} aria-hidden />
    </Button>
  )
}

/** Kartu ajakan di sub-tab Momen. */
export function CatatMomenCard({ childName }: { childName: string }) {
  const { openMoment } = useAnak()
  return (
    <button
      type="button"
      onClick={openMoment}
      className="pressable flex w-full items-center gap-3.5 rounded-card bg-surface p-4 text-left shadow-card"
    >
      <span className="grid size-11 flex-none place-items-center rounded-tile bg-brand-soft text-brand" aria-hidden>
        <PenLine size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] text-ink">Catat momen {childName}</b>
        <span className="text-[0.8125rem] text-ink-2">
          Kata pertama, kelucuan, doa, atau capaian baru. Kelak jadi harta keluarga.
        </span>
      </span>
    </button>
  )
}

/** Ganti anak: `router.replace` (tidak mengotori tombol Back), pil langsung berpindah. */
export function AnakChildPicker({ kids, value }: { kids: { id: string; name: string }[]; value: string }) {
  const router = useRouter()
  const [shown, setShown] = useOptimistic(value)
  return (
    <ChildSwitcher
      kids={kids}
      value={shown}
      onChange={(id) =>
        startTransition(() => {
          setShown(id)
          const p = new URLSearchParams(window.location.search)
          p.set('cid', id)
          router.replace(`/anak?${p.toString()}`, { scroll: false })
        })
      }
    />
  )
}

/**
 * Wadah sub-tab Kenali/Momen/Rapor/Modul. Keempat panel sudah dirender sekali; mengganti tab hanya
 * menampilkan panel lain dan memperbarui `?tab=` lewat `history.replaceState` (tanpa round-trip server).
 * Tautan `/anak?tab=momen` (mis. pintasan aplikasi) tetap membuka tab yang benar lewat `useSearchParams`.
 */
export function AnakTabs({ panels }: { panels: Record<AnakTab, ReactNode> }) {
  const urlTab = toAnakTab(useSearchParams().get('tab'))
  const [tab, setTab] = useState<AnakTab>(urlTab)
  const [lastUrlTab, setLastUrlTab] = useState<AnakTab>(urlTab)
  if (urlTab !== lastUrlTab) {
    // URL berubah dari luar (tautan/pintasan): ikuti.
    setLastUrlTab(urlTab)
    setTab(urlTab)
  }

  const change = (t: AnakTab) => {
    setTab(t)
    const p = new URLSearchParams(window.location.search)
    p.set('tab', t)
    window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`)
  }

  return (
    <>
      <Segmented options={ANAK_TABS} value={tab} onChange={change} label="Bagian Anakku" className="my-3" />
      {ANAK_TABS.map((t) => (
        <div
          key={t.value}
          role="tabpanel"
          aria-label={t.label}
          hidden={tab !== t.value}
          className="animate-[fadeIn_.2s] space-y-3.5"
        >
          {panels[t.value]}
        </div>
      ))}
    </>
  )
}
