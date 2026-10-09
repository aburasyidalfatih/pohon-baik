import { StatusScreen } from '@/components/pb/status-screen'
import { RetryButton } from './retry'

// Halaman statis yang disimpan service worker; tampil saat aplikasi dibuka tanpa sinyal.
// Sengaja tanpa data keluarga (privasi): tidak ada informasi pribadi yang disimpan di HP.
export const dynamic = 'force-static'
export const metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <StatusScreen
      emoji="🌙"
      title="Sedang tidak tersambung"
      actions={<RetryButton />}
    >
      Pohon Baik butuh internet untuk memuat tugas hari ini. Periksa sinyal atau Wi-Fi, lalu coba lagi. Centang yang sempat dibuat akan terkirim otomatis saat tersambung.
    </StatusScreen>
  )
}
