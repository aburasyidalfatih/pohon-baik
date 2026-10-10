'use server'

import { revalidatePath } from 'next/cache'
import type { Where } from 'payload'
import { randomUUID } from 'node:crypto'
import { localNow } from '@/lib/curriculum/core'
import { childOpenOn } from '@/lib/server/billing'
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

const CATS = ['bisa', 'kata', 'ibadah', 'lucu', 'syukur', 'catatan'] as const
type Cat = (typeof CATS)[number]
const MAX_PHOTO = 4 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Simpan momen baru atau lengkapi momen lama: cerita, usaha (pujian proses), tanggal, dan foto privat.
 * `targetKey` diisi saat menandai target capaian usia tercapai: tonggaknya ikut dicatat.
 * Galat dikembalikan sebagai nilai agar pesannya tetap terbaca di production.
 */
export async function saveMoment(fd: FormData): Promise<{ error?: string }> {
  const s = await session().catch(() => null)
  if (!s) return { error: 'Sesi berakhir, silakan masuk lagi' }
  const str = (k: string) => String(fd.get(k) ?? '').trim()
  const id = str('id')
  const childId = str('childId')
  const cat = (CATS as readonly string[]).includes(str('category')) ? (str('category') as Cat) : 'catatan'
  const text = str('text').slice(0, 4000)
  const effort = str('effort').slice(0, 1000)
  const date = str('date')
  const targetKey = str('targetKey')
  const removePhoto = str('removePhoto') === '1'
  const file = fd.get('photo')
  const photo = file instanceof File && file.size > 0 ? file : null

  const child = s.children.find((c) => c.id === childId)
  if (!child) return { error: 'Anak tidak ditemukan' }
  if (!childOpenOn(s.family, child, localNow(Number(s.family.tz ?? 7)).date)) return { error: `Langganan ${child.name} belum aktif` }
  if (!text) return { error: 'Ceritakan momennya dulu, satu kalimat pun cukup.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Tanggal momen tidak valid' }
  if (date > localNow(Number(s.family.tz ?? 7)).date) return { error: 'Tanggal tidak boleh melewati hari ini' }
  if (targetKey && !/^t-[\w-]+$/.test(targetKey)) return { error: 'Target tidak dikenal' }
  if (photo && (!PHOTO_TYPES.includes(photo.type) || photo.size > MAX_PHOTO)) return { error: 'Foto harus JPG/PNG/WebP dan maksimal 4 MB' }

  const payload = await payloadClient()
  const user = { overrideAccess: false as const, user: s.parent }
  const existing = id ? (await payload.find({ collection: 'moments', where: { and: [{ id: { equals: id } }, { family: { equals: s.family.id } }] }, limit: 1, depth: 0, ...user })).docs[0] : null
  if (id && !existing) return { error: 'Momen tidak ditemukan' }

  // Unggah foto dulu (nama acak, bukan nama anak); bila momen gagal disimpan, foto dibuang lagi.
  let photoId: string | null = null
  if (photo) {
    const doc = await payload.create({
      collection: 'momentPhotos',
      data: { family: s.family.id },
      file: { data: Buffer.from(await photo.arrayBuffer()), mimetype: photo.type, name: `momen-${randomUUID()}.${photo.type.split('/')[1]}`, size: photo.size },
      overrideAccess: true,
    })
    photoId = doc.id
  }

  try {
    const data = {
      category: targetKey ? ('bisa' as const) : cat,
      text,
      effort: effort || null,
      date,
      ...(photoId ? { photo: photoId } : removePhoto ? { photo: null } : {}),
    }
    if (existing) {
      await payload.update({ collection: 'moments', id: existing.id, data, ...user })
    } else {
      if (targetKey) {
        const mile = await payload.find({ collection: 'milestones', where: { and: [{ family: { equals: s.family.id } }, { child: { equals: childId } }, { key: { equals: targetKey } }] }, limit: 1, depth: 0, ...user })
        if (!mile.docs[0]) await payload.create({ collection: 'milestones', data: { family: s.family.id, child: childId, key: targetKey, seenAt: date }, ...user })
      }
      await payload.create({
        collection: 'moments',
        data: { ...data, family: s.family.id, child: childId, source: targetKey ? 'target' : 'manual', ...(targetKey ? { milestoneKey: targetKey } : {}) },
        ...user,
      })
    }
  } catch (e) {
    if (photoId) await payload.delete({ collection: 'momentPhotos', id: photoId, overrideAccess: true }).catch(() => {})
    console.error('[momen] gagal menyimpan', e)
    return { error: 'Gagal menyimpan momen. Coba lagi.' }
  }

  revalidatePath('/anak')
  revalidatePath('/hari-ini')
  return {}
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
