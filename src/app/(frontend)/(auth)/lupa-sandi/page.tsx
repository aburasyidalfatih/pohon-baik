import { redirect } from 'next/navigation'
import { getParent } from '@/lib/server/payload'
import { AuthShell } from '../auth-shell'
import { ForgotPasswordForm } from '../forms'

export const metadata = { title: 'Lupa kata sandi' }

export default async function LupaSandiPage() {
  if (await getParent()) redirect('/hari-ini')
  return (
    <AuthShell back={{ href: '/masuk', label: 'Masuk' }} title="Lupa kata sandi" subtitle="Tulis email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.">
      <ForgotPasswordForm />
    </AuthShell>
  )
}
