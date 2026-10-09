import type { CollectionConfig, FieldAccess } from 'payload'
import { familyDataStaff, familyMemberWhere, isParent, staffHas } from '@/access'
import { trialEndFor } from '@/lib/billing/rules'
import { CITIES, DEFAULT_LOAD, DEFAULT_TAHFIDZ, LOADS, TAHFIDZ_TARGETS } from '@/lib/curriculum/constants'
import { addDays, localNow } from '@/lib/curriculum/core'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const validIsoDate = (v: unknown) => (typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)) ? true : 'Format tanggal YYYY-MM-DD')
/** Field langganan hanya boleh diisi server (overrideAccess) atau staf admin/dukungan, bukan orang tua lewat API. */
const staffOnly: FieldAccess = ({ req }) => familyDataStaff(req)
const billingStaff = { create: staffOnly, update: staffOnly }
const hiddenFromContentStaff = ({ user }: { user: unknown }) => {
  const u = user as { collection?: string; roles?: string[] } | null
  return !(u?.collection === 'users' && u.roles?.some((r) => r === 'admin' || r === 'dukungan'))
}

/** Akun orang tua (login aplikasi). Fase 0: email + kata sandi; OTP menyusul. */
export const Parents: CollectionConfig = {
  slug: 'parents',
  labels: { singular: 'Orang tua', plural: 'Orang tua' },
  admin: { useAsTitle: 'email', group: 'Keluarga', defaultColumns: ['email', 'name', 'createdAt'], hidden: hiddenFromContentStaff },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: { sameSite: 'Lax' },
  },
  access: {
    admin: () => false,
    create: () => true, // pendaftaran publik; keluarga dibuat oleh server action
    read: ({ req }) => familyDataStaff(req) || (isParent(req) && req.user ? { id: { equals: req.user.id } } : false),
    update: ({ req }) => staffHas(req, 'admin') || (isParent(req) && req.user ? { id: { equals: req.user.id } } : false),
    delete: ({ req }) => staffHas(req, 'admin'),
  },
  fields: [
    { name: 'name', label: 'Nama', type: 'text', required: true },
    // Bukti persetujuan kebijakan privasi (UU PDP). Log persetujuan rinci menyusul di koleksi `consents`.
    { type: 'row', fields: [
      { name: 'privacyConsentAt', label: 'Setuju kebijakan privasi', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'privacyVersion', label: 'Versi kebijakan', type: 'text', admin: { readOnly: true } },
    ] },
  ],
}

export const Families: CollectionConfig = {
  slug: 'families',
  labels: { singular: 'Keluarga', plural: 'Keluarga' },
  admin: { useAsTitle: 'name', group: 'Keluarga', hidden: hiddenFromContentStaff },
  access: {
    create: ({ req }) => familyDataStaff(req) || isParent(req),
    read: ({ req }) => familyMemberWhere(req, 'id'),
    update: ({ req }) => familyMemberWhere(req, 'id'),
    delete: ({ req }) => staffHas(req, 'admin'),
  },
  fields: [
    { name: 'name', label: 'Nama keluarga', type: 'text', required: true },
    {
      name: 'members',
      label: 'Anggota',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'parent', type: 'relationship', relationTo: 'parents', required: true, index: true },
        { name: 'role', type: 'select', required: true, defaultValue: 'parent', options: [
          { label: 'Pemilik', value: 'owner' },
          { label: 'Orang tua', value: 'parent' },
          { label: 'Pengasuh', value: 'caregiver' },
        ] },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'city', label: 'Kota', type: 'select', required: true, defaultValue: 'jakarta', options: [
          ...Object.entries(CITIES).map(([value, c]) => ({ label: c[0], value })),
          { label: 'Koordinat sendiri', value: 'custom' },
        ] },
        { name: 'lat', type: 'number', admin: { condition: (_, s) => s?.city === 'custom' } },
        { name: 'lon', type: 'number', admin: { condition: (_, s) => s?.city === 'custom' } },
        { name: 'tz', label: 'Zona waktu', type: 'select', defaultValue: '7', options: [
          { label: 'WIB', value: '7' }, { label: 'WITA', value: '8' }, { label: 'WIT', value: '9' },
        ] },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'themeStart', label: 'Tema dimulai (YYYY-MM-DD)', type: 'text', required: true, validate: validIsoDate },
        { name: 'themeOffset', label: 'Tema awal (0–11)', type: 'number', required: true, defaultValue: 0, min: 0, max: 11 },
        { name: 'appearance', label: 'Tampilan', type: 'select', defaultValue: 'auto', options: [
          { label: 'Otomatis', value: 'auto' }, { label: 'Terang', value: 'light' }, { label: 'Gelap', value: 'dark' },
        ] },
      ],
    },
    // ---------- Langganan (gratis 1 bulan, lalu per anak per tahun) ----------
    { name: 'trialEndsAt', label: 'Masa coba gratis sampai (YYYY-MM-DD)', type: 'text', validate: (v: unknown) => !v || validIsoDate(v), access: billingStaff, admin: { position: 'sidebar', description: 'Diisi otomatis saat keluarga dibuat.' } },
    {
      name: 'waiver',
      label: 'Keringanan biaya',
      type: 'group',
      admin: { position: 'sidebar', description: 'Setujui dengan mengubah status menjadi Disetujui. Bila "berlaku sampai" kosong, otomatis 1 tahun.' },
      access: billingStaff,
      fields: [
        { name: 'status', label: 'Status', type: 'select', defaultValue: 'none', options: [
          { label: 'Tidak ada', value: 'none' }, { label: 'Diajukan', value: 'requested' }, { label: 'Disetujui', value: 'approved' }, { label: 'Ditolak', value: 'rejected' },
        ] },
        { name: 'reason', label: 'Alasan dari keluarga', type: 'textarea' },
        { name: 'requestedAt', label: 'Diajukan pada', type: 'date', admin: { readOnly: true } },
        { name: 'until', label: 'Berlaku sampai (YYYY-MM-DD)', type: 'text', validate: (v: unknown) => !v || validIsoDate(v) },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc }) => {
        const today = localNow(Number(data.tz ?? originalDoc?.tz ?? 7)).date
        if (operation === 'create' && !data.trialEndsAt) data.trialEndsAt = trialEndFor(today)
        // Keringanan disetujui tanpa tanggal: berlaku 1 tahun sejak disetujui.
        if (data.waiver?.status === 'approved' && !data.waiver.until) data.waiver = { ...data.waiver, until: addDays(today, 364) }
        return data
      },
    ],
  },
}

