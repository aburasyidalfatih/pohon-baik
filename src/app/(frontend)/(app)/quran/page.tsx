import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/pb/page-transition'
import { PageHeader } from '@/components/pb/ui'
import { buttonVariants, Card, EmptyState } from '@/components/ui/primitives'
import { localNow } from '@/lib/curriculum/core'
import { PRICE_PER_CHILD_YEAR } from '@/lib/billing/rules'
import { childOpenOn } from '@/lib/server/billing'
import { getFamily, getParent, payloadClient } from '@/lib/server/payload'
import { QuranView } from './view'

export const metadata = { title: "Qur'an" }

export default async function QuranPage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string }>
}) {
  const [parent, ctx] = await Promise.all([getParent(), getFamily()])
  if (!parent || !ctx) redirect('/masuk')
  const { family, children } = ctx

  if (children.length === 0) {
    return (
      <PageTransition>
        <PageHeader title="Qur'an" subtitle="Hafalan & murajaah berjarak" />
        <Card>
          <EmptyState
            icon={<BookOpen size={28} />}
            title="Belum ada anak terdaftar"
            action={
              <Link href="/keluarga" className={buttonVariants({ variant: 'primary' })}>
                Tambah anak di menu Keluarga
              </Link>
            }
          >
            Tambahkan anak dulu, lalu catat setoran hafalannya di sini.
          </EmptyState>
        </Card>
      </PageTransition>
    )
  }

  const tz = Number(family.tz ?? 7)
  const today = localNow(tz).date
  const { cid } = await searchParams

  const activeChild = children.find((c) => c.id === cid) ?? children[0]

  const childList = children.map((c) => ({ id: c.id, name: c.name }))
  if (!childOpenOn(family, activeChild, today)) {
    return (
      <PageTransition>
        <QuranView today={today} activeChild={{ id: activeChild.id, name: activeChild.name }} childrenList={childList} entries={[]} lockedPrice={PRICE_PER_CHILD_YEAR} />
      </PageTransition>
    )
  }

  const payload = await payloadClient()
  const res = await payload.find({
    collection: 'quranEntries',
    where: {
      and: [
        { family: { equals: family.id } },
        { child: { equals: activeChild.id } },
      ],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    sort: '-createdAt',
    overrideAccess: false,
    user: parent,
  })

  return (
    <PageTransition>
      <QuranView
        today={today}
        activeChild={{ id: activeChild.id, name: activeChild.name, tahfidzTarget: activeChild.tahfidzTarget }}
        childrenList={childList}
        entries={res.docs.map((doc) => ({
          id: doc.id,
          label: doc.label,
          base: doc.base,
          done: Array.isArray(doc.done) ? (doc.done as number[]) : [],
        }))}
      />
    </PageTransition>
  )
}
