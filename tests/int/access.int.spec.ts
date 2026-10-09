// Uji access control (UU PDP): data anak hanya terlihat oleh keluarganya sendiri
// dan staf yang berwenang. Membutuhkan database lokal (docker compose up -d).
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import config from '@/payload.config'
import type { Child, Family, Parent, User } from '@/payload-types'

let payload: Payload
const tag = `t${Date.now()}`
const made: { parents: string[]; families: string[]; users: string[] } = { parents: [], families: [], users: [] }

async function makeFamily(name: string) {
  const parent = (await payload.create({ collection: 'parents', data: { name, email: `${name}-${tag}@uji.test`, password: 'rahasia-uji-123' } })) as Parent
  const family = (await payload.create({
    collection: 'families',
    data: { name: `Keluarga ${name}`, members: [{ parent: parent.id, role: 'owner' }], city: 'jakarta', themeStart: '2026-10-01', themeOffset: 0 },
  })) as Family
  const child = (await payload.create({ collection: 'children', data: { family: family.id, name: `Anak ${name}`, dob: '2024-05-20' } })) as Child
  made.parents.push(parent.id)
  made.families.push(family.id)
  const asUser = { ...parent, collection: 'parents' as const }
  return { parent: asUser, family, child }
}

let A: Awaited<ReturnType<typeof makeFamily>>
let B: Awaited<ReturnType<typeof makeFamily>>
let kontenStaff: User & { collection: 'users' }

describe('access control data keluarga', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    A = await makeFamily('ayu')
    B = await makeFamily('budi')
    const u = (await payload.create({ collection: 'users', data: { email: `konten-${tag}@uji.test`, password: 'rahasia-uji-123', roles: ['konten'] } })) as User
    made.users.push(u.id)
    kontenStaff = { ...u, collection: 'users' }
  })

  afterAll(async () => {
    for (const id of made.families) {
      await payload.delete({ collection: 'children', where: { family: { equals: id } } })
      await payload.delete({ collection: 'families', id })
    }
    for (const id of made.parents) await payload.delete({ collection: 'parents', id })
    for (const id of made.users) await payload.delete({ collection: 'users', id })
  })

  it('orang tua hanya melihat anak keluarganya sendiri', async () => {
    const res = await payload.find({ collection: 'children', user: A.parent, overrideAccess: false })
    expect(res.docs.map((c) => c.id)).toEqual([A.child.id])
  })

  it('orang tua tidak bisa membaca atau mengubah anak keluarga lain', async () => {
    await expect(payload.findByID({ collection: 'children', id: B.child.id, user: A.parent, overrideAccess: false })).rejects.toThrow()
    await expect(payload.update({ collection: 'children', id: B.child.id, data: { name: 'diubah' }, user: A.parent, overrideAccess: false })).rejects.toThrow()
  })

  it('orang tua tidak bisa menambah anak ke keluarga lain', async () => {
    await expect(
      payload.create({ collection: 'children', data: { family: B.family.id, name: 'Penyusup', dob: '2020-01-01' }, user: A.parent, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('orang tua hanya melihat keluarga & akunnya sendiri', async () => {
    const fams = await payload.find({ collection: 'families', user: A.parent, overrideAccess: false })
    expect(fams.docs.map((f) => f.id)).toEqual([A.family.id])
    const parents = await payload.find({ collection: 'parents', user: A.parent, overrideAccess: false })
    expect(parents.docs.map((p) => p.id)).toEqual([A.parent.id])
  })

  it('staf konten bisa mengelola materi tetapi tidak melihat data anak', async () => {
    await expect(payload.find({ collection: 'children', user: kontenStaff, overrideAccess: false })).rejects.toThrow(/tidak diizinkan|Forbidden/)
    await expect(payload.find({ collection: 'parents', user: kontenStaff, overrideAccess: false })).rejects.toThrow()
    const themes = await payload.find({ collection: 'themes', user: kontenStaff, overrideAccess: false, limit: 1 })
    expect(themes.totalDocs).toBe(12)
  })

  it('orang tua tidak bisa mengubah materi', async () => {
    const t = (await payload.find({ collection: 'themes', limit: 1 })).docs[0]
    await expect(payload.update({ collection: 'themes', id: t.id, data: { title: 'x' }, user: A.parent, overrideAccess: false })).rejects.toThrow()
  })
})
