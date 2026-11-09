import 'server-only'
import { randomBytes } from 'node:crypto'
import { headers } from 'next/headers'
import type { Child, Family, FamilyInvite, Parent } from '@/payload-types'
import { payloadClient } from './payload'

type Ctx = { parent: Parent; family: Family; children: Child[] }
export const INVITE_DAYS = 7
export type MemberRole = 'owner' | 'parent' | 'caregiver'

const idOf = (x: unknown) => String(x && typeof x === 'object' ? (x as { id: string }).id : x)

export async function appOrigin() {
  const env = process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL
  if (env) return env.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  return `${h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')}://${host}`
}

/** Anggota keluarga beserta nama (untuk ditampilkan di menu Keluarga). */
export async function familyMembers(ctx: Ctx) {
  const payload = await payloadClient()
  const ids = (ctx.family.members ?? []).map((m) => idOf(m.parent))
  const parents = ids.length ? (await payload.find({ collection: 'parents', where: { id: { in: ids } }, depth: 0, limit: 20, overrideAccess: true })).docs : []
  return (ctx.family.members ?? []).map((m) => {
    const p = parents.find((x) => x.id === idOf(m.parent))
    return { id: idOf(m.parent), name: p?.name ?? 'Anggota', email: p?.email ?? '', role: m.role as MemberRole, self: idOf(m.parent) === ctx.parent.id }
  })
}

export async function pendingInvites(ctx: Ctx) {
  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'familyInvites',
    where: { and: [{ family: { equals: ctx.family.id } }, { usedAt: { exists: false } }, { expiresAt: { greater_than: new Date().toISOString() } }] },
    sort: '-createdAt', depth: 0, limit: 10, overrideAccess: false, user: ctx.parent,
  })
  const origin = await appOrigin()
  return res.docs.map((i) => ({ id: i.id, role: i.role, email: i.email ?? null, expiresAt: i.expiresAt, url: `${origin}/gabung/${i.token}` }))
}

export async function createInvite(ctx: Ctx, role: 'parent' | 'caregiver', email?: string) {
  const payload = await payloadClient()
  const token = randomBytes(18).toString('base64url')
  await payload.create({
    collection: 'familyInvites',
    overrideAccess: true,
    data: { family: ctx.family.id, token, role, email: email || null, createdBy: ctx.parent.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 86400_000).toISOString() },
  })
  const url = `${await appOrigin()}/gabung/${token}`
  if (email) {
    await payload
      .sendEmail({
        from: `"${payload.email.defaultFromName}" <${payload.email.defaultFromAddress}>`,
        to: email,
        subject: `${ctx.parent.name} mengajak Anda bergabung di ${ctx.family.name} · Pohon Baik`,
        html: inviteEmailHtml(ctx.parent.name, ctx.family.name, url),
      })
      .catch((e) => console.warn('[undangan] email gagal dikirim', e))
    if (process.env.NODE_ENV !== 'production') console.info(`[undangan] Tautan untuk ${email}: ${url}`)
  }
  return url
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const inviteEmailHtml = (who: string, fam: string, url: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#171a17">
  <p>Assalamu'alaikum,</p>
  <p><b>${esc(who)}</b> mengajak Anda mendampingi anak-anak bersama di <b>${esc(fam)}</b> lewat aplikasi Pohon Baik.</p>
  <p><a href="${url}" style="display:inline-block;background:#2b6e48;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Gabung ke keluarga</a></p>
  <p style="color:#5c625b;font-size:14px">Tautan berlaku ${INVITE_DAYS} hari dan hanya bisa dipakai sekali. Bila Anda tidak mengenal pengirimnya, abaikan email ini.</p>
</div>`

/** Undangan yang masih berlaku, beserta nama keluarga dan pengundang. */
export async function findInvite(token: string) {
  if (!/^[\w-]{10,64}$/.test(token)) return null
  const payload = await payloadClient()
  const inv = (await payload.find({ collection: 'familyInvites', where: { token: { equals: token } }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as FamilyInvite | undefined
  if (!inv || inv.usedAt || new Date(inv.expiresAt) < new Date()) return null
  const family = await payload.findByID({ collection: 'families', id: idOf(inv.family), depth: 0, overrideAccess: true }).catch(() => null)
  if (!family) return null
  const inviter = inv.createdBy ? await payload.findByID({ collection: 'parents', id: idOf(inv.createdBy), depth: 0, overrideAccess: true }).catch(() => null) : null
  return { invite: inv, family, inviterName: inviter?.name ?? 'Anggota keluarga' }
}

/**
 * Masukkan orang tua ke keluarga pengundang. Bila ia sudah punya keluarga sendiri yang masih kosong
 * (tanpa anak, satu-satunya anggota), keluarga kosong itu dihapus. Bila keluarganya sudah berisi, ditolak
 * agar data anak tidak tercampur.
 */
export async function acceptInvite(parentId: string, token: string): Promise<{ error?: string }> {
  const found = await findInvite(token)
  if (!found) return { error: 'Undangan sudah tidak berlaku. Minta tautan baru ke anggota keluarga.' }
  const { invite, family } = found
  const payload = await payloadClient()
  if ((family.members ?? []).some((m) => idOf(m.parent) === parentId)) return {}

  const own = await payload.find({ collection: 'families', where: { 'members.parent': { equals: parentId } }, depth: 0, limit: 5, overrideAccess: true })
  for (const f of own.docs) {
    const kids = await payload.count({ collection: 'children', where: { family: { equals: f.id } }, overrideAccess: true })
    if (kids.totalDocs > 0 || (f.members ?? []).length > 1) return { error: `Akun ini sudah terhubung dengan ${f.name} yang berisi data anak. Masuk dengan akun lain, atau hubungi kami untuk menggabungkan.` }
  }
  for (const f of own.docs) await payload.delete({ collection: 'families', id: f.id, overrideAccess: true })

  await payload.update({
    collection: 'families',
    id: family.id,
    overrideAccess: true,
    data: { members: [...(family.members ?? []).map((m) => ({ parent: idOf(m.parent), role: m.role })), { parent: parentId, role: invite.role }] },
  })
  await payload.update({ collection: 'familyInvites', id: invite.id, overrideAccess: true, data: { usedBy: parentId, usedAt: new Date().toISOString() } })
  return {}
}

/** Pemilik mengeluarkan anggota lain (pemilik sendiri tidak bisa dikeluarkan). */
export async function removeMember(ctx: Ctx, memberId: string): Promise<{ error?: string }> {
  const me = (ctx.family.members ?? []).find((m) => idOf(m.parent) === ctx.parent.id)
  if (me?.role !== 'owner') return { error: 'Hanya pemilik keluarga yang bisa mengeluarkan anggota.' }
  if (memberId === ctx.parent.id) return { error: 'Pemilik tidak bisa mengeluarkan dirinya sendiri.' }
  const payload = await payloadClient()
  await payload.update({
    collection: 'families',
    id: ctx.family.id,
    overrideAccess: true,
    data: { members: (ctx.family.members ?? []).filter((m) => idOf(m.parent) !== memberId).map((m) => ({ parent: idOf(m.parent), role: m.role })) },
  })
  // Perangkat anggota yang dikeluarkan berhenti menerima pengingat keluarga ini.
  await payload.delete({ collection: 'pushSubscriptions', where: { and: [{ parent: { equals: memberId } }, { family: { equals: ctx.family.id } }] }, overrideAccess: true })
  return {}
}
