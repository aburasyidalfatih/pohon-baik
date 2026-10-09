import type { CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'
import { contentCollection, lapisOptions, textList, waktuField } from '@/fields/content'
import { contentReviewers } from '@/access'

/** Salin urutan tema & batas usia kelompok ke dokumen agar daftar di admin bisa diurutkan secara alami. */
const denormalizeOrder: CollectionBeforeChangeHook = async ({ data, req, originalDoc }) => {
  const themeRef = data.theme ?? originalDoc?.theme
  const bandRef = data.band ?? originalDoc?.band
  const idOf = (v: unknown) =>
    v && typeof v === 'object' ? (v as { id: string }).id : (v as string)
  if (themeRef)
    data.themeOrder = (
      await req.payload.findByID({
        collection: 'themes',
        id: idOf(themeRef),
        depth: 0,
        req,
        select: { order: true },
      })
    ).order
  if (bandRef)
    data.bandMin = (
      await req.payload.findByID({
        collection: 'bands',
        id: idOf(bandRef),
        depth: 0,
        req,
        select: { minMonths: true },
      })
    ).minMonths
  return data
}
const sortField = (name: string, label: string): Field => ({
  name,
  label,
  type: 'number',
  index: true,
  admin: { readOnly: true, position: 'sidebar' },
})

export const Bands = contentCollection(
  {
    slug: 'bands',
    labels: { singular: 'Kelompok usia', plural: 'Kelompok usia' },
    admin: { useAsTitle: 'label', defaultColumns: ['code', 'label', 'minMonths', 'maxMonths'] },
    defaultSort: 'minMonths',
    fields: [
      { name: 'code', label: 'Kode', type: 'text', required: true, unique: true, index: true },
      { name: 'label', type: 'text', required: true },
      {
        type: 'row',
        fields: [
          { name: 'minMonths', label: 'Usia min (bulan)', type: 'number', required: true, min: 0 },
          { name: 'maxMonths', label: 'Usia maks (bulan)', type: 'number', required: true, min: 0 },
        ],
      },
      textList('targets', 'Target kelompok usia'),
    ],
  },
  { review: false },
)

export const Branches = contentCollection(
  {
    slug: 'branches',
    labels: { singular: 'Cabang', plural: 'Cabang (15 bidang)' },
    admin: { useAsTitle: 'name', defaultColumns: ['code', 'name', 'lapis'] },
    defaultSort: 'code',
    fields: [
      { name: 'code', label: 'Kode', type: 'text', required: true, unique: true, index: true },
      { name: 'name', label: 'Nama', type: 'text', required: true },
      { name: 'lapis', type: 'select', required: true, options: lapisOptions },
    ],
  },
  { review: false },
)

export const Modules = contentCollection({
  slug: 'modules',
  labels: { singular: 'Modul', plural: 'Modul' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'branch', 'minMonths', 'maxMonths', 'daily', 'waktu', 'reviewStatus'],
  },
  defaultSort: 'code',
  fields: [
    { name: 'code', label: 'Kode', type: 'text', required: true, unique: true, index: true },
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'branch',
          label: 'Cabang',
          type: 'relationship',
          relationTo: 'branches',
          required: true,
        },
        {
          name: 'minMonths',
          label: 'Usia min (bulan)',
          type: 'number',
          required: true,
          min: 0,
          index: true,
        },
        {
          name: 'maxMonths',
          label: 'Usia maks (bulan)',
          type: 'number',
          required: true,
          min: 0,
          index: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'daily', label: 'Tugas harian', type: 'checkbox', defaultValue: false },
        waktuField({ admin: { condition: (_, s) => !!s?.daily } }),
        {
          name: 'tier',
          label: 'Beban',
          type: 'select',
          defaultValue: 'penuh',
          options: [
            { label: 'Inti (±15 menit)', value: 'inti' },
            { label: 'Seimbang (±45 menit)', value: 'seimbang' },
            { label: 'Penuh (homeschool)', value: 'penuh' },
          ],
          admin: {
            condition: (_, s) => !!s?.daily,
            description:
              'Modul tampil untuk anak yang bebannya sama atau lebih tinggi. Usahakan 3–5 modul Inti per usia.',
          },
        },
      ],
    },
  ],
})

