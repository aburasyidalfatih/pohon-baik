import type { CollectionConfig } from 'payload'
import { adminOnly, isStaff, STAFF_ROLES, staffHas } from '@/access'

/** Staf Pohon Baik (admin panel). Orang tua memakai koleksi `parents`. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Staf', plural: 'Staf' },
  admin: { useAsTitle: 'email', group: 'Pengguna', defaultColumns: ['email', 'name', 'roles'] },
  auth: { maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 },
  access: {
    admin: ({ req }) => isStaff(req),
    read: ({ req }) => isStaff(req),
    create: adminOnly,
    delete: adminOnly,
    update: ({ req, id }) => staffHas(req, 'admin') || (isStaff(req) && req.user?.id === id),
  },
  fields: [
    { name: 'name', label: 'Nama', type: 'text' },
    {
      name: 'roles',
      label: 'Peran',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['konten'],
      options: [...STAFF_ROLES],
      access: { update: ({ req }) => staffHas(req, 'admin') },
      saveToJWT: true,
    },
  ],
  hooks: {
    beforeChange: [
      // Staf pertama yang dibuat (lewat layar "buat pengguna pertama") otomatis menjadi admin.
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
          if (totalDocs === 0) data.roles = ['admin']
        }
        return data
      },
    ],
  },
}
