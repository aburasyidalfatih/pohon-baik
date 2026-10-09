// Penyusun daftar tugas harian per anak (port dari `tasksFor` prototype).
// Fungsi murni: semua materi dikirim sebagai argumen, sehingga bisa diuji tanpa database.
// ID tugas sengaja sama dengan prototype agar cadangan lama bisa diimpor apa adanya.

import { PHASES, sleepInfo, tierAllowed, WAKTU_KEYS, type Load, type Waktu } from './constants'
import { ageMonths, weekday } from './core'

export type TaskKind = 'mod' | 'tema' | 'sleep' | 'quran'
export type Task = { id: string; t: string; d?: string | null; c: string; kind: TaskKind }
export type TasksByWaktu = Record<Waktu, Task[]>

export type ModuleLite = { code: string; branchCode: string; minMonths: number; maxMonths: number; daily: boolean; waktu?: string | null; title: string; description?: string | null; tier?: string | null }
export type ThemeTaskLite = { text: string; waktu: string; order: number }
export type ChildLite = { id: string; dob: string; abilityOverrides?: Record<string, string> | null; load?: Load | string | null; skipModules?: string[] | null }

/** Usia efektif per cabang: penyesuaian kemampuan menggeser usia ke rentang fase yang dipilih. */
export function effMonths(child: ChildLite, branchCode: string, date: string) {
  const m = ageMonths(child.dob, date)
  const ov = child.abilityOverrides?.[branchCode]
  if (!ov || ov === 'auto') return m
  const p = PHASES.find((x) => x.id === ov)
  return p ? Math.min(Math.max(m, p.min), p.max) : m
}

/**
 * Tugas tema yang tampil pada satu hari. Satu minggu berisi 2–4 kegiatan pekanan; tugas digilir
 * agar tidak muncul ulang setiap hari: Penuh 2 per hari, Seimbang 1 per hari,
 * Inti 1 per hari hanya Sabtu dan Ahad.
 */
export function themeTasksToday<T extends { order: number }>(tasks: T[], load: string | null | undefined, dayInWeek: number, wd: number): T[] {
  const sorted = [...tasks].sort((a, b) => a.order - b.order)
  const n = sorted.length
  if (!n) return []
  if (load === 'inti') return wd === 6 || wd === 0 ? [sorted[(wd === 6 ? 0 : 1) % n]] : []
  if (load === 'penuh') return n <= 2 ? sorted : [sorted[(dayInWeek * 2) % n], sorted[(dayInWeek * 2 + 1) % n]]
  return [sorted[dayInWeek % n]]
}

export function emptyTasks(): TasksByWaktu {
  return Object.fromEntries(WAKTU_KEYS.map((w) => [w, []])) as unknown as TasksByWaktu
}

export function tasksFor(args: {
  child: ChildLite
  date: string
  modules: ModuleLite[]
  theme: { idx: number; week: number; dayIn?: number; bandCode: string; tasks: ThemeTaskLite[] | null }
  quranDueLabels?: string[]
  /** Waktu shalat untuk menghitung jam tidur (Subuh besok, Isya hari ini). */
  prayer?: { subuhBesok: string; isya: string }
}): TasksByWaktu {
  const { child, date, modules, theme, quranDueLabels = [], prayer } = args
  const out = emptyTasks()
  const m = ageMonths(child.dob, date)
  if (m > 191) return out

  if (quranDueLabels.length) {
    out.subuh.push({ id: 'q-due', t: `Murajaah: ${quranDueLabels.join(', ')}`, d: "Tandai lancar atau ulang di tab Qur'an.", c: 'B1', kind: 'quran' })
  }
  const skip = new Set(child.skipModules ?? [])
  for (const mod of modules) {
    if (!mod.daily || !mod.waktu || skip.has(mod.code) || !tierAllowed(mod.tier, child.load)) continue
    const em = effMonths(child, mod.branchCode, date)
    if (em >= mod.minMonths && em <= mod.maxMonths && mod.waktu in out) {
      out[mod.waktu as Waktu].push({ id: mod.code, t: mod.title, d: mod.description, c: mod.branchCode, kind: 'mod' })
    }
  }
  // Tugas tema (yang giliran hari ini) tampil paling atas di waktunya masing-masing.
  if (theme.tasks?.length) {
    const today = themeTasksToday(theme.tasks, child.load, ((theme.dayIn ?? 1) - 1) % 7, weekday(date))
    for (let i = today.length - 1; i >= 0; i--) {
      const x = today[i]
      const w = (x.waktu in out ? x.waktu : 'pagi') as Waktu
      out[w].unshift({ id: `tema-${theme.idx}-${theme.bandCode}-${theme.week}-${x.order}`, t: x.text, c: 'tema', kind: 'tema' })
    }
  }
  const sl = sleepInfo(m, prayer)
  if (sl.qailulah) {
    out.dzuhur.push({ id: 'qailulah', t: `Qailulah ±${sl.qailulah} menit`, d: `Tidur siang singkat untuk melengkapi tidur malam (target ${sl.jam} per hari). Istirahat siang ini biasa dilakukan para sahabat (HR Bukhari) dan membantu konsentrasi.`, c: 'B4', kind: 'sleep' })
  }
  out.isya.push({ id: 'tidur', t: `Tidur ${sl.pukul}`, d: `Target ${sl.jam} per hari. ${sl.catatan ? `${sl.catatan} ` : ''}Lampu redup, gawai di luar kamar.`, c: 'B4', kind: 'sleep' })
  return out
}

export const countTasks = (t: TasksByWaktu) => WAKTU_KEYS.reduce((n, w) => n + t[w].length, 0)
