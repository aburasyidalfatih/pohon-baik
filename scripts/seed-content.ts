/**
 * Impor materi prototype (`../app/content.js` + `profil.js`) ke database.
 * Jalankan: npm run seed
 *
 * Aman diulang (idempoten): dokumen dicocokkan lewat kunci alaminya lalu
 * diperbarui; status tinjauan yang sudah diberikan peninjau tidak diubah.
 * Dokumen baru masuk dengan status "Perlu ditinjau".
 */
import 'dotenv/config'
import { getPayload, type CollectionSlug, type Where } from 'payload'
import config from '../src/payload.config'
import { loadPrototype } from './load-prototype'

const context = { disableRevalidate: true }
const list = (arr?: string[]) => (arr ?? []).map((text) => ({ text }))

async function main() {
  const payload = await getPayload({ config })
  // Database server (push dimatikan): pastikan semua migrasi sudah dijalankan sebelum mengisi materi.
  if (!payload.db.push) await payload.db.migrate()
  const P = loadPrototype()
  const stats: Record<string, { created: number; updated: number; removed: number }> = {}
  const tally = (c: string, k: 'created' | 'updated' | 'removed') => {
    stats[c] ??= { created: 0, updated: 0, removed: 0 }
    stats[c][k]++
  }

  async function upsert(collection: CollectionSlug, where: Where, data: Record<string, unknown>): Promise<string> {
    const found = await payload.find({ collection, where, limit: 1, depth: 0, pagination: false, context })
    if (found.docs[0]) {
      const doc = await payload.update({ collection, id: found.docs[0].id, data, depth: 0, context })
      tally(collection, 'updated')
      return String(doc.id)
    }
    const doc = await payload.create({ collection, data, depth: 0, context } as never)
    tally(collection, 'created')
    return String((doc as { id: string }).id)
  }

  /** Jalankan tugas paralel dalam kelompok kecil agar pool database tidak penuh. */
  async function inBatches<T>(items: T[], size: number, fn: (x: T) => Promise<unknown>) {
    for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn))
  }

  async function removeMissing(collection: CollectionSlug, keep: Set<string>) {
    const all = await payload.find({ collection, limit: 0, pagination: false, depth: 0, select: {}, context })
    for (const d of all.docs) {
      if (!keep.has(String(d.id))) {
        await payload.delete({ collection, id: d.id, context })
        tally(collection, 'removed')
      }
    }
  }

  // 1. Kelompok usia + target
  const bandId: Record<string, string> = {}
  for (const b of P.BANDS) {
    bandId[b.id] = await upsert('bands', { code: { equals: b.id } }, {
      code: b.id, label: b.label, minMonths: b.min, maxMonths: b.max, targets: list(P.TARGETS[b.id]),
    })
  }

  // 2. Cabang
  const branchId: Record<string, string> = {}
  for (const [code, c] of Object.entries(P.CABANG)) {
    branchId[code] = await upsert('branches', { code: { equals: code } }, { code, name: c.name, lapis: c.lapis })
  }

  // 3. Modul
  const keepModules = new Set<string>()
  await inBatches(P.MODULES, 10, async (m) => {
    keepModules.add(await upsert('modules', { code: { equals: m.id } }, {
      code: m.id, title: m.t, description: m.d, branch: branchId[m.c], minMonths: m.min, maxMonths: m.max,
      daily: !!m.daily, waktu: m.daily ? m.w : null,
      tier: m.lv === 1 ? 'inti' : m.lv === 2 ? 'seimbang' : 'penuh',
    }))
  })
  await removeMissing('modules', keepModules)

  // 4. Tema
  const themeId: string[] = []
  for (const [i, t] of P.THEMES.entries()) {
    themeId[i] = await upsert('themes', { order: { equals: i + 1 } }, {
      order: i + 1, title: t.title, surah: t.surah, ayat: t.ayat, science: t.sains, skill: t.skill,
    })
  }

  // 5. Tugas tema (12 tema × 8 kelompok usia × 4 minggu)
  const taskRows: { where: Where; data: Record<string, unknown> }[] = []
  for (const [ti, byBand] of Object.entries(P.THEME_PLANS)) {
    for (const [band, weeks] of Object.entries(byBand)) {
      weeks.forEach((tasks, wi) => tasks.forEach((x, order) => {
        const key = { theme: themeId[Number(ti)], band: bandId[band], week: wi + 1, order }
        taskRows.push({
          where: { and: Object.entries(key).map(([k, v]) => ({ [k]: { equals: v } })) },
          data: { ...key, waktu: x.w || 'pagi', text: x.t },
        })
      }))
    }
  }
  const keepTasks = new Set<string>()
  await inBatches(taskRows, 12, async (r) => keepTasks.add(await upsert('themeTasks', r.where, r.data)))
  await removeMissing('themeTasks', keepTasks)

  // 6. Majelis Malam (12 × 28)
  const majRows: { where: Where; data: Record<string, unknown> }[] = []
  for (const [ti, days] of Object.entries(P.MAJELIS)) {
    days.forEach((x, di) => majRows.push({
      where: { and: [{ theme: { equals: themeId[Number(ti)] } }, { day: { equals: di + 1 } }] },
      data: { theme: themeId[Number(ti)], day: di + 1, story: x.k, questions: list(x.q.split(' · ').map((s) => s.trim())) },
    }))
  }
  const keepMaj = new Set<string>()
  await inBatches(majRows, 12, async (r) => keepMaj.add(await upsert('majelis', r.where, r.data)))
  await removeMissing('majelis', keepMaj)

  // 7. Profil usia 0–14
  for (const p of P.PROFIL) {
    await upsert('ageProfiles', { year: { equals: p.y } }, {
      year: p.y, label: p.label, title: p.judul, summary: p.inti,
      feelings: list(p.rasa),
      normal: (p.wajar ?? []).map((w: { q: string; a: string }) => ({ q: w.q, a: w.a })),
      milestones: (p.tahapan ?? []).map((t: { usia: string; items: string[] }) => ({ age: t.usia, items: list(t.items) })),
      abilities: Object.entries(p.bisa ?? {}).map(([domain, items]) => ({ domain, items: list(items as string[]) })),
      limits: list(p.belum), stimulation: list(p.stimulasi), avoid: list(p.hindari),
      islam: (p.islam ?? []).map((x: { t: string; s: string }) => ({ text: x.t, source: x.s })),
      worship: p.ibadah, consult: list(p.konsultasi),
    })
  }

  // 8. Tanda perlu konsultasi
  const keepWarnings = new Set<string>()
  for (const w of P.WARNINGS) {
    keepWarnings.add(await upsert('warnings', { and: [{ minMonths: { equals: w.min } }, { maxMonths: { equals: w.max } }] }, {
      label: `${w.min}–${w.max} bulan`, minMonths: w.min, maxMonths: w.max, items: list(w.items),
    }))
  }
  // Rentang usia yang berubah meninggalkan baris lama; hapus agar tidak tumpang tindih.
  await removeMissing('warnings', keepWarnings)

  // 9. Pengaturan kurikulum
  const { WARNING_ALWAYS } = await import('../src/lib/curriculum/constants')
  await payload.updateGlobal({ slug: 'kurikulum', data: { warningAlways: WARNING_ALWAYS, profileSources: list(P.PROFIL_SUMBER) }, context })

  console.table(stats)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
