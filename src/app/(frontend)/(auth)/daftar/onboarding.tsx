'use client'

import Link from 'next/link'
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react'
import { Sheet } from '@/components/pb/sheet'
import { Button, Field, Input, Select } from '@/components/ui/primitives'
import { CITIES } from '@/lib/curriculum/constants'
import { cn } from '@/lib/utils'
import { PrivacyContent } from '../../privasi/content'
import { signUp, type AuthState } from '../actions'
import { emailInputProps, Notice, PasswordField } from '../forms'

type Step = 1 | 2 | 3
type Values = { name: string; email: string; password: string; family: string; city: string; childName: string; childDob: string; consent: boolean }
type Errors = Partial<Record<keyof Values, string>>

const STEPS = ['Akun', 'Keluarga', 'Anak'] as const
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

function validate(step: Step, v: Values, today: string): Errors {
  const e: Errors = {}
  if (step === 1) {
    if (!v.name.trim()) e.name = 'Tulis nama Anda'
    if (!EMAIL.test(v.email.trim())) e.email = v.email.trim() ? 'Email belum benar, mis. nama@contoh.com' : 'Tulis email Anda'
    if (v.password.trim().length < 8) e.password = 'Kata sandi minimal 8 karakter'
  } else if (step === 2) {
    if (!v.family.trim()) e.family = 'Tulis nama keluarga'
    if (!CITIES[v.city]) e.city = 'Pilih kota'
  } else {
    if (v.childDob && !v.childName.trim()) e.childName = 'Tulis nama panggilan, atau kosongkan tanggal lahir'
    if (v.childName.trim() && !v.childDob) e.childDob = 'Isi tanggal lahir anak'
    else if (v.childDob && !isIsoDate(v.childDob)) e.childDob = 'Tanggal lahir tidak valid'
    else if (v.childDob > today) e.childDob = 'Tanggal lahir tidak boleh di masa depan'
    if (!v.consent) e.consent = 'Centang persetujuan untuk melanjutkan'
  }
  return e
}

// Urutan kolom per langkah, untuk memfokuskan kolom salah yang pertama.
const ORDER: (keyof Values)[] = ['name', 'email', 'password', 'family', 'city', 'childName', 'childDob', 'consent']
const inputId = (k: keyof Values) => `su-${k}`

