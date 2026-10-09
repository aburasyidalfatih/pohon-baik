import 'server-only'
import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'
import type { Child, Family, Parent } from '@/payload-types'

export const payloadClient = () => getPayload({ config })

/** Orang tua yang sedang login (null jika belum, atau jika yang login staf). */
export const getParent = cache(async (): Promise<Parent | null> => {
  // Baca header dulu: menandai rute sebagai dinamis sebelum menyentuh database (penting saat build).
  const h = await headers()
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: h })
  return user && user.collection === 'parents' ? (user as Parent) : null
})

/** Keluarga & anak milik orang tua yang login (akses dibatasi oleh access control Payload). */
export const getFamily = cache(async (): Promise<{ family: Family; children: Child[] } | null> => {
  const parent = await getParent()
  if (!parent) return null
  const payload = await payloadClient()
  const fam = await payload.find({
    collection: 'families',
    where: { 'members.parent': { equals: parent.id } },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user: parent,
  })
  const family = fam.docs[0]
  if (!family) return null
  const kids = await payload.find({
    collection: 'children',
    where: { family: { equals: family.id } },
    sort: 'dob',
    depth: 0,
    limit: 20,
    overrideAccess: false,
    user: parent,
  })
  return { family, children: kids.docs }
})
