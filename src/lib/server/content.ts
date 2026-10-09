import 'server-only'
import { unstable_cache } from 'next/cache'
import type { Where } from 'payload'
import { CONTENT_TAG } from '@/fields/content'
import { payloadClient } from './payload'

/**
 * Materi yang tampil di aplikasi hanya yang berstatus "Disetujui".
 * Selama pengembangan / pemakaian pribadi, set CONTENT_INCLUDE_UNREVIEWED=true
 * agar materi hasil seed (status "Perlu ditinjau") tetap tampil.
 */
const approved = (): Where =>
  process.env.CONTENT_INCLUDE_UNREVIEWED === 'true' ? { reviewStatus: { not_equals: 'revise' } } : { reviewStatus: { equals: 'approved' } }

const cached = <A extends unknown[], R>(key: string, fn: (...a: A) => Promise<R>) =>
  unstable_cache(fn, ['content', key], { tags: [CONTENT_TAG], revalidate: 3600 })

export const getBands = cached('bands', async () => {
  const p = await payloadClient()
  return (await p.find({ collection: 'bands', limit: 0, pagination: false, sort: 'minMonths', depth: 0 })).docs
})

export const getThemes = cached('themes', async () => {
  const p = await payloadClient()
  return (await p.find({ collection: 'themes', where: approved(), limit: 0, pagination: false, sort: 'order', depth: 0 })).docs
})

export const getThemeWeek = cached('themeWeek', async (themeId: string, bandId: string, week: number) => {
  const p = await payloadClient()
  const where: Where = { and: [approved(), { theme: { equals: themeId } }, { band: { equals: bandId } }, { week: { equals: week } }] }
  return (await p.find({ collection: 'themeTasks', where, sort: 'order', limit: 0, pagination: false, depth: 0 })).docs
})

export const getMajelis = cached('majelis', async (themeId: string, day: number) => {
  const p = await payloadClient()
  const where: Where = { and: [approved(), { theme: { equals: themeId } }, { day: { equals: day } }] }
  return (await p.find({ collection: 'majelis', where, limit: 1, depth: 0 })).docs[0] ?? null
})

export const getAgeProfile = cached('ageProfile', async (year: number) => {
  const p = await payloadClient()
  const where: Where = { and: [approved(), { year: { equals: year } }] }
  return (await p.find({ collection: 'ageProfiles', where, limit: 1, depth: 0 })).docs[0] ?? null
})

/** Nama cabang per kode (A1 → "Iman & Ibadah") untuk label tugas. */
export const getBranches = cached('branches', async () => {
  const p = await payloadClient()
  const res = await p.find({ collection: 'branches', limit: 0, pagination: false, depth: 0 })
  return Object.fromEntries(res.docs.map((b) => [b.code, b.name])) as Record<string, string>
})

export const getBranchList = cached('branchList', async () => {
  const p = await payloadClient()
  const res = await p.find({ collection: 'branches', limit: 0, pagination: false, sort: 'code', depth: 0 })
  return res.docs.map((b) => ({ code: b.code, name: b.name, lapis: b.lapis }))
})


export const getThemeTasksByBand = cached('themeTasksByBand', async (themeId: string, bandId: string) => {
  const p = await payloadClient()
  const where: Where = { and: [approved(), { theme: { equals: themeId } }, { band: { equals: bandId } }] }
  return (await p.find({ collection: 'themeTasks', where, sort: ['week', 'order'], limit: 0, pagination: false, depth: 0 })).docs
})

export const getThemeMajelisList = cached('themeMajelisList', async (themeId: string) => {
  const p = await payloadClient()
  const where: Where = { and: [approved(), { theme: { equals: themeId } }] }
  return (await p.find({ collection: 'majelis', where, sort: 'day', limit: 0, pagination: false, depth: 0 })).docs
})

export const getWarnings = cached('warnings', async () => {
  const p = await payloadClient()
  return (await p.find({ collection: 'warnings', where: approved(), sort: 'minMonths', limit: 0, pagination: false, depth: 0 })).docs
})

export const getAllModules = cached('allModules', async () => {
  const p = await payloadClient()
  return (await p.find({ collection: 'modules', where: approved(), limit: 0, pagination: false, depth: 1 })).docs
})

