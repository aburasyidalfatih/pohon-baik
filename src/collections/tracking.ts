import type { CollectionConfig, Field } from 'payload'
import { familyDataStaff, familyIdsOf, familyMemberWhere, isParent } from '@/access'
import { isOpen, type FamilyBilling } from '@/lib/billing/rules'
import { localNow } from '@/lib/curriculum/core'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isoDate = (name: string, label: string, required = true): Field => ({
  name,
  label,
  type: 'text',
  required,
  index: true,
  validate: (v: unknown) => (!required && !v) || (typeof v === 'string' && ISO_DATE.test(v)) || 'Format tanggal YYYY-MM-DD',
})

/**
 * Data milik keluarga: setiap dokumen punya field `family`; orang tua hanya bisa
 * mengakses dokumen keluarganya, staf hanya admin & dukungan (UU PDP).
 */
type Data = Record<string, unknown>
/**
 * `gated`: penulisan oleh orang tua untuk anak yang langganannya belum aktif ditolak
 * (masa coba habis dan belum dibayar). Menghapus dan membaca tetap boleh.
 */
function familyOwned({ gated, ...cfg }: Omit<CollectionConfig, 'access'> & { access?: CollectionConfig['access']; gated?: (data: Data) => boolean }): CollectionConfig {
  return {
    ...cfg,
    admin: { group: 'Keluarga', hidden: ({ user }) => !(user?.collection === 'users' && (user as { roles?: string[] }).roles?.some((r) => r === 'admin' || r === 'dukungan')), ...cfg.admin },
    access: {
      read: ({ req }) => familyMemberWhere(req, 'family'),
      update: ({ req }) => familyMemberWhere(req, 'family'),
      delete: ({ req }) => familyMemberWhere(req, 'family'),
      create: ({ req }) => familyDataStaff(req) || isParent(req),
      ...cfg.access,
    },
    fields: [
      { name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true, admin: { position: 'sidebar' } },
      ...cfg.fields,
    ],
    hooks: {
      ...cfg.hooks,
      beforeChange: [
        // Orang tua hanya boleh menulis ke keluarganya sendiri, dan anak harus anggota keluarga itu.
        async ({ data, req, originalDoc }) => {
          if (!isParent(req)) return data
          const family = String(data.family ?? originalDoc?.family ?? '')
          const ids = (await familyIdsOf(req)).map(String)
          if (!ids.includes(family)) throw new Error('Keluarga tidak sesuai')
          const child = data.child ?? originalDoc?.child
          if (child) {
            const c = await req.payload.findByID({ collection: 'children', id: typeof child === 'object' ? child.id : child, depth: 0, req, overrideAccess: true })
            if (String(typeof c.family === 'object' ? c.family.id : c.family) !== family) throw new Error('Anak tidak sesuai')
            if (gated?.({ ...originalDoc, ...data })) {
              const f = await req.payload.findByID({ collection: 'families', id: family, depth: 0, req, overrideAccess: true })
              const fb: FamilyBilling = { trialEndsAt: f.trialEndsAt, waiverStatus: f.waiver?.status, waiverUntil: f.waiver?.until }
              if (!isOpen(fb, c, localNow(Number(f.tz ?? 7)).date)) throw new Error(`Langganan ${c.name} belum aktif. Aktifkan di menu Keluarga → Langganan.`)
            }
          }
          return data
        },
        ...(cfg.hooks?.beforeChange ?? []),
      ],
    },
  }
}

const childField = (required = true): Field => ({ name: 'child', label: 'Anak', type: 'relationship', relationTo: 'children', required, index: true })

