import { Skeleton } from '@/components/ui/primitives'

// Kerangka layar (loading.tsx) per tab: bentuknya meniru tata letak asli agar perpindahan terasa instan.
const Title = ({ sub = true }: { sub?: boolean }) => (
  <div className="mb-4">
    <Skeleton className="mt-1.5 h-9 w-44 rounded-xl" />
    {sub && <Skeleton className="mt-2.5 h-4 w-60" />}
  </div>
)
const CardRow = ({ h = 'h-20' }: { h?: string }) => <Skeleton className={`my-3 ${h} rounded-card`} />
const Pills = ({ n = 3 }: { n?: number }) => (
  <div className="mb-3 flex gap-2">
    {Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-10 w-24 rounded-full" />)}
  </div>
)

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Memuat ${label}`}>
      {children}
      <span className="sr-only">Memuat {label}…</span>
    </div>
  )
}

export function HariIniSkeleton() {
  return (
    <Shell label="Hari ini">
      <Title />
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-[58px] rounded-[14px]" />)}
      </div>
      <Skeleton className="my-3 h-[131px] rounded-card" />
      <CardRow h="h-[70px]" />
      <Skeleton className="my-2.5 h-8 w-64 rounded-full" />
      <Pills n={3} />
      <CardRow h="h-[220px]" />
      <CardRow h="h-[72px]" />
    </Shell>
  )
}

export function TemaSkeleton() {
  return (
    <Shell label="Tema">
      <Title />
      <Skeleton className="my-3 h-[150px] rounded-card" />
      <Pills n={4} />
      <CardRow h="h-36" />
      <CardRow h="h-36" />
    </Shell>
  )
}

export function QuranSkeleton() {
  return (
    <Shell label="Qur'an">
      <Title />
      <Pills n={2} />
      <div className="my-3 grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[74px] rounded-card" />)}
      </div>
      <CardRow h="h-16" />
      <CardRow h="h-24" />
      <Skeleton className="my-3 h-12 rounded-[14px]" />
    </Shell>
  )
}

export function AnakSkeleton() {
  return (
    <Shell label="Anakku">
      <Title />
      <Pills n={2} />
      <Skeleton className="my-3 h-12 rounded-[14px]" />
      <CardRow h="h-36" />
      <CardRow h="h-28" />
      <CardRow h="h-28" />
    </Shell>
  )
}

export function KeluargaSkeleton() {
  return (
    <Shell label="Keluarga">
      <Title />
      <Skeleton className="mx-1 mt-5 mb-2 h-4 w-20" />
      <CardRow h="h-[136px]" />
      <Skeleton className="mx-1 mt-5 mb-2 h-4 w-28" />
      <CardRow h="h-72" />
    </Shell>
  )
}
