import type { Metadata } from 'next'
import { StatusScreen } from '@/components/pb/status-screen'
import { buttonVariants } from '@/components/ui/primitives'
import '@/app/(frontend)/globals.css'

// 404 untuk URL yang tidak cocok dengan rute mana pun (aplikasi ini punya dua root layout:
// frontend dan panel admin Payload). Dirender tanpa layout, jadi CSS diimpor sendiri.
export const metadata: Metadata = { title: 'Halaman tidak ditemukan · Pohon Baik' }

export default function GlobalNotFound() {
  return (
    <html lang="id">
      <body>
        <StatusScreen
          emoji="🍂"
          title="Halaman tidak ditemukan"
          actions={<a href="/hari-ini" className={buttonVariants({ variant: 'primary', block: true })}>Kembali ke Hari ini</a>}
        >
          Mungkin tautannya sudah lama atau salah ketik.
        </StatusScreen>
      </body>
    </html>
  )
}
