import { redirect } from 'next/navigation'
import { getFamily, getParent } from '@/lib/server/payload'
import { AuthShell } from '../auth-shell'
import { SignInForm } from '../forms'

export const metadata = { title: 'Masuk' }

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ keluar?: string; sandi?: string; lanjut?: string }> }) {
  const { keluar, sandi, lanjut } = await searchParams
  const next = lanjut && /^\/gabung\/[\w-]{10,64}$/.test(lanjut) ? lanjut : undefined
  if (await getParent()) {
    // Sudah masuk tetapi belum tergabung di keluarga mana pun (mis. dikeluarkan anggota lain): buat atau gabung keluarga.
    redirect(next ?? ((await getFamily()) ? '/hari-ini' : '/keluarga-baru'))
  }
  const notice =
    sandi !== undefined
      ? { tone: 'success' as const, text: 'Kata sandi baru tersimpan. Silakan masuk.' }
      : keluar !== undefined
        ? { tone: 'info' as const, text: 'Anda sudah keluar dan data di HP ini sudah dibersihkan.' }
        : undefined
  return (
    <AuthShell back={{ href: '/', label: 'Beranda' }} title="Masuk" subtitle="Lanjutkan perjalanan keluarga Anda.">
      <SignInForm notice={next ? { tone: 'info', text: 'Masuk dulu, lalu Anda langsung bergabung ke keluarga yang mengundang.' } : notice} next={next} />
    </AuthShell>
  )
}
