'use client'

import { Copy, Share2, UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { useConfirm, useToast } from '@/components/pb/feedback'
import { Sheet } from '@/components/pb/sheet'
import { Segmented } from '@/components/pb/ui'
import { Button, Field, FieldGroup, Input, SectionLabel } from '@/components/ui/primitives'
import { fmtShort } from '@/lib/format'
import { inviteMember, kickMember, revokeInvite } from './actions'

export type Member = { id: string; name: string; email: string; role: 'owner' | 'parent' | 'caregiver'; self: boolean }
export type Invite = { id: string; role: string; email: string | null; expiresAt: string; url: string }

const ROLE: Record<string, string> = { owner: 'Pemilik', parent: 'Orang tua', caregiver: 'Pengasuh' }

/** Anggota keluarga + undang pasangan/pengasuh lewat tautan sekali pakai (berlaku 7 hari). */
export function MembersSection({ members, invites, familyName }: { members: Member[]; invites: Invite[]; familyName: string }) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const owner = members.find((m) => m.self)?.role === 'owner'
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<'parent' | 'caregiver'>('parent')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [busy, start] = useTransition()

  const rowCls = 'flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0'
  const shareText = (url: string) => `Assalamu'alaikum. Yuk dampingi anak-anak bersama di ${familyName} lewat Pohon Baik: ${url}`

  function create() {
    start(async () => {
      const r = await inviteMember(role, email)
      if (r.error || !r.url) return toast(r.error ?? 'Undangan belum bisa dibuat.', { variant: 'error' })
      setLink(r.url)
      haptic(10)
      if (email.trim()) toast(`Undangan juga dikirim ke ${email.trim()}`, { variant: 'success' })
      router.refresh()
    })
  }

  async function share(url: string) {
    const text = shareText(url)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Undangan Pohon Baik', text })
        return
      } catch {
        // dibatalkan: jatuh ke salin
      }
    }
    await navigator.clipboard?.writeText(text).catch(() => {})
    toast('Tautan undangan disalin', { variant: 'success' })
  }

  async function kick(m: Member) {
    const ok = await confirm({ title: `Keluarkan ${m.name}?`, message: 'Ia tidak bisa lagi melihat data keluarga ini. Data yang ia catat tetap ada.', confirmLabel: 'Keluarkan', danger: true })
    if (!ok) return
    start(async () => {
      const r = await kickMember(m.id)
      if (r.error) return toast(r.error, { variant: 'error' })
      toast(`${m.name} sudah dikeluarkan`, { variant: 'success' })
      router.refresh()
    })
  }

  return (
    <>
      <SectionLabel>Anggota keluarga</SectionLabel>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        {members.map((m) => (
          <div key={m.id} className={rowCls}>
            <span className="min-w-0">
              <b className="block truncate text-[0.9375rem]">{m.name}{m.self && <span className="font-normal text-ink-2"> (Anda)</span>}</b>
              <span className="block truncate text-[0.8125rem] text-ink-2">{ROLE[m.role]} · {m.email}</span>
            </span>
            {owner && !m.self && (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => kick(m)}>Keluarkan</Button>
            )}
          </div>
        ))}
        {invites.map((i) => (
          <div key={i.id} className={rowCls}>
            <span className="min-w-0">
              <b className="block truncate text-[0.9375rem] text-ink-2">Undangan {ROLE[i.role]?.toLowerCase()}{i.email ? ` · ${i.email}` : ''}</b>
              <span className="block text-[0.8125rem] text-ink-3">Menunggu · berlaku sampai {fmtShort(i.expiresAt.slice(0, 10))}</span>
            </span>
            <span className="flex flex-none">
              <Button variant="default" size="icon" aria-label="Bagikan tautan undangan" onClick={() => share(i.url)}><Share2 size={17} aria-hidden /></Button>
              <Button variant="default" size="icon" aria-label="Batalkan undangan" className="ml-1" disabled={busy} onClick={() => start(async () => { await revokeInvite(i.id); router.refresh() })}><X size={17} aria-hidden /></Button>
            </span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { setLink(null); setEmail(''); setOpen(true) }}
          className="pressable flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-semibold text-brand-2"
        >
          <span aria-hidden className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand"><UserPlus size={19} /></span>
          <span className="text-[0.9375rem]">Undang pasangan atau pengasuh</span>
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={link ? 'Tautan undangan siap' : 'Undang ke keluarga'}
        footer={link ? (
          <div className="grid gap-2">
            <Button variant="primary" block onClick={() => share(link)}><Share2 size={18} aria-hidden /> Bagikan (WhatsApp, dll.)</Button>
            <Button variant="default" block onClick={async () => { await navigator.clipboard?.writeText(link).catch(() => {}); toast('Tautan disalin', { variant: 'success' }) }}><Copy size={17} aria-hidden /> Salin tautan</Button>
          </div>
        ) : (
          <Button variant="primary" block disabled={busy} aria-busy={busy} onClick={create}>{busy ? 'Membuat…' : 'Buat tautan undangan'}</Button>
        )}
      >
        {link ? (
          <>
            <p className="text-[0.9375rem] text-ink-2">Kirim tautan ini ke {role === 'parent' ? 'pasangan Anda' : 'pengasuh'}. Berlaku 7 hari dan hanya bisa dipakai sekali.</p>
            <p className="mt-3 rounded-tile bg-surface-2 px-3.5 py-3 text-[0.875rem] break-all">{link}</p>
          </>
        ) : (
          <>
            <p className="text-[0.9375rem] text-ink-2">Anggota yang diundang bisa melihat dan mencatat semua data anak di keluarga ini, termasuk foto momen.</p>
            <FieldGroup label="Sebagai">
              <Segmented<'parent' | 'caregiver'> label="Peran" value={role} onChange={setRole} options={[{ value: 'parent', label: 'Orang tua' }, { value: 'caregiver', label: 'Pengasuh' }]} />
            </FieldGroup>
            <Field label="Email (opsional, undangan ikut dikirim ke email)" id="inv-email">
              <Input id="inv-email" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            </Field>
          </>
        )}
      </Sheet>
    </>
  )
}
