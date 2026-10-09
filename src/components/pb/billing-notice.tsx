import { Lock, Clock } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/primitives'
import { rupiah } from '@/lib/billing/rules'
import { cn } from '@/lib/utils'

const names = (n: string[]) => (n.length <= 2 ? n.join(' dan ') : `${n.slice(0, -1).join(', ')}, dan ${n[n.length - 1]}`)

/** Kartu "langganan belum aktif" untuk anak yang terkunci. */
export function LockedNotice({ kids, price, what = 'Tugas hariannya', className }: { kids: string[]; price: number; what?: string; className?: string }) {
  if (!kids.length) return null
  return (
    <div className={cn('my-3 flex items-start gap-3 rounded-card bg-surface p-4 shadow-card', className)}>
      <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-gold-soft text-gold-ink"><Lock size={18} /></span>
      <div className="min-w-0 flex-1">
        <b className="block text-[0.9375rem]">Langganan {names(kids)} belum aktif</b>
        <p className="mt-0.5 text-[0.8125rem] text-ink-2">{what} disembunyikan sampai diaktifkan. Data yang sudah dicatat tetap aman.</p>
        <Link href="/langganan" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'mt-2.5')}>Aktifkan · {rupiah(price)}/anak/tahun</Link>
      </div>
    </div>
  )
}

/** Pengingat lembut beberapa hari sebelum masa coba/masa aktif berakhir (tanpa hitung mundur yang menekan). */
export function RemindNotice({ remind, price }: { remind: { kind: 'trial' | 'renew'; daysLeft: number; names: string[] } | null; price: number }) {
  if (!remind) return null
  const when = remind.daysLeft <= 1 ? 'hari ini' : `${remind.daysLeft} hari lagi`
  return (
    <Link href="/langganan" className="pressable my-3 flex items-center gap-3 rounded-card bg-gold-soft px-4 py-3 text-gold-ink">
      <Clock size={18} className="flex-none" aria-hidden />
      <span className="min-w-0 flex-1 text-[0.875rem]">
        {remind.kind === 'trial' ? <>Masa coba gratis berakhir <b>{when}</b>. Lanjutkan dengan {rupiah(price)} per anak per tahun.</> : <>Langganan {names(remind.names)} berakhir <b>{when}</b>. Perpanjang {rupiah(price)} per anak per tahun.</>}
      </span>
      <span className="flex-none text-sm font-semibold underline">Lihat</span>
    </Link>
  )
}
