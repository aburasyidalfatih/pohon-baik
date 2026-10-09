'use client'

import { RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/primitives'

export function RetryButton() {
  return (
    <Button variant="primary" block onClick={() => location.replace(location.pathname === '/offline' ? '/hari-ini' : location.href)}>
      <RotateCw size={18} aria-hidden /> Coba lagi
    </Button>
  )
}
