'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Button, Field, Input } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { emailInputProps, Notice, PasswordField } from '../../forms'
import { joinAsCurrent, signUpAndJoin } from '../actions'

export function JoinAsCurrentForm({ token, name, email }: { token: string; name: string; email: string }) {
  const [state, action, pending] = useActionState(joinAsCurrent, undefined)
  return (
    <form action={action}>
      {state?.error && <Notice>{state.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <p className="my-3 rounded-tile bg-surface px-3.5 py-3 text-[0.9375rem] shadow-card">
        Masuk sebagai <b>{name}</b> <span className="text-ink-2">({email})</span>
      </p>
      <Button type="submit" variant="primary" block disabled={pending}>{pending ? 'Menggabungkan…' : 'Gabung ke keluarga'}</Button>
    </form>
  )
}

/** Daftar singkat khusus undangan: nama, email, kata sandi, persetujuan. Tanpa membuat keluarga baru. */
export function SignUpJoinForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(signUpAndJoin, undefined)
  const [consent, setConsent] = useState(false)
  const bad = (f: string) => (state?.field === f ? true : undefined)
  return (
    <form action={action} noValidate>
      {state?.error && <Notice>{state.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <Field label="Nama Anda" id="gj-name">
        <Input id="gj-name" name="name" autoComplete="name" autoCapitalize="words" required defaultValue={state?.values?.name} aria-invalid={bad('name')} />
      </Field>
      <Field label="Email" id="gj-email">
        <Input id="gj-email" name="email" {...emailInputProps} autoComplete="username" required defaultValue={state?.values?.email} aria-invalid={bad('email')} />
      </Field>
      <PasswordField id="gj-password" name="password" label="Kata sandi" hint="Minimal 8 karakter" autoComplete="new-password" required />
      <label className={cn('mt-3 flex items-start gap-3 rounded-tile p-3.5', bad('consent') ? 'bg-danger-soft' : 'bg-surface-2')}>
        <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 flex-none accent-brand-2" />
        <span className="text-[0.875rem] text-ink-2">
          Saya menyetujui <Link href="/privasi" target="_blank" className="font-semibold text-brand-2 underline">kebijakan privasi</Link>, termasuk pengolahan data anak di keluarga ini.
        </span>
      </label>
      <Button type="submit" variant="primary" block className="mt-4" disabled={pending}>{pending ? 'Membuat akun…' : 'Buat akun dan gabung'}</Button>
      <p className="mt-4 text-center text-[0.9375rem] text-ink-2">
        Saya sudah punya akun.{' '}
        <Link href={`/masuk?lanjut=${encodeURIComponent(`/gabung/${token}`)}`} className="inline-flex min-h-11 items-center px-1 font-semibold text-brand-2">Masuk</Link>
      </p>
    </form>
  )
}
