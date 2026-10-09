import Link from 'next/link'
import { buttonVariants } from '@/components/ui/primitives'
import { AuthShell } from '../auth-shell'
import { Notice, ResetPasswordForm } from '../forms'

export const metadata = { title: 'Atur kata sandi baru', referrer: 'no-referrer' }

export default async function AturSandiPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <AuthShell back={{ href: '/masuk', label: 'Masuk' }} title="Kata sandi baru" subtitle={token ? 'Buat kata sandi baru untuk akun Anda.' : undefined}>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <Notice>Tautan tidak lengkap atau sudah tidak berlaku.</Notice>
          <Link href="/lupa-sandi" className={buttonVariants({ variant: 'primary', block: true })}>
            Minta tautan baru
          </Link>
        </>
      )}
    </AuthShell>
  )
}
