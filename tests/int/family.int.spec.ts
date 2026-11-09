// @vitest-environment node
// Uji undangan keluarga, pengaman anggota, dan jadwal pengingat waktu shalat. Butuh PostgreSQL lokal.
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { localNow } from '@/lib/curriculum/core'
import { composeBody, dueWaktu } from '@/lib/push/schedule'
import { acceptInvite, createInvite, findInvite, removeMember } from '@/lib/server/invites'
import config from '@/payload.config'
import type { Child, Family, Parent } from '@/payload-types'

const PT = { subuh: '04:15', terbit: '05:30', dzuhur: '11:45', ashar: '15:00', maghrib: '17:50', isya: '19:00' }
const min = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

describe('jadwal pengingat', () => {
  it('mengirim dalam 40 menit setelah waktu masuk, sekali per waktu', () => {
    expect(dueWaktu(PT, '2026-11-09', min('04:14'))).toBeNull()
    expect(dueWaktu(PT, '2026-11-09', min('04:15'))).toBe('subuh')
    expect(dueWaktu(PT, '2026-11-09', min('04:50'))).toBe('subuh')
    expect(dueWaktu(PT, '2026-11-09', min('04:56'))).toBeNull()
    expect(dueWaktu(PT, '2026-11-09', min('04:20'), '2026-11-09|subuh')).toBeNull()
    expect(dueWaktu(PT, '2026-11-10', min('04:20'), '2026-11-09|subuh')).toBe('subuh')
    expect(dueWaktu(PT, '2026-11-09', min('12:00'))).toBe('dzuhur')
  })

  it('isi ringkas: 2 tugas per anak, Majelis saat Maghrib', () => {
    expect(composeBody([{ name: 'Umar', tasks: ['a', 'b', 'c', 'd'] }, { name: 'Hana', tasks: [] }], 'Kisah Nuh')).toBe('Umar: a, b +2 · Majelis Malam: Kisah Nuh')
    expect(composeBody([{ name: 'Hana', tasks: [] }])).toBe('')
  })
})

let payload: Payload
const tag = `f${Date.now()}`
const today = localNow(7).date
type P = Parent & { collection: 'parents' }
const made: { parents: string[]; families: string[] } = { parents: [], families: [] }

async function parent(name: string): Promise<P> {
  const p = (await payload.create({ collection: 'parents', data: { name, email: `${name}-${tag}@uji.test`, password: 'rahasia-uji-123' } })) as Parent
  made.parents.push(p.id)
  return { ...p, collection: 'parents' }
}
async function family(owner: P, withChild = true) {
  const f = (await payload.create({ collection: 'families', data: { name: `K ${owner.name}`, members: [{ parent: owner.id, role: 'owner' }], city: 'jakarta', themeStart: today, themeOffset: 0 } })) as Family
  made.families.push(f.id)
  const children: Child[] = withChild ? [(await payload.create({ collection: 'children', data: { family: f.id, name: `Anak ${owner.name}`, dob: '2020-01-01' } })) as Child] : []
  return { parent: owner, family: f, children }
}
const reload = (id: string) => payload.findByID({ collection: 'families', id, depth: 0 }) as Promise<Family>
const memberIds = (f: Family) => (f.members ?? []).map((m) => (typeof m.parent === 'object' ? m.parent.id : m.parent))

describe('undangan keluarga', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of made.families) {
      await payload.delete({ collection: 'familyInvites', where: { family: { equals: id } } })
      await payload.delete({ collection: 'pushSubscriptions', where: { family: { equals: id } } })
      await payload.delete({ collection: 'children', where: { family: { equals: id } } })
      await payload.delete({ collection: 'families', where: { id: { equals: id } } })
    }
    for (const id of made.parents) await payload.delete({ collection: 'parents', where: { id: { equals: id } } })
  })

  it('orang tua tidak bisa menambah anggota lewat API', async () => {
    const a = await family(await parent('ayah'))
    const stranger = await parent('asing')
    await payload.update({
      collection: 'families', id: a.family.id, user: a.parent, overrideAccess: false,
      data: { name: 'Diubah', members: [{ parent: a.parent.id, role: 'owner' }, { parent: stranger.id, role: 'parent' }] },
    })
    const f = await reload(a.family.id)
    expect(f.name).toBe('Diubah')
    expect(memberIds(f)).toEqual([a.parent.id])
  })

  it('akun baru menerima undangan dan tautan hanya sekali pakai', async () => {
    const a = await family(await parent('bunda'))
    const url = await createInvite(a, 'parent')
    const token = url.split('/gabung/')[1]
    const pasangan = await parent('pasangan')
    expect(await acceptInvite(pasangan.id, token)).toEqual({})
    expect(memberIds(await reload(a.family.id))).toEqual([a.parent.id, pasangan.id])
    expect(await findInvite(token)).toBeNull()
    const lain = await parent('lain')
    expect((await acceptInvite(lain.id, token)).error).toBeTruthy()
  })

  it('keluarga kosong milik yang diundang dihapus; keluarga berisi anak ditolak', async () => {
    const a = await family(await parent('pengundang'))
    const kosong = await family(await parent('kosong'), false)
    const t1 = (await createInvite(a, 'caregiver')).split('/gabung/')[1]
    expect(await acceptInvite(kosong.parent.id, t1)).toEqual({})
    expect((await payload.find({ collection: 'families', where: { id: { equals: kosong.family.id } } })).docs).toHaveLength(0)

    const berisi = await family(await parent('berisi'))
    const t2 = (await createInvite(a, 'parent')).split('/gabung/')[1]
    expect((await acceptInvite(berisi.parent.id, t2)).error).toMatch(/sudah terhubung/)
    expect(memberIds(await reload(a.family.id))).not.toContain(berisi.parent.id)
  })

  it('hanya pemilik yang bisa mengeluarkan anggota; perangkatnya berhenti menerima pengingat', async () => {
    const a = await family(await parent('pemilik'))
    const b = await parent('anggota')
    await acceptInvite(b.id, (await createInvite(a, 'parent')).split('/gabung/')[1])
    const fam = await reload(a.family.id)
    await payload.create({ collection: 'pushSubscriptions', data: { parent: b.id, family: fam.id, endpoint: `https://push.uji/${tag}`, keys: { p256dh: 'x', auth: 'y' } } })

    expect((await removeMember({ parent: b, family: fam, children: a.children }, a.parent.id)).error).toBeTruthy()
    expect(await removeMember({ parent: a.parent, family: fam, children: a.children }, b.id)).toEqual({})
    expect(memberIds(await reload(a.family.id))).toEqual([a.parent.id])
    expect((await payload.find({ collection: 'pushSubscriptions', where: { parent: { equals: b.id } } })).docs).toHaveLength(0)
  })

  it('perangkat notifikasi keluarga lain tidak terlihat', async () => {
    const a = await family(await parent('pa'))
    const b = await family(await parent('pb'))
    await payload.create({ collection: 'pushSubscriptions', data: { parent: a.parent.id, family: a.family.id, endpoint: `https://push.uji/a-${tag}`, keys: { p256dh: 'x', auth: 'y' } } })
    const seen = await payload.find({ collection: 'pushSubscriptions', where: { family: { equals: a.family.id } }, user: b.parent, overrideAccess: false })
    expect(seen.docs).toHaveLength(0)
  })
})
