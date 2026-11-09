import { redirect } from 'next/navigation'
import { getFamily, getParent } from '@/lib/server/payload'
import { AuthShell } from '../auth-shell'
import { NewFamilyForm } from './form'

export const metadata = { title: 'Keluarga baru' }
export const dynamic = 'force-dynamic'

export default async function KeluargaBaruPage() {
  const parent = await getParent()
  if (!parent) redirect('/masuk')
  if (await getFamily()) redirect('/hari-ini')
  return (
    <AuthShell back={{ href: '/', label: 'Beranda' }} title="Belum ada keluarga" subtitle={<>Akun <b>{parent.email}</b> belum tergabung di keluarga mana pun.</>}>
      <p className="mb-2 text-[0.9375rem] text-ink-2">Bila pasangan Anda sudah memakai Pohon Baik, minta tautan undangan dari menu Keluarga → Anggota keluarga. Atau buat keluarga baru di sini.</p>
      <NewFamilyForm />
    </AuthShell>
  )
}
