// Aturan langganan (model C): gratis 1 bulan untuk semua anak, lalu Rp25.000 per anak per tahun.
// Fungsi murni tanpa akses database, dipakai server, hook koleksi, dan uji.
import { addDays, daysBetween } from '@/lib/curriculum/core'

export const TRIAL_DAYS = 30
export const PRICE_PER_CHILD_YEAR = 25_000
/** Pengingat masa coba/perpanjangan mulai tampil sekian hari sebelum berakhir. */
export const REMIND_DAYS = 5
/** Anak yang aktifnya tinggal sekian hari sudah boleh diperpanjang (dipilih otomatis di layar bayar). */
export const RENEW_WINDOW_DAYS = 30

export type WaiverStatus = 'none' | 'requested' | 'approved' | 'rejected'
export type FamilyBilling = { trialEndsAt?: string | null; waiverStatus?: WaiverStatus | null; waiverUntil?: string | null }
export type ChildBilling = { paidUntil?: string | null }
export type AccessStatus = 'paid' | 'waiver' | 'trial' | 'locked'

/** Hari terakhir masa coba (inklusif) untuk keluarga yang mulai pada `start`. */
export const trialEndFor = (start: string) => addDays(start, TRIAL_DAYS - 1)

/** Status akses satu anak pada tanggal tertentu. Urutan: sudah bayar → keringanan → masa coba → terkunci. */
export function accessOn(family: FamilyBilling, child: ChildBilling, date: string): { status: AccessStatus; until: string | null } {
  if (child.paidUntil && date <= child.paidUntil) return { status: 'paid', until: child.paidUntil }
  if (family.waiverStatus === 'approved' && family.waiverUntil && date <= family.waiverUntil) return { status: 'waiver', until: family.waiverUntil }
  if (family.trialEndsAt && date <= family.trialEndsAt) return { status: 'trial', until: family.trialEndsAt }
  return { status: 'locked', until: null }
}

export const isOpen = (family: FamilyBilling, child: ChildBilling, date: string) => accessOn(family, child, date).status !== 'locked'

/** Tambah `n` tahun pada tanggal ISO; 29 Februari menjadi 28 Februari di tahun biasa. */
export function addYears(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const ty = y + n
  const last = new Date(Date.UTC(ty, m, 0)).getUTCDate()
  return `${ty}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/**
 * Masa aktif baru setelah membayar 1 tahun. Tahun berbayar dimulai setelah yang lebih akhir dari:
 * hari ini, masa coba berakhir, atau masa aktif sebelumnya. Jadi membayar lebih awal tidak memotong masa coba.
 */
export function extendPaidUntil(today: string, trialEndsAt: string | null | undefined, paidUntil: string | null | undefined, years = 1) {
  let start = today
  if (trialEndsAt && addDays(trialEndsAt, 1) > start) start = addDays(trialEndsAt, 1)
  if (paidUntil && addDays(paidUntil, 1) > start) start = addDays(paidUntil, 1)
  return addDays(addYears(start, years), -1)
}

/** Anak yang perlu dibayar/diperpanjang: belum bayar, atau masa aktifnya tinggal ≤ RENEW_WINDOW_DAYS. */
export const needsPayment = (child: ChildBilling, today: string) =>
  !child.paidUntil || child.paidUntil < today || daysBetween(today, child.paidUntil) <= RENEW_WINDOW_DAYS

export const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`
