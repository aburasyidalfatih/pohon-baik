'use server'

import { redirect } from 'next/navigation'
import { CITIES } from '@/lib/curriculum/constants'
import { localNow } from '@/lib/curriculum/core'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import type { Family } from '@/payload-types'

export type NewFamilyState = { error?: string } | undefined

/** Akun tanpa keluarga (mis. dikeluarkan dari keluarga lain) membuat keluarga sendiri. */
export async function createOwnFamily(_: NewFamilyState, fd: FormData): Promise<NewFamilyState> {
  const parent = await getParent()
  if (!parent) redirect('/masuk')
  if (await getFamily()) redirect('/hari-ini')
  const name = String(fd.get('family') ?? '').trim()
  const city = String(fd.get('city') ?? 'jakarta')
  if (!name) return { error: 'Tulis nama keluarga.' }
  if (!CITIES[city]) return { error: 'Pilih kota.' }
  const tz = CITIES[city][3]
  const payload = await payloadClient()
  await payload.create({
    collection: 'families',
    overrideAccess: true,
    data: { name, members: [{ parent: parent.id, role: 'owner' }], city: city as Family['city'], tz: String(tz) as '7' | '8' | '9', themeStart: localNow(tz).date, themeOffset: 0 },
  })
  redirect('/keluarga')
}
