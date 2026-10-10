'use client'

import { Images } from 'lucide-react'
import { useState } from 'react'
import { haptic } from '@/components/pb/celebrate'
import { Sheet } from '@/components/pb/sheet'
import { BULAN, fmtDate } from '@/lib/format'
import { MOMENT_CATS, type Moment, type MomentCategory } from './types'

// Pertanyaan pemandu untuk mengenang bersama anak (elaborative reminiscing): ajak anak bercerita
// dan menamai perasaannya, bukan menguji ingatannya.
const ASK: Record<MomentCategory | 'target', string> = {
  target: 'Ingat waktu kamu berhasil ini? Bagian mana yang paling susah? Bagaimana rasanya setelah bisa?',
  bisa: 'Ingat waktu kamu bisa ini? Apa yang kamu lakukan sampai berhasil?',
  kata: 'Kamu pernah bilang ini. Waktu itu kita sedang apa?',
  ibadah: 'Bagaimana perasaanmu waktu itu? Siapa yang bersamamu?',
  lucu: 'Kenapa ya waktu itu lucu sekali? Siapa yang paling tertawa?',
  syukur: 'Kamu bersyukur untuk ini. Masih ingat kenapa?',
  catatan: 'Apa yang paling kamu ingat dari hari itu?',
}

type Range = { title: string; from: string; list: Moment[] }

/**
 * "Kenang bersama": rangkuman momen bulan ini dan sejak ulang tahun terakhir, untuk dibuka bersama anak
 * (misalnya saat Majelis Malam). Momen berfoto dan target tercapai tampil lebih dulu.
 */
export function KenangBersama({ moments, childName, today, lastBirthday, ageYears }: { moments: Moment[]; childName: string; today: string; lastBirthday: string; ageYears: number }) {
  const [open, setOpen] = useState<Range | null>(null)
  const [last, setLast] = useState<Range | null>(null)
  if (open && open !== last) setLast(open)
  const r = open ?? last

  const monthStart = `${today.slice(0, 7)}-01`
  const month: Range = { title: `${BULAN[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}`, from: monthStart, list: moments.filter((m) => m.date >= monthStart) }
  const year: Range = { title: ageYears ? `${childName} di usia ${ageYears} tahun` : `Tahun pertama ${childName}`, from: lastBirthday, list: moments.filter((m) => m.date >= lastBirthday) }
  const ranges = [month, year].filter((x) => x.list.length > 0)
  if (!ranges.length) return null

  const show = (x: Range) => {
    haptic(5)
    setOpen(x)
  }

  return (
    <>
      <section aria-label="Kenang bersama" className="my-3 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-gold-soft text-gold-ink"><Images size={18} /></span>
          <div className="min-w-0">
            <b className="block text-[0.9375rem]">Kenang bersama {childName}</b>
            <span className="block text-[0.8125rem] text-ink-2">Buka berdua, biarkan ia bercerita lagi</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ranges.map((x) => (
            <button key={x.title} type="button" onClick={() => show(x)} className="pressable rounded-full bg-fill px-3.5 py-2 text-[0.875rem] font-semibold text-ink">
              {x.title} <span className="font-normal text-ink-2">· {x.list.length} momen</span>
            </button>
          ))}
        </div>
      </section>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={r?.title ?? ''}>
        {r && <KenangBody range={r} childName={childName} today={today} />}
      </Sheet>
    </>
  )
}

function KenangBody({ range, childName, today }: { range: Range; childName: string; today: string }) {
  const counts = MOMENT_CATS.map((c) => ({ ...c, n: range.list.filter((m) => m.category === c.key).length })).filter((c) => c.n)
  const targets = range.list.filter((m) => m.source === 'target').length
  // Yang paling layak dikenang lebih dulu: target tercapai, lalu yang berfoto, lalu sisanya (terbaru dulu).
  const rank = (m: Moment) => (m.source === 'target' ? 0 : m.photo ? 1 : 2)
  const list = [...range.list].sort((a, b) => rank(a) - rank(b) || b.date.localeCompare(a.date))

  return (
    <div className="pb-2">
      <p className="text-[0.8125rem] text-ink-2">{fmtDate(range.from)} – {fmtDate(today)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {targets > 0 && <span className="rounded-md bg-gold-soft px-2 py-0.5 text-[0.8125rem] font-semibold text-gold-ink"><span aria-hidden>🏅</span> {targets} target tercapai</span>}
        {counts.map((c) => (
          <span key={c.key} className="rounded-md bg-fill px-2 py-0.5 text-[0.8125rem] font-semibold text-ink-2"><span aria-hidden>{c.emoji}</span> {c.n} {c.label.toLowerCase()}</span>
        ))}
      </div>
      <p className="mt-3 rounded-tile bg-brand-soft px-3.5 py-3 text-[0.875rem] text-brand-ink">
        Bacakan satu momen, lalu tanyakan pertanyaannya. Dengarkan cerita {childName}, sebut perasaannya, dan puji usahanya. Tidak perlu semua dibaca sekaligus.
      </p>
      <ol className="mt-3 space-y-3">
        {list.map((m) => {
          const cat = MOMENT_CATS.find((c) => c.key === m.category) ?? MOMENT_CATS[MOMENT_CATS.length - 1]
          return (
            <li key={m.id} className="rounded-card bg-surface-2 p-3.5">
              <p className="text-[0.75rem] font-semibold text-ink-3"><span aria-hidden>{m.source === 'target' ? '🏅' : cat.emoji}</span> {fmtDate(m.date)}</p>
              {m.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- berkas privat lewat endpoint ber-cookie
                <img src={m.photo.thumb} alt={`Foto momen ${fmtDate(m.date)}`} loading="lazy" className="mt-2 max-h-64 w-full rounded-tile object-cover" />
              )}
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">{m.text}</p>
              {m.effort && <p className="mt-1 text-[0.875rem] text-gold-ink"><b>Usahanya:</b> {m.effort}</p>}
              <p className="mt-2 border-t border-line pt-2 text-[0.875rem] text-ink-2"><b className="text-ink">Tanyakan:</b> {ASK[m.source === 'target' ? 'target' : m.category]}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
