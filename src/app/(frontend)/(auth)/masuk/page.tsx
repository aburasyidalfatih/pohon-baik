import { redirect } from 'next/navigation'
import { getParent } from '@/lib/server/payload'
import { AuthShell } from '../auth-shell'
import { SignInForm } from '../forms'

export const metadata = { title: 'Masuk' }

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ keluar?: string; sandi?: string }> }) {
  if (await getParent()) redirect('/hari-ini')
  const { keluar, sandi } = await searchParams
  const notice =
    sandi !== undefined
      ? { tone: 'success' as const, text: 'Kata sandi baru tersimpan. Silakan masuk.' }
      : keluar !== undefined
        ? { tone: 'info' as const, text: 'Anda sudah keluar dan data di HP ini sudah dibersihkan.' }
        : undefined
  return (
    <AuthShell back={{ href: '/', label: 'Beranda' }} title="Masuk" subtitle="Lanjutkan perjalanan keluarga Anda.">
      <SignInForm notice={notice} />
    </AuthShell>
  )
}
