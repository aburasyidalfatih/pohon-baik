'use client'

import { useState } from 'react'
import { Sheet } from '@/components/pb/shell'
import { Button } from '@/components/ui/primitives'

export function SheetDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button block onClick={() => setOpen(true)}>Buka bottom sheet</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Contoh sheet">
        <p className="text-ink-2">Sheet dipakai untuk detail tugas, tambah setoran, dan catat momen.</p>
        <Button variant="primary" block className="mt-3" onClick={() => setOpen(false)}>Tutup</Button>
      </Sheet>
    </>
  )
}
