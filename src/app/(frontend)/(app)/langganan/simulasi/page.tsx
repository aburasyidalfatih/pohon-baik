import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/pb/ui'
import { Card } from '@/components/ui/primitives'
import { rupiah } from '@/lib/billing/rules'
import { simulationAllowed } from '@/lib/server/billing'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import { SimulasiButtons } from './buttons'

export const metadata = { title: 'Simulasi pembayaran' }

/** Pengganti halaman Midtrans saat pengembangan lokal (tanpa MIDTRANS_SERVER_KEY). Tidak ada di production. */
export default async function SimulasiPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  if (!simulationAllowed()) notFound()
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const { order } = await searchParams
  const payload = await payloadClient()
  const o = order
    ? (await payload.find({ collection: 'orders', where: { and: [{ orderId: { equals: order } }, { family: { equals: ctx.family.id } }] }, limit: 1, depth: 0, overrideAccess: false, user: parent })).docs[0]
    : null
  if (!o) notFound()
  return (
    <>
      <PageHeader title="Simulasi bayar" subtitle="Hanya untuk pengembangan lokal" />
      <Card tone="warn">
        <p className="text-[0.9375rem]">Kunci Midtrans belum diisi, jadi pembayaran disimulasikan. Di server production halaman ini tidak ada.</p>
      </Card>
      <Card>
        <p className="text-sm text-ink-2">Pesanan {o.orderId}</p>
        <b className="mt-1 block text-[1.0625rem]">{(o.items ?? []).map((i) => i.childName).join(', ')}</b>
        <p className="mt-1 text-2xl font-bold tabular-nums">{rupiah(o.amount)}</p>
        <p className="mt-1 text-sm text-ink-2">Status: {o.status}</p>
      </Card>
      {o.status === 'pending' && <SimulasiButtons orderId={o.orderId} />}
    </>
  )
}