/** Satu baris per anak per hari (child kosong = kegiatan keluarga, mis. Majelis Malam). */
export const DailyLogs = familyOwned({
  slug: 'dailyLogs',
  gated: () => true,
  labels: { singular: 'Catatan harian', plural: 'Catatan harian' },
  admin: { useAsTitle: 'date', defaultColumns: ['date', 'child', 'family'] },
  defaultSort: '-date',
  fields: [
    childField(false),
    isoDate('date', 'Tanggal'),
    { name: 'done', label: 'Tugas selesai (kunci tugas)', type: 'json', required: true, defaultValue: [] },
  ],
})

export const QuranEntries = familyOwned({
  slug: 'quranEntries',
  gated: () => true,
  labels: { singular: 'Hafalan', plural: 'Hafalan' },
  admin: { useAsTitle: 'label', defaultColumns: ['label', 'child', 'base'] },
  defaultSort: 'base',
  fields: [
    childField(),
    { name: 'label', label: 'Surah/bagian', type: 'text', required: true },
    isoDate('base', 'Tanggal setoran/ulang dari awal'),
    { name: 'done', label: 'Interval murajaah selesai', type: 'json', required: true, defaultValue: [] },
  ],
})

export const Moments = familyOwned({
  slug: 'moments',
  // Syukur dari Majelis Malam adalah kegiatan keluarga: tetap boleh untuk semua anak.
  gated: (d) => d.source !== 'majelis',
  labels: { singular: 'Momen', plural: 'Momen' },
  admin: { useAsTitle: 'text', defaultColumns: ['date', 'child', 'category', 'text'] },
  defaultSort: '-date',
  fields: [
    childField(),
    isoDate('date', 'Tanggal'),
    { name: 'category', label: 'Kategori', type: 'select', required: true, defaultValue: 'catatan', options: [
      { label: '✨ Bisa baru', value: 'bisa' }, { label: '💬 Ucapan', value: 'kata' }, { label: '🤲 Ibadah', value: 'ibadah' },
      { label: '😄 Lucu', value: 'lucu' }, { label: '💛 Syukur', value: 'syukur' }, { label: '📝 Catatan', value: 'catatan' },
    ] },
    { name: 'text', label: 'Cerita', type: 'textarea' },
    { name: 'source', label: 'Asal', type: 'select', required: true, defaultValue: 'manual', options: [
      { label: 'Ditulis orang tua', value: 'manual' }, { label: 'Tonggak kemampuan', value: 'milestone' }, { label: 'Majelis Malam', value: 'majelis' },
    ] },
    { name: 'milestoneKey', type: 'text', index: true, admin: { condition: (_, s) => s?.source === 'milestone' } },
    { name: 'hasPhoto', label: 'Ada foto (menyusul: unggahan privat)', type: 'checkbox', defaultValue: false },
  ],
})

export const Milestones = familyOwned({
  slug: 'milestones',
  gated: () => true,
  labels: { singular: 'Tonggak kemampuan', plural: 'Tonggak kemampuan' },
  admin: { useAsTitle: 'key', defaultColumns: ['child', 'key', 'seenAt'] },
  fields: [
    childField(),
    { name: 'key', label: 'Kunci (tahun-bagian-indeks)', type: 'text', required: true, index: true },
    isoDate('seenAt', 'Tampak sejak'),
  ],
})

export const RaporEntries = familyOwned({
  slug: 'raporEntries',
  gated: () => true,
  labels: { singular: 'Rapor', plural: 'Rapor' },
  admin: { useAsTitle: 'semester', defaultColumns: ['child', 'semester', 'branch', 'level'] },
  fields: [
    childField(),
    { name: 'semester', label: 'Semester (mis. 2026-S2)', type: 'text', required: true, index: true },
    { name: 'branch', label: 'Kode cabang (atau _bakat)', type: 'text', required: true },
    { name: 'level', label: 'Tingkat (0–3)', type: 'number', min: 0, max: 3, defaultValue: 0 },
    { name: 'note', label: 'Catatan', type: 'textarea' },
  ],
})

export const trackingCollections = [DailyLogs, QuranEntries, Moments, Milestones, RaporEntries]
