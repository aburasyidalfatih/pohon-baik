// @vitest-environment node
// Uji foto momen (data anak, UU PDP): privat per keluarga, tidak bisa ditautkan lintas keluarga,
// ikut terhapus bersama momennya, dan metadata EXIF (lokasi) terbuang. Butuh PostgreSQL lokal.
import fs from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { localNow } from '@/lib/curriculum/core'
import config from '@/payload.config'
import type { Child, Family, MomentPhoto, Parent } from '@/payload-types'

let payload: Payload
const tag = `m${Date.now()}`
const today = localNow(7).date
type Fam = { parent: Parent & { collection: 'parents' }; family: Family; child: Child }
let A: Fam
let B: Fam

async function makeFamily(name: string): Promise<Fam> {
  const p = (await payload.create({ collection: 'parents', data: { name, email: `${name}-${tag}@uji.test`, password: 'rahasia-uji-123' } })) as Parent
  const family = (await payload.create({ collection: 'families', data: { name: `K ${name}`, members: [{ parent: p.id, role: 'owner' }], city: 'jakarta', themeStart: today, themeOffset: 0 } })) as Family
  const child = (await payload.create({ collection: 'children', data: { family: family.id, name: `Anak ${name}`, dob: '2021-03-01' } })) as Child
  return { parent: { ...p, collection: 'parents' }, family, child }
}

async function photoFor(f: Fam) {
  // JPEG dengan metadata EXIF berisi lokasi GPS, seperti foto dari HP.
  const data = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#4a8' } })
    .jpeg()
    .withExif({ IFD3: { GPSLatitudeRef: 'S', GPSLatitude: '6/1 12/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '106/1 49/1 0/1' } })
    .toBuffer()
  return (await payload.create({
    collection: 'momentPhotos',
    data: { family: f.family.id },
    file: { data, mimetype: 'image/jpeg', name: `momen-${tag}-${f.family.id}.jpg`, size: data.length },
    overrideAccess: true,
  })) as MomentPhoto
}

const staticDir = () => payload.collections.momentPhotos.config.upload.staticDir as string

describe('foto momen', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    A = await makeFamily('fa')
    B = await makeFamily('fb')
  })

  afterAll(async () => {
    for (const f of [A, B]) {
      await payload.delete({ collection: 'moments', where: { family: { equals: f.family.id } } })
      await payload.delete({ collection: 'momentPhotos', where: { family: { equals: f.family.id } } })
      await payload.delete({ collection: 'milestones', where: { family: { equals: f.family.id } } })
      await payload.delete({ collection: 'children', where: { family: { equals: f.family.id } } })
      await payload.delete({ collection: 'families', id: f.family.id })
      await payload.delete({ collection: 'parents', id: f.parent.id })
    }
  })

  it('metadata lokasi terbuang dan ukuran kecil dibuat', async () => {
    const p = await photoFor(A)
    const meta = await sharp(path.join(staticDir(), p.filename!)).metadata()
    expect(meta.exif).toBeUndefined()
    expect(p.sizes?.thumb?.filename).toBeTruthy()
  })

  it('keluarga lain tidak bisa melihat foto', async () => {
    const p = await photoFor(A)
    const seenByB = await payload.find({ collection: 'momentPhotos', where: { id: { equals: p.id } }, user: B.parent, overrideAccess: false })
    expect(seenByB.docs).toHaveLength(0)
    const seenByA = await payload.find({ collection: 'momentPhotos', where: { id: { equals: p.id } }, user: A.parent, overrideAccess: false })
    expect(seenByA.docs).toHaveLength(1)
  })

  it('orang tua tidak bisa mengunggah langsung lewat API', async () => {
    const data = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).jpeg().toBuffer()
    await expect(
      payload.create({ collection: 'momentPhotos', data: { family: A.family.id }, file: { data, mimetype: 'image/jpeg', name: `x-${tag}.jpg`, size: data.length }, user: A.parent, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('foto keluarga lain tidak bisa ditautkan ke momen sendiri', async () => {
    const pB = await photoFor(B)
    await expect(
      payload.create({
        collection: 'moments', user: A.parent, overrideAccess: false,
        data: { family: A.family.id, child: A.child.id, date: today, category: 'bisa', source: 'manual', text: 'x', photo: pB.id },
      }),
    ).rejects.toThrow()
  })

  it('foto ikut terhapus bersama momennya (dokumen dan berkas)', async () => {
    const p = await photoFor(A)
    const file = path.join(staticDir(), p.filename!)
    expect(fs.existsSync(file)).toBe(true)
    const m = await payload.create({
      collection: 'moments', user: A.parent, overrideAccess: false,
      data: { family: A.family.id, child: A.child.id, date: today, category: 'bisa', source: 'target', milestoneKey: 't-b3-0', text: 'Tercapai', effort: 'terus mencoba', photo: p.id },
    })
    await payload.delete({ collection: 'moments', id: m.id, user: A.parent, overrideAccess: false })
    const left = await payload.find({ collection: 'momentPhotos', where: { id: { equals: p.id } } })
    expect(left.docs).toHaveLength(0)
    expect(fs.existsSync(file)).toBe(false)
  })
})
