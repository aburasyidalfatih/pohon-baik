import type { CollectionConfig } from 'payload'
import { familyDataStaff, isParent, staffHas } from '@/access'

/**
 * Langganan notifikasi web push per perangkat (pengingat saat waktu shalat masuk).
 * Dibuat/dihapus lewat server action (overrideAccess). Orang tua hanya melihat perangkatnya sendiri.
 * Dihapus otomatis saat keluar akun di perangkat itu atau bila layanan push menjawab 404/410.
 */
export const PushSubscriptions: CollectionConfig = {
  slug: 'pushSubscriptions',
  labels: { singular: 'Notifikasi perangkat', plural: 'Notifikasi perangkat' },
  admin: {
    group: 'Keluarga',
    useAsTitle: 'device',
    hidden: ({ user }) => !(user?.collection === 'users' && (user as { roles?: string[] }).roles?.some((r) => r === 'admin' || r === 'dukungan')),
  },
  access: {
    read: ({ req }) => familyDataStaff(req) || (isParent(req) && req.user ? { parent: { equals: req.user.id } } : false),
    create: ({ req }) => staffHas(req, 'admin'),
    update: ({ req }) => staffHas(req, 'admin'),
    delete: ({ req }) => staffHas(req, 'admin') || (isParent(req) && req.user ? { parent: { equals: req.user.id } } : false),
  },
  fields: [
    { name: 'parent', type: 'relationship', relationTo: 'parents', required: true, index: true },
    { name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true },
    { name: 'endpoint', type: 'text', required: true, unique: true, index: true },
    { name: 'keys', type: 'json', required: true },
    { name: 'device', label: 'Perangkat', type: 'text' },
    // Kunci `tanggal|waktu` notifikasi terakhir: pengiriman tepat sekali per waktu walau cron berjalan berulang.
    { name: 'lastSent', type: 'text', admin: { readOnly: true } },
  ],
}
