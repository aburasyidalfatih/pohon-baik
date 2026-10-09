import path from 'path'
import type { CollectionConfig } from 'payload'
import { contentEditors } from '@/access'

/** Media materi (ilustrasi, audio kisah). Foto momen keluarga nanti memakai koleksi privat terpisah. */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'Materi' },
  access: { read: () => true, create: contentEditors, update: contentEditors, delete: contentEditors },
  fields: [{ name: 'alt', label: 'Teks alternatif', type: 'text', required: true }],
  // Folder tetap agar bisa dijadikan volume di Dokploy (/app/media).
  upload: { staticDir: process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media') },
}