export const Themes = contentCollection({
  slug: 'themes',
  labels: { singular: 'Tema', plural: 'Tema (12 surah)' },
  admin: { useAsTitle: 'title', defaultColumns: ['order', 'title', 'surah', 'reviewStatus'] },
  defaultSort: 'order',
  fields: [
    {
      name: 'order',
      label: 'Urutan (1–12)',
      type: 'number',
      required: true,
      unique: true,
      min: 1,
      max: 12,
    },
    { name: 'title', label: 'Judul', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'surah', type: 'text', required: true },
        { name: 'ayat', type: 'text' },
      ],
    },
    { name: 'science', label: 'Sains / pengetahuan', type: 'textarea' },
    { name: 'skill', label: 'Keterampilan', type: 'textarea' },
  ],
})

export const ThemeTasks = contentCollection({
  slug: 'themeTasks',
  labels: { singular: 'Tugas tema', plural: 'Tugas tema' },
  admin: {
    useAsTitle: 'text',
    defaultColumns: ['text', 'theme', 'band', 'week', 'waktu', 'reviewStatus'],
    listSearchableFields: ['text'],
  },
  defaultSort: ['themeOrder', 'bandMin', 'week', 'order'],
  hooks: { beforeChange: [denormalizeOrder] },
  fields: [
    sortField('themeOrder', 'Urutan tema'),
    sortField('bandMin', 'Usia min kelompok'),
    {
      type: 'row',
      fields: [
        {
          name: 'theme',
          label: 'Tema',
          type: 'relationship',
          relationTo: 'themes',
          required: true,
          index: true,
        },
        {
          name: 'band',
          label: 'Kelompok usia',
          type: 'relationship',
          relationTo: 'bands',
          required: true,
          index: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'week',
          label: 'Minggu',
          type: 'number',
          required: true,
          min: 1,
          max: 4,
          index: true,
        },
        { name: 'order', label: 'Urutan', type: 'number', required: true, defaultValue: 0 },
        waktuField({ required: true, defaultValue: 'pagi' }),
      ],
    },
    { name: 'text', label: 'Tugas', type: 'textarea', required: true },
  ],
})

export const Majelis = contentCollection({
  slug: 'majelis',
  labels: { singular: 'Majelis Malam', plural: 'Majelis Malam' },
  admin: {
    useAsTitle: 'story',
    defaultColumns: ['story', 'theme', 'day', 'reviewStatus'],
    listSearchableFields: ['story'],
  },
  defaultSort: ['themeOrder', 'day'],
  hooks: { beforeChange: [denormalizeOrder] },
  fields: [
    sortField('themeOrder', 'Urutan tema'),
    {
      type: 'row',
      fields: [
        {
          name: 'theme',
          label: 'Tema',
          type: 'relationship',
          relationTo: 'themes',
          required: true,
          index: true,
        },
        {
          name: 'day',
          label: 'Hari (1–28)',
          type: 'number',
          required: true,
          min: 1,
          max: 28,
          index: true,
        },
      ],
    },
    { name: 'story', label: 'Kisah', type: 'textarea', required: true },
    textList('questions', 'Pertanyaan obrolan', { minRows: 1, maxRows: 5 }),
  ],
})

