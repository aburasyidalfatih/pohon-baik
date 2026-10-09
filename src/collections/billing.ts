import type { CollectionConfig } from 'payload'
import { familyDataStaff, familyMemberWhere, staffHas } from '@/access'

/**
 * Pesanan langganan (Rp25.000 per anak per tahun). Dibuat dan diubah hanya oleh server
 * (overrideAccess): orang tua bisa membaca pesanan keluarganya, tidak bisa membuat atau mengubahnya lewat API.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pesanan', plural: 'Pesanan' },
  admin: {
    useAsTitle: 'orderId',
    group: 'Keluarga',
    defaultColumns: ['orderId', 'family', 'amount', 'status', 'createdAt'],
    hidden: ({ user }) => !(user?.collection === 'users' && (user as { roles?: string[] }).roles?.some((r) => r === 'admin' || r === 'dukungan')),
  },
  defaultSort: '-createdAt',
  access: {
    read: ({ req }) => familyMemberWhere(req, 'family'),
    create: ({ req }) => staffHas(req, 'admin'),
    update: ({ req }) => staffHas(req, 'admin'),
    delete: ({ req }) => staffHas(req, 'admin'),
  },
  fields: [
    { name: 'orderId', label: 'Nomor pesanan', type: 'text', required: true, unique: true, index: true },
    { name: 'family', type: 'relationship', relationTo: 'families', required: true, index: true },
    { name: 'parent', label: 'Dibuat oleh', type: 'relationship', relationTo: 'parents' },
    {
      name: 'items',
      label: 'Anak',
      type: 'array',
      minRows: 1,
      fields: [
        // Tidak wajib: bila anak dihapus, riwayat pesanan tetap ada (nama tersimpan di childName).
        { name: 'child', type: 'relationship', relationTo: 'children' },
        { name: 'childName', label: 'Nama saat dipesan', type: 'text', required: true },
        { name: 'price', label: 'Harga', type: 'number', required: true },
        { name: 'paidUntil', label: 'Aktif sampai (setelah lunas)', type: 'text' },
      ],
    },
    { name: 'amount', label: 'Jumlah (Rp)', type: 'number', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'pending', index: true, options: [
      { label: 'Menunggu pembayaran', value: 'pending' },
      { label: 'Lunas', value: 'paid' },
      { label: 'Gagal/dibatalkan', value: 'failed' },
      { label: 'Kedaluwarsa', value: 'expired' },
      { label: 'Dikembalikan (refund)', value: 'refunded' },
    ] },
    { name: 'gateway', label: 'Gerbang', type: 'select', required: true, options: [
      { label: 'Midtrans', value: 'midtrans' },
      { label: 'Simulasi (pengembangan)', value: 'simulasi' },
    ] },
    { name: 'paymentUrl', label: 'Tautan pembayaran', type: 'text' },
    { name: 'paymentType', label: 'Metode', type: 'text' },
    { name: 'paidAt', label: 'Lunas pada', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    // Diisi sekali saat masa aktif anak diperpanjang (penjaga agar notifikasi ganda tidak memperpanjang dua kali).
    { name: 'appliedAt', label: 'Masa aktif diterapkan pada', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'lastNotification', label: 'Notifikasi terakhir dari gerbang', type: 'json', access: { read: ({ req }) => familyDataStaff(req) }, admin: { readOnly: true } },
  ],
}
