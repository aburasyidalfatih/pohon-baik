'use client'

import { startTransition, useMemo, useOptimistic, useRef, useState } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { Input, SectionLabel } from '@/components/ui/primitives'
import { pesanGalat } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { saveRaporLevel, saveRaporNote } from './actions'
import { LAPIS, type Branch, type RaporMap } from './types'

const LEVELS = [
  { value: 1, emoji: '🌱', label: 'Mulai' },
  { value: 2, emoji: '🌿', label: 'Berkembang' },
  { value: 3, emoji: '🌳', label: 'Mantap' },
] as const

type NoteStatus = 'saving' | 'saved' | 'error'

/**
 * Rapor Pohon per semester. Level: optimistis + rollback + toast galat, pending per bidang.
 * Catatan: disimpan saat kolom ditinggalkan, dengan indikator "Menyimpan…"/"Tersimpan ✓" di samping kolom.
 */
export function RaporPanel({
  childId,
  semester,
  branchesByLapis,
  rapor,
}: {
  childId: string
  semester: string
  branchesByLapis: Record<string, Branch[]>
  rapor: RaporMap
}) {
  const toast = useToast()
  const serverLevels = useMemo(
    () => Object.fromEntries(Object.entries(rapor).map(([k, v]) => [k, v.level])) as Record<string, number>,
    [rapor],
  )
  const [levels, applyLevel] = useOptimistic(serverLevels, (s, c: { branch: string; level: number }) => ({
    ...s,
    [c.branch]: c.level,
  }))
  const [pendingLevel, setPendingLevel] = useState<ReadonlySet<string>>(() => new Set())

  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(rapor).map(([k, v]) => [k, v.note])),
  )
  const savedNotes = useRef<Record<string, string>>(
    Object.fromEntries(Object.entries(rapor).map(([k, v]) => [k, (v.note ?? '').trim()])),
  )
  const noteSeq = useRef<Record<string, number>>({})
  const [noteStatus, setNoteStatus] = useState<Record<string, NoteStatus | undefined>>({})

  const allBranches = Object.values(branchesByLapis).flat()
  const filled = allBranches.filter((b) => (levels[b.code] ?? 0) > 0).length

  const pickLevel = (branch: string, lvl: number) => {
    if (pendingLevel.has(branch)) return
    const level = (levels[branch] ?? 0) === lvl ? 0 : lvl
    haptic(8)
    setPendingLevel((s) => new Set(s).add(branch))
    startTransition(async () => {
      applyLevel({ branch, level })
      try {
        await saveRaporLevel(childId, semester, branch, level)
      } catch (e) {
        toast(pesanGalat(e, 'Gagal menyimpan rapor. Coba lagi.'), { variant: 'error' })
      } finally {
        setPendingLevel((s) => {
          const n = new Set(s)
          n.delete(branch)
          return n
        })
      }
    })
  }

  const saveNote = (branch: string) => {
    const v = (notes[branch] ?? '').trim()
    if (v === (savedNotes.current[branch] ?? '')) return
    const seq = (noteSeq.current[branch] ?? 0) + 1
    noteSeq.current[branch] = seq
    setNoteStatus((s) => ({ ...s, [branch]: 'saving' }))
    saveRaporNote(childId, semester, branch, v).then(
      () => {
        savedNotes.current[branch] = v
        if (noteSeq.current[branch] === seq) setNoteStatus((s) => ({ ...s, [branch]: 'saved' }))
      },
      (e) => {
        if (noteSeq.current[branch] !== seq) return
        setNoteStatus((s) => ({ ...s, [branch]: 'error' }))
        toast(pesanGalat(e, 'Gagal menyimpan catatan. Coba lagi.'), { variant: 'error' })
      },
    )
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-card bg-surface p-4 shadow-card">
        <div>
          <small className="block text-[0.8125rem] font-medium text-ink-2">Semester</small>
          <b className="text-base text-ink">{semester}</b>
        </div>
        <div className="text-right">
          <small className="block text-[0.8125rem] font-medium text-ink-2">Terisi</small>
          <b className="text-base text-brand-2">
            {filled} dari {allBranches.length} bidang
          </b>
        </div>
      </div>

      <p className="px-1 text-[0.8125rem] text-ink-2">Rapor Pohon diisi dari pengamatan sehari-hari, bukan ujian formal.</p>

      {LAPIS.map((lapis) => {
        const list = branchesByLapis[lapis] ?? []
        if (list.length === 0) return null
        return (
          <section key={lapis}>
            <SectionLabel>{lapis}</SectionLabel>
            <div className="divide-y divide-line rounded-card bg-surface px-4 shadow-card">
              {list.map((branch) => {
                const current = levels[branch.code] ?? 0
                const busy = pendingLevel.has(branch.code)
                const status = noteStatus[branch.code]
                const noteId = `rapor-${branch.code}-catatan`
                return (
                  <div key={branch.code} className="py-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-[0.9375rem] font-semibold text-ink">{branch.name}</h3>
                      <span className="text-[0.75rem] text-ink-3">{branch.code}</span>
                    </div>
                    <div role="group" aria-label={`Tingkat ${branch.name}`} aria-busy={busy || undefined} className="grid grid-cols-3 gap-1.5">
                      {LEVELS.map((l) => {
                        const on = current === l.value
                        return (
                          <button
                            key={l.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pickLevel(branch.code, l.value)}
                            className={cn(
                              'pressable flex min-h-11 items-center justify-center gap-1 rounded-field px-1 text-[0.8125rem] font-semibold',
                              on ? 'bg-brand-2 text-on-brand shadow-card' : 'bg-surface-2 text-ink-2',
                            )}
                          >
                            <span aria-hidden>{l.emoji}</span>
                            {l.label}
                          </button>
                        )
                      })}
                    </div>
                    <div className="relative mt-2">
                      <Input
                        id={noteId}
                        type="text"
                        value={notes[branch.code] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setNotes((s) => ({ ...s, [branch.code]: v }))
                          if (noteStatus[branch.code]) setNoteStatus((s) => ({ ...s, [branch.code]: undefined }))
                        }}
                        onBlur={() => saveNote(branch.code)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                        }}
                        placeholder="Catatan perkembangan (opsional)"
                        aria-label={`Catatan ${branch.name}`}
                        aria-describedby={`${noteId}-status`}
                        aria-invalid={status === 'error' || undefined}
                        autoCapitalize="sentences"
                        autoComplete="off"
                        enterKeyHint="done"
                        className={cn(status && 'pr-28')}
                      />
                      <span
                        id={`${noteId}-status`}
                        aria-live="polite"
                        className={cn(
                          'pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[0.75rem] font-semibold',
                          status === 'error' ? 'text-danger' : status === 'saved' ? 'text-brand-2' : 'text-ink-3',
                        )}
                      >
                        {status === 'saving' ? 'Menyimpan…' : status === 'saved' ? 'Tersimpan ✓' : status === 'error' ? 'Gagal disimpan' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
