import type { GlobalConfig } from 'payload'
import { authenticated, contentEditors } from '@/access'
import { textList } from '@/fields/content'

/** Teks umum kurikulum yang dipakai di banyak layar. */
export const Kurikulum: GlobalConfig = {
  slug: 'kurikulum',
  label: 'Pengaturan kurikulum',
  admin: { group: 'Materi' },
  access: { read: authenticated, update: contentEditors },
  fields: [
    { name: 'warningAlways', label: 'Catatan konsultasi (selalu tampil)', type: 'textarea' },
    textList('profileSources', 'Sumber rujukan profil usia'),
  ],
}
