'use client'

import { Check, Clock, HeartHandshake, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/components/pb/feedback'
import { Sheet } from '@/components/pb/sheet'
import { kidColor, PageHeader } from '@/components/pb/ui'
import { Button, Card, Field, SectionLabel, Textarea } from '@/components/ui/primitives'
import { rupiah } from '@/lib/billing/rules'
import { fmtDate } from '@/lib/format'
import type { Billing, ChildAccess } from '@/lib/server/billing'
import { cn } from '@/lib/utils'
import { askWaiver, startCheckout } from './actions'

type OrderRow = { orderId: string; createdAt: string; amount: number; status: string; names: string[]; paymentUrl: string | null }

const shortDate = (iso: string) => fmtDate(iso).split(', ')[1]
const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', paid: 'Lunas', failed: 'Gagal', expired: 'Kedaluwarsa', refunded: 'Dikembalikan' }

function statusLine(c: ChildAccess) {
  if (c.status === 'paid') return `Aktif sampai ${shortDate(c.until!)}`
  if (c.status === 'waiver') return `Keringanan sampai ${shortDate(c.until!)}`
  if (c.status === 'trial') return `Masa coba gratis sampai ${shortDate(c.until!)}`
  return 'Belum aktif'
}

export function LanggananView({ billing: b, orders, returned }: { billing: Billing; orders: OrderRow[]; returned: { status: string; names: string[] } | null }) {
  const router = useRouter()
  const toast = useToast()
  const [picked, setPicked] = useState<string[]>(() => b.children.filter((c) => c.needsPayment && c.status !== 'waiver').map((c) => c.id))
  const [paying, startPaying] = useTransition()
  const [waiverOpen, setWaiverOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, startSending] = useTransition()

  const total = picked.length * b.price
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  function pay() {
    startPaying(async () => {
      const r = await startCheckout(picked)
      if (r.error || !r.url) return toast(r.error ?? 'Pembayaran belum bisa dimulai.', { variant: 'error' })
      if (r.url.startsWith('/')) router.push(r.url)
      else window.location.assign(r.url)
    })
  }

  function sendWaiver() {
    startSending(async () => {
      const r = await askWaiver(reason)
      if (r.error) return toast(r.error, { variant: 'error' })
      setWaiverOpen(false)
      toast('Permohonan terkirim. Kami kabari lewat aplikasi.', { variant: 'success' })
      router.refresh()
    })
  }

  const inTrial = b.trialDaysLeft > 0
  return (
    <>
      <PageHeader title="Langganan" subtitle={`Gratis 1 bulan, lalu ${rupiah(b.price)} per anak per tahun`} />

      {returned?.status === 'paid' && (
        <Card tone="tint" role="status" className="flex items-start gap-3">
          <Check size={20} className="mt-0.5 flex-none text-brand" aria-hidden />
          <p className="text-[0.9375rem] text-brand-ink"><b>Alhamdulillah, pembayaran diterima.</b> Langganan {returned.names.join(', ')} sudah aktif. Terima kasih telah mendukung Pohon Baik.</p>
        </Card>
      )}
      {returned?.status === 'pending' && (
        <Card tone="gold" role="status" className="flex items-start gap-3">
          <Clock size={20} className="mt-0.5 flex-none text-gold-ink" aria-hidden />
          <p className="text-[0.9375rem] text-gold-ink">Menunggu pembayaran. Bila sudah membayar, status berubah dalam beberapa saat. <button type="button" className="font-semibold underline" onClick={() => router.refresh()}>Muat ulang</button></p>
        </Card>
      )}
      {(returned?.status === 'failed' || returned?.status === 'expired') && (
        <Card tone="warn" role="status"><p className="text-[0.9375rem]">Pembayaran belum berhasil. Silakan coba lagi.</p></Card>
      )}

      {/* ringkasan masa coba */}
      <Card className="flex items-center gap-3.5">
        <span aria-hidden className="grid size-11 flex-none place-items-center rounded-tile bg-brand-soft text-brand"><Clock size={20} /></span>
        <div className="min-w-0">
          {b.trialEndsAt ? (
            inTrial ? (
              <><b className="block">Masa coba gratis: {b.trialDaysLeft} hari lagi</b><span className="text-sm text-ink-2">Semua fitur terbuka sampai {fmtDate(b.trialEndsAt)}.</span></>
            ) : b.locked.length ? (
              <><b className="block">Masa coba gratis sudah selesai</b><span className="text-sm text-ink-2">Berakhir {fmtDate(b.trialEndsAt)}. Aktifkan anak di bawah untuk melanjutkan.</span></>
            ) : (
              <><b className="block">Semua anak aktif</b><span className="text-sm text-ink-2">Masa coba gratis berakhir {fmtDate(b.trialEndsAt)}. Perpanjangan bisa dibayar 30 hari sebelum masa aktif habis.</span></>
            )
          ) : (
            <b className="block">Aktifkan langganan anak di bawah</b>
          )}
        </div>
      </Card>

      <SectionLabel>Pilih anak</SectionLabel>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        {!b.children.length && <p className="px-4 py-3 text-sm text-ink-2">Belum ada anak terdaftar. Tambahkan dari menu Keluarga.</p>}
        {b.children.map((c, i) => {
          const on = picked.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(c.id)}
              className="pressable flex min-h-16 w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0"
            >
              <span aria-hidden className="grid size-10 flex-none place-items-center rounded-full font-bold text-white" style={{ background: kidColor(i) }}>{c.name.charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem]">{c.name}</b>
                <span className={cn('block text-[0.8125rem]', c.status === 'locked' ? 'font-semibold text-danger' : 'text-ink-2')}>{statusLine(c)}</span>
              </span>
              <span className="flex-none text-sm text-ink-2 tabular-nums">{rupiah(b.price)}</span>
              <span aria-hidden className="chk" data-on={on} />
            </button>
          )
        })}
      </div>

      {b.children.length > 0 && (
        <div className="mt-3">
          <Button variant="primary" block disabled={!picked.length || paying || !b.canPay} aria-busy={paying} onClick={pay}>
            {paying ? 'Membuka halaman bayar…' : picked.length ? `Bayar ${rupiah(total)} · ${picked.length} anak, 1 tahun` : 'Pilih anak yang akan diaktifkan'}
          </Button>
          {!b.canPay && <p role="alert" className="mt-2 text-center text-sm text-danger">Pembayaran belum tersedia. Hubungi tim Pohon Baik.</p>}
          <p className="mt-2 px-1 text-[0.8125rem] text-ink-3">
            Bayar dengan QRIS, e-wallet, atau transfer bank di halaman Midtrans. Masa aktif 1 tahun dihitung setelah masa coba atau masa aktif sebelumnya berakhir, jadi membayar lebih awal tidak memotong masa coba.
          </p>
        </div>
      )}

      <SectionLabel>Selalu terbuka tanpa langganan</SectionLabel>
      <Card className="flex items-start gap-3.5">
        <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-brand-soft text-brand"><ShieldCheck size={18} /></span>
        <ul className="list-disc pl-4 text-[0.9375rem] text-ink-2 [&_li]:my-0.5">
          <li>Tanda perlu konsultasi dan info keselamatan anak</li>
          <li>Majelis Malam dan rencana Tema keluarga</li>
          <li>Unduh cadangan semua data keluarga</li>
        </ul>
      </Card>

      <SectionLabel>Keringanan biaya</SectionLabel>
      <Card className="flex items-start gap-3.5">
        <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-gold-soft text-gold-ink"><HeartHandshake size={18} /></span>
        <div className="min-w-0 flex-1 text-[0.9375rem]">
          {b.waiver.status === 'approved' && b.waiver.until && b.waiver.until >= b.today ? (
            <p><b>Keringanan aktif</b> sampai {fmtDate(b.waiver.until)}. Semua anak bisa dipakai tanpa biaya.</p>
          ) : b.waiver.status === 'requested' ? (
            <p><b>Permohonan sedang ditinjau.</b> Biasanya selesai dalam 1–2 hari kerja.</p>
          ) : (
            <>
              <p className="text-ink-2">{b.waiver.status === 'rejected' ? 'Permohonan sebelumnya belum bisa disetujui. Anda boleh mengajukan lagi.' : 'Sedang tidak mampu membayar? Ajukan keringanan. Tidak perlu bukti apa pun.'}</p>
              <Button variant="soft" size="sm" className="mt-2" onClick={() => setWaiverOpen(true)}>Ajukan keringanan</Button>
            </>
          )}
        </div>
      </Card>

      {orders.length > 0 && (
        <>
          <SectionLabel>Riwayat pembayaran</SectionLabel>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {orders.map((o) => (
              <div key={o.orderId} className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <span className="min-w-0">
                  <b className="block truncate text-[0.9375rem]">{o.names.join(', ')}</b>
                  <span className="block text-[0.8125rem] text-ink-2">{shortDate(o.createdAt.slice(0, 10))} · {rupiah(o.amount)}</span>
                </span>
                {o.paymentUrl ? (
                  <a href={o.paymentUrl} className="flex-none text-sm font-semibold text-brand-2">Lanjutkan bayar</a>
                ) : (
                  <span className={cn('flex-none rounded-md px-2 py-0.5 text-[0.75rem] font-semibold', o.status === 'paid' ? 'bg-brand-soft text-brand' : 'bg-fill text-ink-2')}>{STATUS_LABEL[o.status] ?? o.status}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={waiverOpen}
        onClose={() => setWaiverOpen(false)}
        title="Ajukan keringanan"
        footer={<Button variant="primary" block disabled={sending} aria-busy={sending} onClick={sendWaiver}>{sending ? 'Mengirim…' : 'Kirim permohonan'}</Button>}
      >
        <p className="text-[0.9375rem] text-ink-2">Pohon Baik ingin bisa dipakai semua keluarga. Bila disetujui, semua anak Anda aktif tanpa biaya selama 1 tahun.</p>
        <Field label="Ceritakan singkat (opsional)" id="waiver-reason">
          <Textarea id="waiver-reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Misalnya: sedang tidak bekerja" />
        </Field>
      </Sheet>
    </>
  )
}
