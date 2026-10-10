'use client'

import { startTransition, useOptimistic } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { useConfirm, useToast } from '@/components/pb/feedback'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toggleMilestone } from './actions'
import { useAnak } from './anak-client'
import type { TargetItem } from './types'

/**
 * Target capaian kelompok usia sebagai daftar yang bisa ditandai. Menandai tercapai membuka lembar
 * "Tercapai!" (cerita, usahanya, foto) sehingga setiap target menjadi momen membanggakan dengan bukti.
 */
export function TargetChecklist({ childId, childName, targets, done }: { childId: string; childName: string; targets: TargetItem[]; done: Record<string, string> }) {
  const { openMoment } = useAnak()
  const confirm = useConfirm()
  const toast = useToast()
  const [reached, unset] = useOptimistic(done, (state, key: string) => {
    const next = { ...state }
    delete next[key]
    return next
  })

  const n = targets.filter((t) => reached[t.key]).length
  const pct = targets.length ? Math.round((n / targets.length) * 100) : 0

  async function tap(t: TargetItem) {
    if (!reached[t.key]) {
      haptic(8)
      return openMoment({ mode: 'target', key: t.key, text: t.text })
    }
    const ok = await confirm({
      title: 'Batalkan tanda tercapai?',
      message: 'Momen dari target ini (termasuk fotonya) ikut terhapus.',
      confirmLabel: 'Batalkan tanda',
      danger: true,
    })
    if (!ok) return
    startTransition(async () => {
      unset(t.key)
      try {
        await toggleMilestone(childId, t.key, t.text, false)
      } catch {
        toast('Gagal membatalkan. Coba lagi.', { variant: 'error' })
      }
    })
  }

  return (
    <>
      <p className="-mt-1 mb-2 text-[0.8125rem] text-ink-2">
        Yang diharapkan dari {childName} di kelompok usia ini. Tandai saat tercapai, ceritakan usahanya, dan simpan fotonya.
      </p>
      <div className="mb-1">
        <div className="flex justify-between text-[0.8125rem] text-ink-2">
          <span><b className="text-ink">{n} dari {targets.length}</b> tercapai</span>
          <span aria-hidden>{pct}%</span>
        </div>
        <div role="progressbar" aria-label="Kemajuan target capaian" aria-valuemin={0} aria-valuemax={targets.length} aria-valuenow={n} className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-fill">
          <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {targets.map((t) => {
          const on = !!reached[t.key]
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => tap(t)}
              className={cn(
                'pressable flex min-h-11 w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left text-[0.875rem]',
                on ? 'bg-gold-soft text-gold-ink ring-1 ring-gold' : 'bg-surface-2 text-ink',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t.text}</span>
                {on && <small className="mt-0.5 block text-[0.75rem]">Tercapai {fmtDate(reached[t.key])}</small>}
              </span>
              <span className="chk" data-on={on} aria-hidden />
            </button>
          )
        })}
      </div>
    </>
  )
}