export const Children: CollectionConfig = {
  slug: 'children',
  labels: { singular: 'Anak', plural: 'Anak' },
  admin: { useAsTitle: 'name', group: 'Keluarga', hidden: hiddenFromContentStaff },
  access: {
    create: ({ req }) => familyDataStaff(req) || isParent(req),
    read: ({ req }) => familyMemberWhere(req, 'family'),
    update: ({ req }) => familyMemberWhere(req, 'family'),
    delete: ({ req }) => familyMemberWhere(req, 'family'),
  },
  fields: [
    { name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true },
    { name: 'name', label: 'Nama panggilan', type: 'text', required: true },
    { type: 'row', fields: [
      { name: 'dob', label: 'Tanggal lahir (YYYY-MM-DD)', type: 'text', required: true, validate: validIsoDate },
      { name: 'sex', label: 'Jenis kelamin', type: 'select', options: [{ label: 'Laki-laki', value: 'L' }, { label: 'Perempuan', value: 'P' }] },
    ] },
    { name: 'abilityOverrides', label: 'Penyesuaian kemampuan per cabang', type: 'json', defaultValue: {} },
    { type: 'row', fields: [
      { name: 'load', label: 'Beban harian', type: 'select', defaultValue: DEFAULT_LOAD, options: LOADS.map((l) => ({ label: `${l.name} (${l.label})`, value: l.id })) },
      { name: 'tahfidzTarget', label: 'Target hafalan', type: 'select', defaultValue: DEFAULT_TAHFIDZ, options: TAHFIDZ_TARGETS.map((t) => ({ label: t.name, value: t.id })) },
    ] },
    // Kode modul yang sudah dikuasai anak dan disembunyikan dari Hari ini.
    { name: 'skipModules', label: 'Modul disembunyikan', type: 'json', defaultValue: [] },
    { name: 'paidUntil', label: 'Langganan aktif sampai (YYYY-MM-DD)', type: 'text', index: true, validate: (v: unknown) => !v || validIsoDate(v), access: billingStaff, admin: { position: 'sidebar', description: 'Diperbarui otomatis setelah pembayaran lunas.' } },
  ],
  hooks: {
    beforeChange: [
      // Orang tua hanya boleh menambah anak ke keluarganya sendiri.
      async ({ data, req, operation }) => {
        if (operation === 'create' && isParent(req)) {
          const fam = await req.payload.find({ collection: 'families', where: { id: { equals: data.family } }, req, overrideAccess: false, depth: 0, limit: 1 })
          if (!fam.docs.length) throw new Error('Keluarga tidak ditemukan')
        }
        return data
      },
    ],
  },
}
