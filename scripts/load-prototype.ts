// Membaca materi dari prototype (`../app/*.js`, skrip browser) tanpa mengubahnya.
// Dipakai oleh seed-content.ts dan uji golden.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// Salinan materi prototype disimpan di seed/prototype agar folder web mandiri (bisa di-deploy sendiri).
// Perbarui salinan dengan `npm run seed:sync` bila prototype di ../app berubah.
export const PROTOTYPE_DIR = process.env.PROTOTYPE_DIR || path.resolve(here, '../seed/prototype')

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Prototype = {
  CABANG: Record<string, { name: string; lapis: string }>
  MODULES: { id: string; c: string; min: number; max: number; daily: boolean; w?: string; t: string; d: string; lv?: 1 | 2 }[]
  WARNINGS: { min: number; max: number; items: string[] }[]
  THEMES: { surah: string; ayat: string; title: string; sains: string; skill: string }[]
  BANDS: { id: string; label: string; min: number; max: number }[]
  TARGETS: Record<string, string[]>
  THEME_PLANS: Record<number, Record<string, { t: string; w: string }[][]>>
  MAJELIS: Record<number, { k: string; q: string }[]>
  PROFIL: any[]
  PROFIL_SUMBER: string[]
  PrayTimes: { compute: (date: Date, lat: number, lng: number, tz: number) => Record<string, string> }
}

export function loadPrototype(): Prototype {
  const read = (f: string) => fs.readFileSync(path.join(PROTOTYPE_DIR, f), 'utf8')
  const ctx: any = { console }
  ctx.globalThis = ctx
  ctx.window = ctx
  vm.createContext(ctx)
  vm.runInContext(read('praytimes.js'), ctx, { filename: 'praytimes.js' })
  // `const` di skrip tingkat atas tidak menempel ke global, jadi diekspor eksplisit.
  vm.runInContext(
    `${read('content.js')}\n${read('profil.js')}\n;globalThis.__out = { CABANG, MODULES, WARNINGS, THEMES, BANDS, TARGETS, THEME_PLANS, MAJELIS, PROFIL, PROFIL_SUMBER };`,
    ctx,
    { filename: 'content+profil.js' },
  )
  return { ...ctx.__out, PrayTimes: ctx.PrayTimes }
}
