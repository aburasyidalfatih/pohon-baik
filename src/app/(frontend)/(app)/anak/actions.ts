'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { localNow } from '@/lib/curriculum/core'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'

async function session() {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) throw new Error('Sesi berakhir, silakan masuk lagi')
  return { parent, ...ctx }
}

export async function toggleMilestone(
  childId: string,
  key: string,
  milestoneText: string,
  seen: boolean,
) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')

  const today = localNow(Number(s.family.tz ?? 7)).date
  const payload = await payloadClient()

  const whereMile: Where = {
    and: [
      { family: { equals: s.family.id } },
      { child: { equals: childId } },
      { key: { equals: key } },
    ],
  }
  const existingMile = (
    await payload.find({
      collection: 'milestones',
      where: whereMile,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: s.parent,
    })
  ).docs[0]

  const whereMom: Where = {
    and: [
      { family: { equals: s.family.id } },
      { child: { equals: childId } },
      { milestoneKey: { equals: key } },
    ],
  }
  const existingMom = (
    await payload.find({
      collection: 'moments',
      where: whereMom,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: s.parent,
    })
  ).docs[0]

  if (seen) {
    if (!existingMile) {
      await payload.create({
        collection: 'milestones',
        data: {
          family: s.family.id,
          child: childId,
          key,
          seenAt: today,
        },
        overrideAccess: false,
        user: s.parent,
      })
    }
    if (!existingMom) {
      await payload.create({
        collection: 'moments',
        data: {
          family: s.family.id,
          child: childId,
          date: today,
          category: 'bisa',
          source: 'milestone',
          milestoneKey: key,
          text: `Mampu: ${milestoneText}`,
        },
        overrideAccess: false,
        user: s.parent,
      })
    }
  } else {
    if (existingMile) {
      await payload.delete({
        collection: 'milestones',
        id: existingMile.id,
        overrideAccess: false,
        user: s.parent,
      })
    }
    if (existingMom) {
      await payload.delete({
        collection: 'moments',
        id: existingMom.id,
        overrideAccess: false,
        user: s.parent,
      })
    }
  }

  revalidatePath('/anak')
  revalidatePath('/hari-ini')
}

export async function addMoment(
  childId: string,
  category: 'bisa' | 'kata' | 'ibadah' | 'lucu' | 'syukur' | 'catatan',
  text: string,
  date: string,
) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')
  if (!text.trim()) throw new Error('Cerita momen tidak boleh kosong')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tanggal momen tidak valid')
  if (date > localNow(Number(s.family.tz ?? 7)).date) throw new Error('Tanggal tidak boleh melewati hari ini')

  const payload = await payloadClient()
  await payload.create({
    collection: 'moments',
    data: {
      family: s.family.id,
      child: childId,
      date,
      category,
      source: 'manual',
      text: text.trim(),
    },
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/anak')
  revalidatePath('/hari-ini')
}

export async function deleteMoment(momentId: string) {
  const s = await session()
  const payload = await payloadClient()

  await payload.delete({
    collection: 'moments',
    id: momentId,
    overrideAccess: false,
    user: s.parent,
  })

  revalidatePath('/anak')
  revalidatePath('/hari-ini')
}

export async function saveRaporLevel(
  childId: string,
  semester: string,
  branch: string,
  level: number,
) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')
  if (!Number.isInteger(level) || level < 0 || level > 3) throw new Error('Tingkat rapor tidak valid')

  const payload = await payloadClient()
  const where: Where = {
    and: [
      { family: { equals: s.family.id } },
      { child: { equals: childId } },
      { semester: { equals: semester } },
      { branch: { equals: branch } },
    ],
  }
  const existing = (
    await payload.find({
      collection: 'raporEntries',
      where,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: s.parent,
    })
  ).docs[0]

  if (existing) {
    await payload.update({
      collection: 'raporEntries',
      id: existing.id,
      data: { level },
      overrideAccess: false,
      user: s.parent,
    })
  } else {
    await payload.create({
      collection: 'raporEntries',
      data: {
        family: s.family.id,
        child: childId,
        semester,
        branch,
        level,
        note: '',
      },
      overrideAccess: false,
      user: s.parent,
    })
  }

  revalidatePath('/anak')
}

export async function saveRaporNote(
  childId: string,
  semester: string,
  branch: string,
  note: string,
) {
  const s = await session()
  if (!s.children.some((c) => c.id === childId)) throw new Error('Anak tidak ditemukan')

  const payload = await payloadClient()
  const where: Where = {
    and: [
      { family: { equals: s.family.id } },
      { child: { equals: childId } },
      { semester: { equals: semester } },
      { branch: { equals: branch } },
    ],
  }
  const existing = (
    await payload.find({
      collection: 'raporEntries',
      where,
      limit: 1,
      depth: 0,
      overrideAccess: false,
      user: s.parent,
    })
  ).docs[0]

  if (existing) {
    await payload.update({
      collection: 'raporEntries',
      id: existing.id,
      data: { note: note.trim() },
      overrideAccess: false,
      user: s.parent,
    })
  } else {
    await payload.create({
      collection: 'raporEntries',
      data: {
        family: s.family.id,
        child: childId,
        semester,
        branch,
        level: 0,
        note: note.trim(),
      },
      overrideAccess: false,
      user: s.parent,
    })
  }

  revalidatePath('/anak')
}
