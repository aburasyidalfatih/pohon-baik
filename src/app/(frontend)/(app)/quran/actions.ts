'use server'

import { revalidatePath } from 'next/cache'
import { INTERVALS } from '@/lib/curriculum/constants'
import { localNow } from '@/lib/curriculum/core'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'

async function session() {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) throw new Error('Sesi berakhir, silakan masuk lagi')
  return { parent, ...ctx }
}

export async function addQuranSetoran(childId: string, label: string, base: string) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')
  if (!label.trim()) throw new Error('Nama surah atau bagian wajib diisi')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) throw new Error('Format tanggal tidak valid')
  if (base > localNow(Number(s.family.tz ?? 7)).date) throw new Error('Tanggal setoran tidak boleh setelah hari ini')

  const payload = await payloadClient()
  await payload.create({
    collection: 'quranEntries',
    data: {
      family: s.family.id,
      child: childId,
      label: label.trim(),
      base,
      done: [],
    },
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/quran')
  revalidatePath('/hari-ini')
}

export async function markQuranPassed(entryId: string, interval: number) {
  const s = await session()
  if (!(INTERVALS as readonly number[]).includes(interval)) throw new Error('Putaran murajaah tidak valid')
  const payload = await payloadClient()

  const entry = await payload.findByID({
    collection: 'quranEntries',
    id: entryId,
    overrideAccess: false,
    user: s.parent,
  })
  if (!entry) throw new Error('Setoran tidak ditemukan')

  const currentDone = Array.isArray(entry.done) ? (entry.done as number[]) : []
  if (!currentDone.includes(interval)) {
    const nextDone = [...currentDone, interval]
    await payload.update({
      collection: 'quranEntries',
      id: entryId,
      data: { done: nextDone },
      overrideAccess: false,
      user: s.parent,
    })
  }

  revalidatePath('/quran')
  revalidatePath('/hari-ini')
}

export async function resetQuranSetoran(entryId: string, today: string) {
  const s = await session()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('Format tanggal tidak valid')
  const payload = await payloadClient()

  await payload.update({
    collection: 'quranEntries',
    id: entryId,
    data: {
      base: today,
      done: [],
    },
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/quran')
  revalidatePath('/hari-ini')
}

export async function deleteQuranSetoran(entryId: string) {
  const s = await session()
  const payload = await payloadClient()

  await payload.delete({
    collection: 'quranEntries',
    id: entryId,
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/quran')
  revalidatePath('/hari-ini')
}

/** Urungkan "Ulang": kembalikan tanggal dasar & putaran yang sudah lancar seperti sebelum direset. */
export async function restoreQuranSetoran(entryId: string, base: string, done: number[]) {
  const s = await session()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) throw new Error('Format tanggal tidak valid')
  const clean = [...new Set(done)].filter((n) => (INTERVALS as readonly number[]).includes(n))
  const payload = await payloadClient()

  await payload.update({
    collection: 'quranEntries',
    id: entryId,
    data: { base, done: clean },
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/quran')
  revalidatePath('/hari-ini')
}
