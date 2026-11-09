import type { CollectionConfig } from 'payload'
import { familyMemberWhere, staffHas } from '@/access'

/**
 * Undangan bergabung ke keluarga (pasangan atau pengasuh). Dibuat server action anggota keluarga;
 * tautan `/gabung/<token>` berlaku 7 hari dan sekali pakai. Anggota keluarga bisa melihat dan membatalkannya.
 */
export const FamilyInvites: CollectionConfig = {
  slug: 'familyInvites',
  labels: { singular: 'Undangan keluarga', plural: 'Undangan keluarga' },
  admin: {
    group: 'Keluarga',
    useAsTitle: 'token',
    hidden: ({ user }) => !(user?.collection === 'users' && (user as { roles?: string[] }).roles?.some((r) => r === 'admin' || r === 'dukungan')),
  },
  access: {
    read: ({ req }) => familyMemberWhere(req, 'family'),
    create: ({ req }) => staffHas(req, 'admin'),
    update: ({ req }) => staffHas(req, 'admin'),
    delete: ({ req }) => familyMemberWhere(req, 'family'),
  },
  fields: [
    { name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true },
    { name: 'token', type: 'text', required: true, unique: true, index: true },
    { name: 'role', type: 'select', required: true, defaultValue: 'parent', options: [
      { label: 'Orang tua', value: 'parent' }, { label: 'Pengasuh', value: 'caregiver' },
    ] },
    { name: 'email', label: 'Dikirim ke email', type: 'email' },
    { name: 'createdBy', type: 'relationship', relationTo: 'parents' },
    { name: 'expiresAt', type: 'date', required: true },
    { name: 'usedBy', type: 'relationship', relationTo: 'parents' },
    { name: 'usedAt', type: 'date' },
  ],
}
