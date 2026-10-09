import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { billingFor, recentOrders, syncPendingOrders } from '@/lib/server/billing'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import { LanggananView } from './view'

export const metadata = { title: 'Langganan' }

export default async function LanggananPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const s = { parent, ...ctx }

  // Kembali dari halaman bayar: cocokkan status ke Midtrans dulu, lalu baca ulang data keluarga (bukan versi cache).
  await syncPendingOrders(s)
  const payload = await payloadClient()
  const [family, kids] = await Promise.all([
    payload.findByID({ collection: 'families', id: ctx.family.id, depth: 0, overrideAccess: false, user: parent }),
    payload.find({ collection: 'children', where: { family: { equals: ctx.family.id } }, sort: 'dob', depth: 0, limit: 20, overrideAccess: false, user: parent }),
  ])
  const billing = billingFor({ family, children: kids.docs })
  const orders = await recentOrders({ ...s, family })
  const { order } = await searchParams
  const returned = order ? orders.find((o) => o.orderId === order) ?? null : null

  return (
    <PageTransition>
      <LanggananView billing={billing} orders={orders} returned={returned ? { status: returned.status, names: returned.names } : null} />
    </PageTransition>
  )
}
