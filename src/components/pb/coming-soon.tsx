import { Sprout } from 'lucide-react'
import { LargeTitle } from '@/components/ui/primitives'

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <LargeTitle>{title}</LargeTitle>
      <div className="px-5 pt-10 pb-2.5 text-center">
        <div className="mx-auto mb-4 grid size-[132px] place-items-center rounded-[36px] bg-brand-soft text-brand"><Sprout size={56} /></div>
        <h2 className="mb-1.5 text-2xl font-bold tracking-[-0.01em]">Sedang ditanam</h2>
        <p className="text-ink-2">Halaman ini dipindahkan dari prototype pada Tahap 1.</p>
      </div>
    </>
  )
}
