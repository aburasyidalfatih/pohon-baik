import Link from 'next/link'
import { StatusScreen } from '@/components/pb/status-screen'
import { buttonVariants } from '@/components/ui/primitives'

export const metadata = { title: 'Halaman tidak ditemukan' }

export default function NotFound() {
  return (
    <StatusScreen
      emoji="🍂"
      title="Halaman tidak ditemukan"
      actions={<Link href="/hari-ini" className={buttonVariants({ variant: 'primary', block: true })}>Kembali ke Hari ini</Link>}
    >
      Mungkin tautannya sudah lama atau salah ketik.
    </StatusScreen>
  )
}
