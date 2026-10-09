'use client'

import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Button, Field, Input } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { requestPasswordReset, resetPassword, signIn } from './actions'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Pesan galat/info di bagian atas form (halaman auth tidak memakai toast). */
export function Notice({ tone = 'error', children }: { tone?: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'my-3 rounded-tile px-3.5 py-2.5 text-[0.9375rem]',
        tone === 'error' ? 'bg-danger-soft text-danger' : tone === 'success' ? 'bg-brand-soft text-brand' : 'bg-fill text-ink',
      )}
    >
      {children}
    </div>
  )
}

/** Atribut kolom email yang ramah HP (tanpa huruf kapital otomatis/koreksi ejaan). */
export const emailInputProps = {
  type: 'email',
  inputMode: 'email',
  autoCapitalize: 'none',
  autoCorrect: 'off',
  spellCheck: false,
} as const

/** Kolom kata sandi dengan tombol tampil/sembunyi. Tombol berada di luar <label> (HTML valid). */
export function PasswordField({ id, label, hint, error, className, ...input }: { id: string; label: string; hint?: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('my-2.5', className)}>
      <label htmlFor={id} className="mb-1.5 ml-1 block text-[0.8125rem] font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="pr-14"
          {...input}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label="Tampilkan kata sandi"
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-field text-ink-2 transition active:opacity-60"
        >
          {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
        </button>
      </div>
      {error ? (
        <span id={`${id}-err`} role="alert" className="mt-1 ml-1 block text-[0.8125rem] font-medium text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="mt-1 ml-1 block text-xs text-ink-3">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

const focusId = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

// ---------- Masuk ----------
export function SignInForm({ notice }: { notice?: { tone: 'success' | 'info'; text: string } }) {
  const [state, action, pending] = useActionState(signIn, undefined)
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const next: typeof errs = {}
    if (!EMAIL.test(String(fd.get('email') ?? '').trim())) next.email = 'Tulis email yang valid'
    if (!String(fd.get('password') ?? '')) next.password = 'Tulis kata sandi'
    setErrs(next)
    if (next.email || next.password) {
      e.preventDefault()
      focusId(next.email ? 'si-email' : 'si-password')
    }
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate>
      {state?.error ? <Notice>{state.error}</Notice> : notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      <Field label="Email" id="si-email" error={errs.email}>
        <Input
          id="si-email"
          name="email"
          {...emailInputProps}
          autoComplete="username"
          enterKeyHint="next"
          required
          defaultValue={state?.values?.email}
          aria-invalid={errs.email || state?.field === 'email' ? true : undefined}
          aria-describedby={errs.email ? 'si-email-err' : undefined}
          onChange={() => errs.email && setErrs((x) => ({ ...x, email: undefined }))}
        />
      </Field>
      <PasswordField
        id="si-password"
        name="password"
        label="Kata sandi"
        autoComplete="current-password"
        enterKeyHint="go"
        required
        error={errs.password}
        onChange={() => errs.password && setErrs((x) => ({ ...x, password: undefined }))}
      />
      <div className="-mt-1 flex justify-end">
        <Link href="/lupa-sandi" className="inline-flex min-h-11 items-center px-1 text-[0.9375rem] font-semibold text-brand-2 active:opacity-60">
          Lupa kata sandi?
        </Link>
      </div>
      <Button type="submit" variant="primary" block className="mt-2" disabled={pending}>
        {pending ? 'Memeriksa…' : 'Masuk'}
      </Button>
      <p className="mt-4 text-center text-[0.9375rem] text-ink-2">
        Belum punya akun?{' '}
        <Link href="/daftar" className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-2">
          Daftar
        </Link>
      </p>
    </form>
  )
}

// ---------- Lupa kata sandi ----------
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)
  const [err, setErr] = useState<string>()

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    if (!EMAIL.test(email)) {
      e.preventDefault()
      setErr('Tulis email yang valid')
      focusId('fp-email')
    } else setErr(undefined)
  }

  return (
    <form action={action} onSubmit={onSubmit} noValidate>
      {state?.sent && (
        <Notice tone="success">
          Bila email <b>{state.values?.email}</b> terdaftar, tautan atur ulang sudah dikirim. Periksa kotak masuk dan folder spam; tautan berlaku 1 jam.
        </Notice>
      )}
      <Field label="Email akun" id="fp-email" error={err ?? (state?.field === 'email' ? state.error : undefined)}>
        <Input
          id="fp-email"
          name="email"
          {...emailInputProps}
          autoComplete="username"
          enterKeyHint="send"
          required
          defaultValue={state?.values?.email}
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? 'fp-email-err' : undefined}
        />
      </Field>
      <Button type="submit" variant="primary" block className="mt-3" disabled={pending}>
        {pending ? 'Mengirim…' : state?.sent ? 'Kirim ulang tautan' : 'Kirim tautan'}
      </Button>
      <p className="mt-4 text-center text-[0.9375rem] text-ink-2">
        Ingat kata sandi?{' '}
        <Link href="/masuk" className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-2">
          Masuk
        </Link>
      </p>
    </form>
  )
}

// ---------- Atur kata sandi baru ----------
export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined)
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget)
    const pw = String(fd.get('password') ?? '')
    const next: typeof errs = {}
    if (pw.trim().length < 8) next.password = 'Minimal 8 karakter'
    if (!next.password && pw !== String(fd.get('confirm') ?? '')) next.confirm = 'Kedua kata sandi belum sama'
    setErrs(next)
    if (next.password || next.confirm) {
      e.preventDefault()
      focusId(next.password ? 'rp-password' : 'rp-confirm')
    }
  }

  const serverErr = (f: string) => (state?.field === f ? state.error : undefined)
  return (
    <form action={action} onSubmit={onSubmit} noValidate>
      {state?.field === 'token' && (
        <Notice>
          {state.error}{' '}
          <Link href="/lupa-sandi" className="font-semibold underline">
            Minta tautan baru
          </Link>
        </Notice>
      )}
      <input type="hidden" name="token" value={token} />
      <PasswordField
        id="rp-password"
        name="password"
        label="Kata sandi baru"
        hint="Minimal 8 karakter"
        autoComplete="new-password"
        enterKeyHint="next"
        minLength={8}
        required
        error={errs.password ?? serverErr('password')}
        onChange={() => errs.password && setErrs((x) => ({ ...x, password: undefined }))}
      />
      <PasswordField
        id="rp-confirm"
        name="confirm"
        label="Ulangi kata sandi baru"
        autoComplete="new-password"
        enterKeyHint="done"
        required
        error={errs.confirm ?? serverErr('confirm')}
        onChange={() => errs.confirm && setErrs((x) => ({ ...x, confirm: undefined }))}
      />
      <Button type="submit" variant="primary" block className="mt-3" disabled={pending}>
        {pending ? 'Menyimpan…' : 'Simpan dan masuk'}
      </Button>
    </form>
  )
}
