import { BookOpen, Clock, Receipt, ShieldCheck, Sprout } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/primitives'
import { PRICE_PER_CHILD_YEAR, rupiah } from '@/lib/billing/rules'
import { getParent } from '@/lib/server/payload'

const FEATURES = [
  { icon: Clock, cls: 'wk-subuh', title: 'Ritme harian mengikuti waktu shalat', text: 'Cukup buka satu layar, ikuti waktu demi waktu' },
  { icon: Sprout, cls: 'wk-hari', title: 'Kenali anak sesuai usianya', text: 'Yang ia rasakan, kemampuan, batas, dan cara menstimulasi' },
  { icon: BookOpen, cls: 'wk-maghrib', title: "Qur'an, adab, dan ilmu dalam satu tema", text: '12 surah, 12 tema, plus murajaah berjarak' },
  { icon: ShieldCheck, cls: 'bg-gold-soft text-gold-ink', title: 'Data keluarga dijaga', text: 'Tanpa iklan, patuh UU Pelindungan Data Pribadi' },
  { icon: Receipt, cls: 'bg-brand-soft text-brand', title: 'Gratis 1 bulan untuk semua anak', text: `Setelah itu ${rupiah(PRICE_PER_CHILD_YEAR)} per anak per tahun. Ada keringanan bagi yang tidak mampu` },
]

export default async function Landing() {
  if (await getParent()) redirect('/hari-ini')
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col px-[1.375rem] pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="page-enter flex-1">
        <div aria-hidden className="mt-6 mb-2 grid size-[7.5rem] place-items-center overflow-hidden rounded-[2.125rem] bg-brand-2 text-6xl shadow-float">
          🌳
        </div>
        <h1 className="mt-3.5 mb-2 text-[1.875rem] leading-tight font-bold tracking-[-0.02em]">Assalamu&apos;alaikum</h1>
        <p className="mb-4.5 text-ink-2">
          Pohon Baik menemani Ayah dan Bunda mendidik anak 0–15 tahun: akarnya iman, buahnya anak yang tangguh di segala zaman.
        </p>
        <ul>
          {FEATURES.map(({ icon: Icon, cls, title, text }) => (
            <li key={title} className="flex items-start gap-3.5 py-2.5">
              <span aria-hidden className={`grid size-[2.625rem] flex-none place-items-center rounded-[0.8125rem] ${cls}`}>
                <Icon size={20} />
              </span>
              <span>
                <b className="block">{title}</b>
                <span className="block text-[0.875rem] text-ink-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex gap-2.5">
        <Link href="/masuk" className={buttonVariants({ className: 'flex-1' })}>
          Masuk
        </Link>
        <Link href="/daftar" className={buttonVariants({ variant: 'primary', className: 'flex-[2]' })}>
          Mulai
        </Link>
      </div>
      <Link href="/privasi" className="mx-auto mt-1 inline-flex min-h-11 items-center px-2 text-[0.8125rem] text-ink-3 underline-offset-2 active:opacity-60">
        Kebijakan privasi
      </Link>
    </main>
  )
}
