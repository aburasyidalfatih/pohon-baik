import Link from 'next/link'
import { buttonVariants } from '@/components/ui/primitives'
import { findInvite } from '@/lib/server/invites'
import { getParent } from '@/lib/server/payload'
import { AuthShell } from '../../auth-shell'
import { JoinAsCurrentForm, SignUpJoinForm } from './forms'

export const metadata = { title: 'Gabung ke keluarga' }
export const dynamic = 'force-dynamic'

export default async function GabungPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [found, parent] = await Promise.all([findInvite(token), getParent()])

  if (!found) {
    return (
      <AuthShell back={{ href: '/', label: 'Beranda' }} title="Undangan tidak berlaku" subtitle="Tautan ini sudah dipakai, dibatalkan, atau lewat 7 hari.">
        <p className="text-[0.9375rem] text-ink-2">Minta anggota keluarga Anda membuat undangan baru dari menu Keluarga → Anggota keluarga.</p>
        <Link href="/" className={buttonVariants({ variant: 'primary', block: true, className: 'mt-5' })}>Ke beranda</Link>
      </AuthShell>
    )
  }

  const role = found.invite.role === 'caregiver' ? 'pengasuh' : 'orang tua'
  return (
    <AuthShell
      back={{ href: '/', label: 'Beranda' }}
      title={`Gabung ke ${found.family.name}`}
      subtitle={<><b>{found.inviterName}</b> mengajak Anda sebagai {role}. Anda akan melihat dan mencatat tugas, hafalan, dan momen anak bersama.</>}
    >
      {parent ? <JoinAsCurrentForm token={token} name={parent.name} email={parent.email} /> : <SignUpJoinForm token={token} />}
    </AuthShell>
  )
}
