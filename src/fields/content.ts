import type {
  ArrayField,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  Field,
  SelectField,
} from 'payload'
import { revalidateTag } from 'next/cache'
import { authenticated, contentEditors } from '@/access'
import { LAPIS, WAKTU, WAKTU_KEYS } from '@/lib/curriculum/constants'

export const CONTENT_TAG = 'content'

export const waktuField = (overrides: Partial<Omit<SelectField, 'hasMany'>> = {}): SelectField =>
  ({
    name: 'waktu',
    label: 'Waktu tampil',
    type: 'select',
    options: WAKTU_KEYS.map((k) => ({ label: WAKTU[k].name, value: k })),
    ...overrides,
  }) as SelectField

export const lapisOptions = LAPIS.map((l) => ({ label: l, value: l }))

/** Daftar teks sederhana (array berisi satu field `text`). */
export const textList = (
  name: string,
  label: string,
  extra: Partial<ArrayField> = {},
): ArrayField => ({
  name,
  label,
  type: 'array',
  labels: { singular: 'Poin', plural: 'Poin' },
  fields: [{ name: 'text', label: 'Teks', type: 'textarea', required: true }],
  ...extra,
})

/** Status tinjauan: hanya materi "disetujui" yang tampil di aplikasi (kecuali mode pengembangan). */
export const reviewStatusField: Field = {
  name: 'reviewStatus',
  label: 'Status tinjauan',
  type: 'select',
  required: true,
  defaultValue: 'review',
  index: true,
  options: [
    { label: 'Perlu ditinjau', value: 'review' },
    { label: 'Disetujui', value: 'approved' },
    { label: 'Perlu revisi', value: 'revise' },
  ],
  admin: { position: 'sidebar' },
}

const revalidate = (context: Record<string, unknown>) => {
  if (context.disableRevalidate) return
  try {
    revalidateTag(CONTENT_TAG, 'max')
  } catch {
    // dipanggil di luar Next (mis. skrip seed): tidak ada cache untuk dibersihkan
  }
}
const afterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidate(req.context)
  return doc
}
const afterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidate(req.context)
  return doc
}

/** Pengaturan bersama koleksi materi: akses, grup admin, status tinjauan, pembersihan cache. */
export function contentCollection(
  cfg: CollectionConfig,
  opts: { review?: boolean } = {},
): CollectionConfig {
  return {
    ...cfg,
    admin: { group: 'Materi', ...cfg.admin },
    access: {
      read: authenticated,
      create: contentEditors,
      update: contentEditors,
      delete: contentEditors,
      ...cfg.access,
    },
    fields: opts.review === false ? cfg.fields : [...cfg.fields, reviewStatusField],
    hooks: {
      ...cfg.hooks,
      afterChange: [...(cfg.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(cfg.hooks?.afterDelete ?? []), afterDelete],
    },
  }
}
