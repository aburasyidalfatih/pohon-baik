'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { celebrate, haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { Sheet } from '@/components/pb/sheet'
import { Button, Field, FieldGroup, Input, Textarea } from '@/components/ui/primitives'
import { pesanGalat } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { addMoment } from './actions'
import { MOMENT_CATS, type MomentCategory } from './types'

type Errors = { text?: string; date?: string }

/** Sheet "Catat momen": form dengan validasi inline; draf tetap tersimpan bila sheet ditutup. */
export function MomentSheet({
  open,
  onClose,
  childId,
  childName,
  today,
}: {
  open: boolean
  onClose: () => void
  childId: string
  childName: string
  today: string
}) {
  const toast = useToast()
  const formId = useId()
  const [cat, setCat] = useState<MomentCategory>('catatan')
  const [text, setText] = useState('')
  const [date, setDate] = useState(today)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    const next: Errors = {}
    if (!text.trim()) next.text = 'Ceritakan momennya dulu, satu kalimat pun cukup.'
    if (!date) next.date = 'Pilih tanggal momen.'
    else if (date > today) next.date = 'Tanggal tidak boleh melewati hari ini.'
    setErrors(next)
    // Fokus ke kolom salah pertama.
    const bad = next.text ? 'momen-teks' : next.date ? 'momen-tanggal' : null
    if (bad) return document.getElementById(bad)?.focus()

    startTransition(async () => {
      try {
        await addMoment(childId, cat, text, date)
        haptic(10)
        celebrate(15)
        setText('')
        setDate(today)
        setCat('catatan')
        onClose()
        toast('Momen tersimpan', { variant: 'success' })
      } catch (err) {
        toast(pesanGalat(err, 'Gagal menyimpan momen. Coba lagi.'), { variant: 'error' })
      }
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Catat momen · ${childName}`}
      footer={
        <Button type="submit" form={formId} variant="primary" block disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan momen'}
        </Button>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="py-1">
        <FieldGroup label="Kategori">
          <div className="grid grid-cols-3 gap-1.5">
            {MOMENT_CATS.map((c) => {
              const on = cat === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    if (on) return
                    haptic(5)
                    setCat(c.key)
                  }}
                  className={cn(
                    'pressable flex min-h-11 items-center justify-center gap-1 rounded-field px-1 text-[0.8125rem] font-semibold',
                    on ? 'bg-brand-2 text-on-brand shadow-card' : 'bg-surface-2 text-ink-2',
                  )}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </FieldGroup>

        <Field label="Ceritakan" id="momen-teks" error={errors.text}>
          <Textarea
            id="momen-teks"
            rows={4}
            required
            data-autofocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (errors.text) setErrors((p) => ({ ...p, text: undefined }))
            }}
            placeholder={`Hari ini ${childName}…`}
            autoCapitalize="sentences"
            autoComplete="off"
            enterKeyHint="enter"
            aria-invalid={!!errors.text}
            aria-describedby={errors.text ? 'momen-teks-err' : undefined}
          />
        </Field>

        <Field label="Tanggal" id="momen-tanggal" error={errors.date}>
          <Input
            id="momen-tanggal"
            type="date"
            required
            max={today}
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              if (errors.date) setErrors((p) => ({ ...p, date: undefined }))
            }}
            enterKeyHint="done"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'momen-tanggal-err' : undefined}
          />
        </Field>
      </form>
    </Sheet>
  )
}
