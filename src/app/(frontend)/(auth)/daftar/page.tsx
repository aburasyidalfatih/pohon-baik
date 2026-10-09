import { redirect } from 'next/navigation'
import { localNow } from '@/lib/curriculum/core'
import { getParent } from '@/lib/server/payload'
import { AuthShell } from '../auth-shell'
import { SignUpWizard } from './onboarding'

export const metadata = { title: 'Daftar' }

export default async function DaftarPage() {
  if (await getParent()) redirect('/hari-ini')
  return (
    <AuthShell back={{ href: '/', label: 'Beranda' }} title="Keluarga baru" subtitle="Tiga langkah singkat, lalu Pohon Baik siap menemani.">
      <SignUpWizard today={localNow(7).date} />
    </AuthShell>
  )
}
