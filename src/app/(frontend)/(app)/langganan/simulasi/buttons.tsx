'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useToast } from '@/components/pb/feedback'
import { Button } from '@/components/ui/primitives'
import { simulatePayment } from '../actions'

export function SimulasiButtons({ orderId }: { orderId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [busy, start] = useTransition()
  const run = (outcome: 'paid' | 'failed') =>
    start(async () => {
      const r = await simulatePayment(orderId, outcome)
      if (r.error || !r.url) return toast(r.error ?? 'Gagal', { variant: 'error' })
      router.replace(r.url)
    })
  return (
    <div className="mt-3 grid gap-2">
      <Button variant="primary" block disabled={busy} onClick={() => run('paid')}>Bayar berhasil</Button>
      <Button variant="danger" block disabled={busy} onClick={() => run('failed')}>Bayar gagal</Button>
    </div>
  )
}
