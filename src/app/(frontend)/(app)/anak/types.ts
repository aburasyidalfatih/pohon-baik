// Tipe & konstanta bersama Anakku (dipakai Server Component dan pulau klien).

export type AnakTab = 'profil' | 'momen' | 'rapor' | 'modul'
export const ANAK_TABS: { value: AnakTab; label: string }[] = [
  { value: 'profil', label: 'Kenali' },
  { value: 'momen', label: 'Momen' },
  { value: 'rapor', label: 'Rapor' },
  { value: 'modul', label: 'Modul' },
]
export const toAnakTab = (t: string | null | undefined): AnakTab =>
  ANAK_TABS.some((x) => x.value === t) ? (t as AnakTab) : 'profil'

export type MomentCategory = 'bisa' | 'kata' | 'ibadah' | 'lucu' | 'syukur' | 'catatan'

// Emoji boleh untuk kategori momen (VP10), selalu dibungkus aria-hidden saat dirender.
export const MOMENT_CATS: { key: MomentCategory; label: string; emoji: string }[] = [
  { key: 'bisa', label: 'Bisa baru', emoji: '✨' },
  { key: 'kata', label: 'Ucapan', emoji: '💬' },
  { key: 'ibadah', label: 'Ibadah', emoji: '🤲' },
  { key: 'lucu', label: 'Lucu', emoji: '😄' },
  { key: 'syukur', label: 'Syukur', emoji: '💛' },
  { key: 'catatan', label: 'Catatan', emoji: '📝' },
]

export type Moment = {
  id: string
  date: string
  category: MomentCategory
  text: string
  source: string
  milestoneKey?: string | null
  hasPhoto?: boolean
}

export type MilestoneGroup = { label: string; items: { key: string; text: string }[] }

export type Branch = { code: string; name: string; lapis: string }
export type RaporMap = Record<string, { level: number; note: string }>

export const LAPIS = ['Akar', 'Batang', 'Cabang', 'Buah'] as const

export type AgeProfile = {
  year: number
  label: string
  title: string
  summary: string
  feelings: string[]
  normal: { q: string; a: string }[]
  milestones: { age: string; items: string[] }[]
  abilities: { domain: string; items: string[] }[]
  limits: string[]
  stimulation: string[]
  avoid: string[]
  islam: { text: string; source?: string | null }[]
  worship?: string | null
  consult: string[]
}

export type NextAgeProfile = {
  year: number
  label: string
  title: string
  summary: string
  wajarSamples: string[]
}

export type Pustaka = {
  slotIlmu: string
  sleep: { jam: string; pukul: string; catatan?: string }
  screen: string
  targets: string[]
  modulesByLapis: Record<
    string,
    {
      branchName: string
      branchCode: string
      items: { id: string; title: string; desc: string; daily: boolean; waktu?: string | null }[]
    }[]
  >
  warnings: string[] | null
}
