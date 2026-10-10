import path from 'path'
import type { CollectionConfig } from 'payload'
import { familyDataStaff, familyMemberWhere, staffHas } from '@/access'

/**
 * Foto momen anak (data pribadi spesifik, UU PDP). Privat per keluarga: berkas hanya dilayani
 * `/api/momentPhotos/file/…` untuk anggota keluarga pemiliknya (access `read` ikut memeriksa berkas).
 * Unggahan dibuat server action (overrideAccess) setelah memeriksa keluarga; orang tua tidak bisa
 * mengunggah langsung lewat REST. Gambar selalu diproses ulang (diperkecil, JPEG) sehingga metadata
 * EXIF termasuk lokasi GPS terbuang.
 */
export const MomentPhotos: CollectionConfig = {
  slug: 'momentPhotos',
  labels: { singular: 'Foto momen', plural: 'Foto momen' },
  admin: {
    group: 'Keluarga',
    hidden: ({ user }) => !(user?.collection === 'users' && (user as { roles?: string[] }).roles?.some((r) => r === 'admin' || r === 'dukungan')),
  },
  access: {
    read: ({ req }) => familyMemberWhere(req, 'family'),
    create: ({ req }) => familyDataStaff(req),
    update: ({ req }) => staffHas(req, 'admin'),
    delete: ({ req }) => familyMemberWhere(req, 'family'),
  },
  fields: [{ name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true }],
  upload: {
    staticDir: path.resolve(process.env.MEDIA_DIR || path.resolve(process.cwd(), 'media'), 'momen'),
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'jpeg', options: { quality: 82 } },
    imageSizes: [{ name: 'thumb', width: 480, height: 480, fit: 'inside', withoutEnlargement: true, formatOptions: { format: 'jpeg', options: { quality: 75 } } }],
    adminThumbnail: 'thumb',
  },
}