/** Pendaftaran 3 langkah dalam satu form; dikirim sekali ke server action `signUp` di akhir. */
export function SignUpWizard({ today }: { today: string }) {
  const [state, action, pending] = useActionState(signUp, undefined)
  const [step, setStep] = useState<Step>(1)
  const [v, setV] = useState<Values>({ name: '', email: '', password: '', family: '', city: 'jakarta', childName: '', childDob: '', consent: false })
  const [errs, setErrs] = useState<Errors>({})
  const [skipChild, setSkipChild] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const focusNext = useRef<string | null>(null)

  // Galat dari server: buka langkah yang relevan dan tandai kolomnya.
  const [seen, setSeen] = useState<AuthState>(state)
  if (state !== seen) {
    setSeen(state)
    if (state?.step) setStep(state.step)
    if (state?.field && state.error) setErrs({ [state.field]: state.error })
  }
  useEffect(() => {
    const f = state?.field
    if (f) requestAnimationFrame(() => document.getElementById(inputId(f as keyof Values))?.focus())
  }, [state])

  useEffect(() => {
    if (!focusNext.current) return
    const id = focusNext.current
    focusNext.current = null
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }, [step, errs])

  const set = <K extends keyof Values>(k: K, val: Values[K]) => {
    setV((x) => ({ ...x, [k]: val }))
    if (errs[k]) setErrs((x) => ({ ...x, [k]: undefined }))
  }

  function goTo(next: Step) {
    if (next === 2 && !v.family.trim() && v.name.trim()) setV((x) => ({ ...x, family: `Keluarga ${x.name.trim().split(/\s+/)[0]}` }))
    setStep(next)
    setErrs({})
    focusNext.current = `su-step-${next}`
    window.scrollTo({ top: 0 })
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    // Enter di langkah 1–2 = Lanjut. Di langkah 3, periksa semua langkah sebelum mengirim.
    const checkSteps: Step[] = step < 3 ? [step] : [1, 2, 3]
    for (const s of checkSteps) {
      const found = validate(s, v, today)
      const first = ORDER.find((k) => found[k])
      if (first) {
        setStep(s)
        setErrs(found)
        focusNext.current = inputId(first)
        return
      }
    }
    if (step < 3) return goTo((step + 1) as Step)
    const fd = new FormData(e.currentTarget)
    startTransition(() => action(fd))
  }

  const err = (k: keyof Values) => errs[k]
  const a11y = (k: keyof Values) => ({ id: inputId(k), 'aria-invalid': errs[k] ? true : undefined, 'aria-describedby': errs[k] ? `${inputId(k)}-err` : undefined })
  const generalError = state?.error && !state.field ? state.error : undefined

  return (
    <>
      <ol aria-label="Langkah pendaftaran" className="mb-4 flex gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step
          return (
            <li key={label} aria-current={n === step ? 'step' : undefined} className="flex-1">
              <span aria-hidden className={cn('block h-1.5 rounded-full transition-colors', n <= step ? 'bg-brand-2' : 'bg-fill')} />
              <span className={cn('mt-1.5 block text-xs font-semibold', n === step ? 'text-ink' : 'text-ink-3')}>
                {n}. {label}
              </span>
            </li>
          )
        })}
      </ol>

      <form noValidate onSubmit={onSubmit}>
        {generalError && <Notice>{generalError}</Notice>}

        {/* Langkah 1: akun */}
        <section hidden={step !== 1} aria-labelledby="su-step-1">
          <h2 id="su-step-1" tabIndex={-1} className="text-[1.25rem] font-bold outline-none">
            Akun orang tua <span className="text-[0.875rem] font-medium text-ink-3">· langkah 1 dari 3</span>
          </h2>
          <Field label="Nama Anda" id={inputId('name')} error={err('name')}>
            <Input {...a11y('name')} name="name" autoComplete="name" autoCapitalize="words" enterKeyHint="next" required value={v.name} onChange={(e) => set('name', e.target.value)} placeholder="Andriko" />
          </Field>
          <Field label="Email" id={inputId('email')} error={err('email')}>
            <Input {...a11y('email')} name="email" {...emailInputProps} autoComplete="email" enterKeyHint="next" required value={v.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@contoh.com" />
          </Field>
          <PasswordField
            id={inputId('password')}
            name="password"
            label="Kata sandi"
            hint="Minimal 8 karakter"
            autoComplete="new-password"
            enterKeyHint="next"
            minLength={8}
            required
            value={v.password}
            onChange={(e) => set('password', e.target.value)}
            error={err('password')}
          />
        </section>

        {/* Langkah 2: keluarga */}
        <section hidden={step !== 2} aria-labelledby="su-step-2">
          <h2 id="su-step-2" tabIndex={-1} className="text-[1.25rem] font-bold outline-none">
            Keluarga <span className="text-[0.875rem] font-medium text-ink-3">· langkah 2 dari 3</span>
          </h2>
          <Field label="Nama keluarga" id={inputId('family')} error={err('family')}>
            <Input {...a11y('family')} name="family" autoComplete="off" autoCapitalize="words" enterKeyHint="next" required value={v.family} onChange={(e) => set('family', e.target.value)} placeholder="Keluarga Andriko" />
          </Field>
          <Field label="Kota (untuk jadwal shalat)" id={inputId('city')} error={err('city')}>
            <Select {...a11y('city')} name="city" value={v.city} onChange={(e) => set('city', e.target.value)}>
              {Object.entries(CITIES).map(([k, c]) => (
                <option key={k} value={k}>
                  {c[0]}
                </option>
              ))}
            </Select>
          </Field>
          <p className="ml-1 text-[0.8125rem] text-ink-3">Kota lain atau lokasi persis bisa diatur nanti di menu Keluarga.</p>
        </section>

        {/* Langkah 3: anak pertama (opsional) + persetujuan */}
        <section hidden={step !== 3} aria-labelledby="su-step-3">
          <h2 id="su-step-3" tabIndex={-1} className="text-[1.25rem] font-bold outline-none">
            Anak pertama <span className="text-[0.875rem] font-medium text-ink-3">· langkah 3 dari 3</span>
          </h2>
          {skipChild ? (
            <div className="my-3 flex items-center justify-between gap-3 rounded-tile bg-surface-2 py-1 pr-1 pl-3.5 text-[0.9375rem] text-ink-2">
              <span>Anak bisa ditambahkan nanti di menu Keluarga.</span>
              <Button size="sm" variant="link" className="min-h-11 px-2" onClick={() => setSkipChild(false)}>
                Isi sekarang
              </Button>
            </div>
          ) : (
            <>
              <p className="mt-1 text-[0.875rem] text-ink-2">Materi akan otomatis menyesuaikan usia anak. Opsional.</p>
              <div className="grid grid-cols-2 gap-x-2.5">
                <Field label="Nama panggilan" id={inputId('childName')} error={err('childName')}>
                  <Input {...a11y('childName')} name="childName" autoComplete="off" autoCapitalize="words" enterKeyHint="next" value={v.childName} onChange={(e) => set('childName', e.target.value)} placeholder="Aisyah" />
                </Field>
                <Field label="Tanggal lahir" id={inputId('childDob')} error={err('childDob')}>
                  <Input {...a11y('childDob')} name="childDob" type="date" max={today} value={v.childDob} onChange={(e) => set('childDob', e.target.value)} />
                </Field>
              </div>
              <Button
                size="sm"
                variant="link"
                className="min-h-11 px-1"
                onClick={() => {
                  setSkipChild(true)
                  setV((x) => ({ ...x, childName: '', childDob: '' }))
                  setErrs((x) => ({ ...x, childName: undefined, childDob: undefined }))
                }}
              >
                Lewati, tambahkan nanti
              </Button>
            </>
          )}

          <div className={cn('mt-3 rounded-tile p-3.5', errs.consent ? 'bg-danger-soft' : 'bg-surface-2')}>
            <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink">
              <input
                id={inputId('consent')}
                type="checkbox"
                name="consent"
                required
                checked={v.consent}
                onChange={(e) => set('consent', e.target.checked)}
                aria-invalid={errs.consent ? true : undefined}
                aria-describedby={errs.consent ? `${inputId('consent')}-err` : undefined}
                className="mt-0.5 size-5 flex-none accent-[var(--brand-2)]"
              />
              <span>Saya setuju data keluarga dan anak diproses untuk menjalankan layanan Pohon Baik sesuai kebijakan privasi. Tidak dijual dan tidak dibagikan untuk iklan.</span>
            </label>
            <Button size="sm" variant="link" className="mt-1 ml-8 min-h-11 px-0" onClick={() => setPrivacyOpen(true)}>
              Baca kebijakan privasi
            </Button>
            {errs.consent && (
              <span id={`${inputId('consent')}-err`} role="alert" className="ml-8 block text-[0.8125rem] font-medium text-danger">
                {errs.consent}
              </span>
            )}
          </div>
        </section>

        <div className="mt-5 flex gap-2.5">
          {step > 1 && (
            <Button className="flex-1" onClick={() => goTo((step - 1) as Step)} disabled={pending}>
              Kembali
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-[2]" disabled={pending}>
            {step < 3 ? 'Lanjut' : pending ? 'Menyiapkan…' : 'Bismillah, daftar'}
          </Button>
        </div>
      </form>

      <p className="mt-4 text-center text-[0.9375rem] text-ink-2">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-2">
          Masuk
        </Link>
      </p>

      <Sheet
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Kebijakan privasi"
        footer={
          <Button variant="primary" block onClick={() => setPrivacyOpen(false)}>
            Kembali ke pendaftaran
          </Button>
        }
      >
        <PrivacyContent compact />
      </Sheet>
    </>
  )
}
