'use client'

import { StatusScreen } from '@/components/pb/status-screen'
import { Button, buttonVariants } from '@/components/ui/primitives'
import '@/app/(frontend)/globals.css'

// Galat di root layout: menggantikan seluruh halaman, jadi <html>/<body> dan CSS dirender sendiri.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body>
        <StatusScreen
          emoji="🌧️"
          title="Ada yang tidak beres"
          actions={
            <>
              <Button variant="primary" block onClick={() => reset()}>Coba lagi</Button>
              {/* Router bisa ikut bermasalah di galat global, jadi pakai tautan biasa. */}
              <a href="/hari-ini" className={buttonVariants({ block: true })}>Kembali ke Hari ini</a>
            </>
          }
        >
          Maaf, aplikasi mengalami kendala. Data Anda tetap aman.
        </StatusScreen>
      </body>
    </html>
  )
}
