'use client'

import { startTransition, useOptimistic, useState } from 'react'
import { celebrate, haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { pesanGalat } from '@/lib/errors'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toggleMilestone } from './actions'
import type { MilestoneGroup } from './types'

type Change = { key: string; on: boolean; today: string }

/** Daftar tonggak kemampuan + kemajuan. Centang optimistis; rollback otomatis + toast bila gagal. */
export function MilestoneChecklist({
  childId,
  today,
  groups,
  done,
}: {
  childId: string
  today: string
  groups: MilestoneGroup[]
  done: Record<string, string>
}) {
  const toast = useToast()
  const [miles, apply] = useOptimistic(done, (state, c: Change) => {
    const next = { ...state }
    if (c.on) next[c.key] = c.today
    else delete next[c.key]
    return next
  })
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const seen = groups.reduce((n, g) => n + g.items.filter((it) => miles[it.key]).length, 0)
  const pct = total ? Math.round((seen / total) * 100) : 0

  const toggle = (key: string, text: string) => {
    if (pending.has(key)) return
    const on = !miles[key]
    if (on) {
      haptic([10, 45, 10])
      celebrate(12)
    } else haptic(5)
    setPending((s) => new Set(s).add(key))
    startTransition(async () => {
      apply({ key, on, today })
      try {
        await toggleMilestone(childId, key, text, on)
        toast(on ? 'Tonggak dicentang dan tercatat di momen' : 'Centang tonggak dicabut', { variant: 'success' })
      } catch (e) {
        toast(pesanGalat(e, 'Gagal memperbarui tonggak kemampuan.'), { variant: 'error' })
      } finally {
        setPending((s) => {
          const n = new Set(s)
          n.delete(key)
          return n
        })
      }
    })
  }

  return (
    <>
      <div className="mb-1">
        <div className="flex justify-between text-[0.8125rem] text-ink-2">
          <span>
            <b className="text-ink">
              {seen} dari {total}
            </b>{' '}
            sudah tampak
          </span>
          <span aria-hidden>{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Kemajuan tonggak kemampuan"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={seen}
          className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-fill"
        >
          <div className="h-full rounded-full bg-brand-2 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="mt-4">
          <h4 className="mx-1 mb-2 text-[0.75rem] font-bold tracking-wider text-ink-2 uppercase">{g.label}</h4>
          <div className="space-y-1.5">
            {g.items.map((it) => {
              const isSeen = !!miles[it.key]
              const busy = pending.has(it.key)
              return (
                <button
                  key={it.key}
                  type="button"
                  aria-pressed={isSeen}
                  aria-busy={busy || undefined}
                  onClick={() => toggle(it.key, it.text)}
                  className={cn(
                    'pressable flex min-h-11 w-full items-center gap-3 rounded-tile px-3 py-2.5 text-left text-[0.875rem]',
                    isSeen ? 'bg-brand-soft text-brand-ink ring-1 ring-brand-2' : 'bg-surface-2 text-ink',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{it.text}</span>
                    {isSeen && (
                      <small className="mt-0.5 block text-[0.75rem] text-brand-2">
                        Tampak sejak {fmtDate(miles[it.key])}
                      </small>
                    )}
                  </span>
                  <span className="chk" data-on={isSeen} aria-hidden />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
