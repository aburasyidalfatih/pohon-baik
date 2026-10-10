'use client'

import { Camera, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react'
import { celebrate, haptic } from '@/components/pb/celebrate'
import { useToast } from '@/components/pb/feedback'
import { Sheet } from '@/components/pb/sheet'
import { Button, Field, FieldGroup, Input, Textarea } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { saveMoment } from './actions'
import { MOMENT_CATS, type MomentCategory, type MomentPreset } from './types'

type Errors = { text?: string; date?: string }
/** Kategori yang paling cocok diberi pujian proses (usaha, strategi, kesabaran). */
const EFFORT_CATS: MomentCategory[] = ['bisa', 'ibadah']
const MAX_SIDE = 1600

/**
 * Perkecil foto di browser sebelum diunggah: hemat kuota, cepat di sinyal lemah, dan menggambar ulang
 * ke kanvas membuang metadata EXIF (termasuk lokasi GPS). Server tetap memproses ulang sebagai lapis kedua.
 */
async function compressPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('gagal'))), 'image/jpeg', 0.82))
}

/**
 * Lembar momen: catat baru, tandai target capaian tercapai, atau lengkapi momen lama (cerita, usaha, foto).
 * Draf "catat baru" tetap tersimpan bila lembar ditutup.
 */
export function MomentSheet({
  open,
  onClose,
  childId,
  childName,
  today,
  preset,
}: {
  open: boolean
  onClose: () => void
  childId: string
  childName: string
  today: string
  preset: MomentPreset
}) {
  const toast = useToast()
  const formId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const edit = preset.mode === 'edit' ? preset.moment : null
  const target = preset.mode === 'target' ? preset : null
  // Momen dari tonggak/target tetap berkategori "Bisa baru".
  const fixedCat = !!target || edit?.source === 'milestone' || edit?.source === 'target'

  const [cat, setCat] = useState<MomentCategory>(edit?.category ?? (target ? 'bisa' : 'catatan'))
  const [text, setText] = useState(edit?.text ?? (target ? `Tercapai: ${target.text}` : ''))
  const [effort, setEffort] = useState(edit?.effort ?? '')
  const [date, setDate] = useState(edit?.date ?? today)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(edit?.photo?.thumb ?? null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, startTransition] = useTransition()

  // Lepas URL pratinjau lokal saat diganti atau lembar ditutup.
  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  const showEffort = !!target || EFFORT_CATS.includes(cat)
  const title = target ? `Tercapai! · ${childName}` : edit ? `Lengkapi momen · ${childName}` : `Catat momen · ${childName}`

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    try {
      const blob = await compressPhoto(file)
      setPhoto(blob)
      setPreview(URL.createObjectURL(blob))
      setRemovePhoto(false)
      haptic(5)
    } catch {
      toast('Foto ini belum bisa dibaca. Pilih foto JPG atau PNG.', { variant: 'error' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function clearPhoto() {
    setPhoto(null)
    setPreview(null)
    setRemovePhoto(!!edit?.photo)
    haptic(5)
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    const next: Errors = {}
    if (!text.trim()) next.text = 'Ceritakan momennya dulu, satu kalimat pun cukup.'
    if (!date) next.date = 'Pilih tanggal momen.'
    else if (date > today) next.date = 'Tanggal tidak boleh melewati hari ini.'
    setErrors(next)
    const bad = next.text ? 'momen-teks' : next.date ? 'momen-tanggal' : null
    if (bad) return document.getElementById(bad)?.focus()

    const fd = new FormData()
    fd.set('childId', childId)
    if (edit) fd.set('id', edit.id)
    if (target) fd.set('targetKey', target.key)
    fd.set('category', cat)
    fd.set('text', text)
    fd.set('effort', showEffort ? effort : '')
    fd.set('date', date)
    if (photo) fd.set('photo', new File([photo], 'momen.jpg', { type: 'image/jpeg' }))
    if (removePhoto) fd.set('removePhoto', '1')

    startTransition(async () => {
      const r = await saveMoment(fd).catch(() => ({ error: 'Koneksi terputus. Coba lagi sebentar lagi.' }))
      if (r.error) return toast(r.error, { variant: 'error' })
      haptic(target ? [12, 60, 12] : 10)
      celebrate(target ? 30 : 15)
      if (preset.mode === 'new') {
        setText('')
        setEffort('')
        setDate(today)
        setCat('catatan')
        setPhoto(null)
        setPreview(null)
      }
      onClose()
      toast(target ? `MasyaAllah! Target ${childName} tercatat di momen` : edit ? 'Momen diperbarui' : 'Momen tersimpan', { variant: 'success' })
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button type="submit" form={formId} variant="primary" block disabled={pending} aria-busy={pending}>
          {pending ? 'Menyimpan…' : target ? 'Simpan momen membanggakan' : 'Simpan momen'}
        </Button>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="py-1">
        {target && (
          <p className="mb-2 rounded-tile bg-brand-soft px-3.5 py-3 text-[0.9375rem] text-brand-ink">
            <b>Target capaian:</b> {target.text}
          </p>
        )}

        {!fixedCat && (
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
        )}

        <Field label="Ceritakan" id="momen-teks" error={errors.text}>
          <Textarea
            id="momen-teks"
            rows={3}
            required
            data-autofocus={!target || undefined}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (errors.text) setErrors((p) => ({ ...p, text: undefined }))
            }}
            placeholder={`Hari ini ${childName}…`}
            autoCapitalize="sentences"
            autoComplete="off"
            aria-invalid={!!errors.text}
            aria-describedby={errors.text ? 'momen-teks-err' : undefined}
          />
        </Field>

        {showEffort && (
          <>
            <Field label="Apa usahanya?" id="momen-usaha" hint="Puji prosesnya, bukan pintarnya: kesabaran, cara, atau usaha mencoba lagi.">
              <Textarea
                id="momen-usaha"
                rows={2}
                data-autofocus={target ? true : undefined}
                value={effort}
                maxLength={1000}
                onChange={(e) => setEffort(e.target.value)}
                placeholder="Misalnya: terus mencoba walau jatuh berkali-kali"
                autoCapitalize="sentences"
                aria-describedby="momen-usaha-hint"
              />
            </Field>
            {effort.trim() && (
              <p className="-mt-1 mb-2 rounded-tile bg-gold-soft px-3.5 py-2.5 text-[0.875rem] text-gold-ink">
                Sampaikan ke {childName}: <i>&ldquo;MasyaAllah, Ayah/Bunda lihat kamu {effort.trim().replace(/[.!]+$/, '')}. Itu usaha yang bagus.&rdquo;</i>
              </p>
            )}
          </>
        )}

        <FieldGroup label="Foto (opsional, hanya terlihat keluarga Anda)">
          {preview ? (
            <div className="relative w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element -- berkas privat lewat endpoint ber-cookie */}
              <img src={preview} alt="Pratinjau foto momen" className="max-h-48 rounded-tile object-cover" />
              <button type="button" onClick={clearPhoto} aria-label="Hapus foto" className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-black/60 text-white">
                <X size={18} aria-hidden />
              </button>
            </div>
          ) : (
            <Button variant="soft" size="sm" onClick={() => fileRef.current?.click()}>
              <Camera size={16} aria-hidden /> Tambah foto
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </FieldGroup>

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
