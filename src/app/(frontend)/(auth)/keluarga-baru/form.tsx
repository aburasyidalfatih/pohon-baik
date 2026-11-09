'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Select } from '@/components/ui/primitives'
import { CITIES } from '@/lib/curriculum/constants'
import { Notice } from '../forms'
import { createOwnFamily } from './actions'

export function NewFamilyForm() {
  const [state, action, pending] = useActionState(createOwnFamily, undefined)
  return (
    <form action={action}>
      {state?.error && <Notice>{state.error}</Notice>}
      <Field label="Nama keluarga" id="kb-family">
        <Input id="kb-family" name="family" required autoCapitalize="words" placeholder="Misalnya: Keluarga Abdullah" />
      </Field>
      <Field label="Kota (untuk jadwal shalat)" id="kb-city">
        <Select id="kb-city" name="city" defaultValue="jakarta">
          {Object.entries(CITIES).map(([v, c]) => <option key={v} value={v}>{c[0]}</option>)}
        </Select>
      </Field>
      <Button type="submit" variant="primary" block className="mt-3" disabled={pending}>{pending ? 'Membuat…' : 'Buat keluarga'}</Button>
    </form>
  )
}