export const AgeProfiles = contentCollection({
  slug: 'ageProfiles',
  labels: { singular: 'Profil usia', plural: 'Profil usia (0–14 th)' },
  admin: { useAsTitle: 'title', defaultColumns: ['year', 'label', 'title', 'reviewStatus'] },
  defaultSort: 'year',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'year',
          label: 'Tahun usia',
          type: 'number',
          required: true,
          unique: true,
          min: 0,
          max: 14,
        },
        { name: 'label', type: 'text', required: true },
      ],
    },
    { name: 'title', label: 'Judul', type: 'text', required: true },
    { name: 'summary', label: 'Inti', type: 'textarea', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Rasa & wajar',
          fields: [
            textList('feelings', 'Yang dirasakan anak'),
            {
              name: 'normal',
              label: 'Apakah wajar…?',
              type: 'array',
              fields: [
                { name: 'q', label: 'Pertanyaan', type: 'text', required: true },
                { name: 'a', label: 'Jawaban', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'Kemampuan',
          fields: [
            {
              name: 'milestones',
              label: 'Tahapan per usia (0–5 th, patokan CDC)',
              type: 'array',
              fields: [
                { name: 'age', label: 'Usia', type: 'text', required: true },
                textList('items', 'Kemampuan'),
              ],
            },
            {
              name: 'abilities',
              label: 'Kemampuan per ranah (6+ th)',
              type: 'array',
              fields: [
                { name: 'domain', label: 'Ranah', type: 'text', required: true },
                textList('items', 'Kemampuan'),
              ],
            },
            textList('limits', 'Batas kemampuannya'),
          ],
        },
        {
          label: 'Stimulasi',
          fields: [
            textList('stimulation', 'Cara menstimulasi'),
            textList('avoid', 'Sebaiknya dihindari'),
          ],
        },
        {
          label: 'Islam',
          fields: [
            {
              name: 'islam',
              label: 'Pandangan Islam',
              type: 'array',
              fields: [
                { name: 'text', label: 'Teks', type: 'textarea', required: true },
                { name: 'source', label: 'Sumber', type: 'text' },
              ],
            },
            { name: 'worship', label: 'Ibadah di usia ini', type: 'textarea' },
          ],
        },
        { label: 'Konsultasi', fields: [textList('consult', 'Kapan perlu konsultasi')] },
      ],
    },
  ],
})

export const Warnings = contentCollection({
  slug: 'warnings',
  labels: { singular: 'Tanda perlu konsultasi', plural: 'Tanda perlu konsultasi' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'minMonths', 'maxMonths', 'reviewStatus'],
  },
  defaultSort: 'minMonths',
  fields: [
    { name: 'label', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'minMonths', label: 'Usia min (bulan)', type: 'number', required: true },
        { name: 'maxMonths', label: 'Usia maks (bulan)', type: 'number', required: true },
      ],
    },
    textList('items', 'Tanda'),
  ],
})

export const ContentReviews: CollectionConfig = {
  slug: 'contentReviews',
  labels: { singular: 'Catatan tinjauan', plural: 'Catatan tinjauan' },
  admin: { group: 'Materi', defaultColumns: ['doc', 'status', 'reviewer', 'updatedAt'] },
  access: {
    read: contentReviewers,
    create: contentReviewers,
    update: contentReviewers,
    delete: contentReviewers,
  },
  fields: [
    {
      name: 'doc',
      label: 'Materi',
      type: 'relationship',
      relationTo: ['modules', 'themes', 'themeTasks', 'majelis', 'ageProfiles', 'warnings'],
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Disetujui', value: 'approved' },
        { label: 'Perlu revisi', value: 'revise' },
      ],
    },
    { name: 'notes', label: 'Catatan', type: 'textarea' },
    {
      name: 'reviewer',
      label: 'Peninjau',
      type: 'relationship',
      relationTo: 'users',
      defaultValue: ({ user }) => user?.id,
    },
  ],
  hooks: {
    // Keputusan tinjauan langsung mengubah status materi yang ditinjau.
    afterChange: [
      async ({ doc, req }) => {
        const ref = doc.doc as {
          relationTo: 'modules' | 'themes' | 'themeTasks' | 'majelis' | 'ageProfiles' | 'warnings'
          value: string | { id: string }
        }
        const id = typeof ref.value === 'object' ? ref.value.id : ref.value
        await req.payload.update({
          collection: ref.relationTo,
          id,
          data: { reviewStatus: doc.status },
          req,
          overrideAccess: true,
        })
        return doc
      },
    ],
  },
}

export const contentCollections = [
  Bands,
  Branches,
  Modules,
  Themes,
  ThemeTasks,
  Majelis,
  AgeProfiles,
  Warnings,
  ContentReviews,
]
