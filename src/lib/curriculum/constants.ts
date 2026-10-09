// Konstanta kurikulum yang bersifat aturan/logika (bukan materi yang diedit tim konten).
// Asal: prototype `app/content.js`.

export const WAKTU_KEYS = ['subuh', 'pagi', 'dzuhur', 'ashar', 'maghrib', 'isya', 'hari'] as const
export type Waktu = (typeof WAKTU_KEYS)[number]

export const WAKTU: Record<Waktu, { name: string; sub: string }> = {
  subuh: { name: "Ba'da Subuh", sub: "Qur'an & raga" },
  pagi: { name: 'Pagi', sub: 'Slot ilmu' },
  dzuhur: { name: "Ba'da Dzuhur", sub: 'Makan, istirahat, baca santai' },
  ashar: { name: "Ba'da Ashar", sub: 'Alam & tangan' },
  maghrib: { name: 'Maghrib–Isya', sub: 'Majelis keluarga · bebas gawai' },
  isya: { name: "Ba'da Isya", sub: 'Tidur cepat' },
  hari: { name: 'Sepanjang hari', sub: 'Kebiasaan' },
}

export const LAPIS = ['Akar', 'Batang', 'Cabang', 'Buah'] as const
export type Lapis = (typeof LAPIS)[number]

export const PHASES = [
  { id: 'F1', name: 'Dekapan', label: '0–2 th', min: 0, max: 35 },
  { id: 'F2', name: 'Cinta', label: '3–6 th', min: 36, max: 83 },
  { id: 'F3', name: 'Pembiasaan', label: '7–9 th', min: 84, max: 119 },
  { id: 'F4', name: 'Penguatan', label: '10–12 th', min: 120, max: 155 },
  { id: 'F5', name: 'Peran', label: '13–15 th', min: 156, max: 191 },
] as const
export type Phase = (typeof PHASES)[number]

export const SLOT_ILMU: Record<Phase['id'], string> = {
  F1: "Tidak ada slot belajar formal. Belajar terjadi lewat interaksi, main lantai, dan rutinitas.",
  F2: "3–4 th: ±20–30 menit total, 2–3 permainan × 5–10 menit (bunyi, bilangan), selebihnya main bebas. 5–6 th: ±30–45 menit, 2 blok × 10–15 menit + main terarah sesuai tema. Anak TK/RA: cukup ±15 menit sepulang sekolah (baca dialogis + permainan bunyi atau bilangan).",
  F3: "Jalur homeschool: ±1,5–2 jam (Bahasa 40 · Matematika 30 · Tema 30 · Baca mandiri 20 menit). Anak sekolah: cukup ±20–30 menit di rumah termasuk PR (baca bersama 10–15 · fakta matematika 5 · baca mandiri 10).",
  F4: "Jalur homeschool: ±3 jam (Bahasa 45 · Matematika 45 · Tema/IPAS 45 · Arab 20 · Baca mandiri 30 menit). Anak sekolah: cukup ±30–45 menit di rumah termasuk PR (baca mandiri 20 · fakta/kuis 5–10 · Arab 10).",
  F5: "Jalur homeschool: ±4 jam (Bahasa 45 · Matematika 60 · Tema/riset 60 · Arab 30 · Belajar mandiri 45 menit). Anak sekolah: cukup ±30–45 menit di rumah termasuk PR.",
}

// ---------- beban harian per anak ----------
export const LOADS = [
  { id: 'inti', name: 'Inti', label: '±15 menit', desc: 'Orang tua bekerja, anak bersekolah. Hanya kebiasaan terpenting; tugas tema di akhir pekan.' },
  { id: 'seimbang', name: 'Seimbang', label: '±45 menit', desc: 'Anak bersekolah, ada waktu sore. Inti + beberapa kegiatan; satu tugas tema per hari.' },
  { id: 'penuh', name: 'Penuh', label: 'Homeschool', desc: 'Keluarga homeschool. Semua modul dan dua tugas tema per hari.' },
] as const
export type Load = (typeof LOADS)[number]['id']
export const DEFAULT_LOAD: Load = 'seimbang'
export const loadRank = (l?: string | null) => Math.max(0, LOADS.findIndex((x) => x.id === (l ?? DEFAULT_LOAD)))
/** Modul tampil bila tingkatnya (inti < seimbang < penuh) tidak melebihi beban anak. */
export const tierAllowed = (tier: string | null | undefined, load: string | null | undefined) => loadRank(tier ?? 'penuh') <= loadRank(load)

export const TAHFIDZ_TARGETS = [
  { id: 'kualitas', name: 'Kualitas dulu', desc: 'Tahsin dan surah pendek sesuai kemampuan, tanpa target jumlah.' },
  { id: 'juz30', name: 'Juz 30', desc: 'Juz 30 menjelang usia 13 tahun beserta arti surah pendek (target kurikulum).' },
  { id: 'juz29-30', name: 'Juz 29–30', desc: 'Untuk anak yang lancar dan menikmati hafalan.' },
  { id: 'intensif', name: '3 juz atau lebih', desc: 'Mengikuti program tahfidz sekolah/pesantren. Jaga murajaah dan pemahaman.' },
] as const
export type TahfidzTarget = (typeof TAHFIDZ_TARGETS)[number]['id']
export const DEFAULT_TAHFIDZ: TahfidzTarget = 'juz30'

// ---------- tidur ----------
const hhmm = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`
}
const toMin = (t: string) => {
  const [h, m] = t.split(/[:.]/).map(Number)
  return h * 60 + m
}
const dur = (min: number) => `${Math.floor(min / 60)} jam${min % 60 ? ` ${min % 60} menit` : ''}`

export type SleepInfo = { jam: string; pukul: string; catatan?: string; qailulah?: number }

/**
 * Kebutuhan tidur per 24 jam (AASM/WHO) dan jam tidur malam.
 * Anak ≥6 th yang dibangunkan Subuh: jam tidur dihitung mundur dari Subuh besok.
 * Bila malam tidak cukup (Isya belum lama lewat), kekurangannya ditutup qailulah setelah Dzuhur.
 */
export function sleepInfo(m: number, pt?: { subuhBesok: string; isya: string }): SleepInfo {
  if (m < 4) return { jam: '14–17 jam', pukul: 'mengikuti bayi' }
  if (m < 12) return { jam: '12–16 jam (termasuk tidur siang)', pukul: '±19.00' }
  if (m < 36) return { jam: '11–14 jam (termasuk tidur siang)', pukul: '±19.00–19.30' }
  if (m < 72) return { jam: '10–13 jam (termasuk tidur siang)', pukul: '±19.30–20.00', catatan: 'Belum perlu dibangunkan Subuh; biarkan bangun sendiri.' }
  const teen = m >= 156
  const need = (teen ? 8 : 9) * 60
  const jam = teen ? '8–10 jam' : '9–12 jam'
  const fallback = m < 120 ? '±19.30–20.00' : m < 156 ? '±20.00–20.30' : '±21.00'
  if (!pt) return { jam, pukul: fallback, catatan: 'Bila dibangunkan Subuh dan tidur malam kurang, lengkapi dengan qailulah (tidur siang singkat) setelah Dzuhur.' }
  const wake = Math.floor((toMin(pt.subuhBesok) - 10) / 5) * 5
  const ideal = Math.floor((wake - need - 15) / 15) * 15 // 15 menit untuk terlelap
  // Batas paling awal yang masuk akal: setelah Isya dan makan malam keluarga.
  const earliest = Math.ceil((toMin(pt.isya) + (teen ? 90 : m >= 120 ? 60 : 45)) / 15) * 15
  const bed = Math.max(ideal + 1440 * (ideal < 0 ? 1 : 0), earliest)
  const night = wake + 1440 - bed - 15
  const gap = Math.max(0, need - night)
  const qailulah = gap ? Math.min(90, Math.ceil(gap / 15) * 15) : 0
  return {
    jam,
    pukul: `±${hhmm(bed)}`,
    qailulah,
    catatan: `Bangun Subuh ±${hhmm(wake)}, tidur malam ±${dur(night)}.${qailulah ? ` Lengkapi dengan qailulah ±${qailulah} menit setelah Dzuhur.` : ''}`,
  }
}

// ---------- layanan bantuan (diverifikasi Oktober 2026) ----------
export const CRISIS_CONTACTS = [
  { name: 'Healing119', how: 'Telepon 119, lalu tekan 8', for: 'Dukungan kesehatan jiwa, termasuk pikiran bunuh diri. Untuk anak, remaja, dan orang tua.' },
  { name: 'SAPA 129', how: 'Telepon 129 · WhatsApp 08111-129-129', for: 'Kekerasan pada anak dan perempuan, termasuk kekerasan seksual, sekstorsi, dan perundungan berat (KemenPPPA).' },
  { name: '112', how: 'Telepon 112', for: 'Darurat: bahaya nyata saat ini, kecelakaan, atau ancaman langsung.' },
] as const

export function screenRule(m: number) {
  if (m < 24) return 'Tanpa layar, kecuali video call keluarga (WHO 2019). HP orang tua juga diparkir saat menyusui, menyuapi, dan bermain; TV tidak menyala sebagai latar.';
  if (m < 60) return 'Paling banyak 1 jam sehari, lebih sedikit lebih baik, selalu ditonton bersama (WHO 2019). Konten lambat yang dipilih orang tua. Tidak punya perangkat sendiri. Pantang layar: bukan penenang tantrum, tanpa video pendek dan autoplay, tidak saat makan, tidak 1 jam sebelum tidur.';
  if (m < 84) return 'Paling banyak 1 jam sehari, ditemani. Konten pilihan; video hanya dari daftar putar yang dipilih orang tua, tanpa akun anak. Tidak punya perangkat sendiri. Pantang layar: bukan penenang tantrum, tanpa video pendek dan autoplay, tidak saat makan, tidak 1 jam sebelum tidur.';
  if (m < 120) return "Perangkat keluarga di ruang bersama, setelah Qur'an dan tugas selesai. Video ditonton tanpa akun anak dan ditemani. Tidak ada akun gim dengan chat terbuka. Tidak punya HP pribadi. Pantang layar: tanpa video pendek dan autoplay, tidak saat makan, tidak 1 jam sebelum tidur, gawai tidak masuk kamar.";
  if (m < 156) return 'Untuk belajar sesuai Kontrak Digital. Tanpa akun media sosial, YouTube, Discord, atau Telegram sendiri (PP Tunas: di bawah 13 tahun hanya layanan berisiko rendah yang dirancang untuk anak, dengan izin orang tua). Layar hiburan paling banyak 2 jam di hari libur. Filter DNS di router dan kontrol orang tua di perangkat. Pantang layar: tanpa video pendek dan autoplay, tidak saat makan, tidak 1 jam sebelum tidur, gawai tidak masuk kamar.';
  return 'HP pribadi dengan kontrol orang tua yang terbuka (anak tahu apa yang dipantau), dilonggarkan bertahap sesuai rekam jejak. PP Tunas: sebelum 16 tahun belum boleh punya akun media sosial atau platform berisiko tinggi; 13–15 tahun hanya layanan berisiko rendah dengan izin orang tua; 16–17 tahun tetap dengan izin orang tua. Tanpa AI companion. Gawai diparkir di luar kamar ≥1 jam sebelum tidur. Tidak ada rahasia yang membahayakan: bila terlanjur melihat atau melakukan yang salah, cerita dulu, diselesaikan bersama tanpa marah.';
}

export const WEEK_NAMES = ['Kenali', 'Selidiki', 'Kerjakan', 'Karyakan'] as const
export const WEEK_GENERIC = [
  'Kisah dan ayat jangkar, tadabbur, kosakata tema (Indonesia–Arab–Inggris).',
  'Sains/sosial tema: amati, baca, eksperimen. Matematika dari tema.',
  'Keterampilan hidup dan kesiapan krisis terkait tema (praktik nyata).',
  'Proyek tema, presentasi di Hari Karya, khidmah, ulasan bulan.',
] as const

/** Murajaah berjarak: ulangan pada hari ke-n setelah setoran lancar. */
export const INTERVALS = [1, 2, 4, 7, 14, 30] as const

export const WARNING_ALWAYS =
  "Kehilangan kemampuan yang sebelumnya sudah dikuasai, di usia berapa pun, perlu segera dikonsultasikan. Bayi prematur: pakai usia koreksi (usia sejak lahir dikurangi jumlah minggu lahir lebih awal) sampai usia 2 tahun. Gunakan KPSP/Buku KIA di posyandu, puskesmas, atau dokter anak; untuk anak sekolah, juga guru BK atau psikolog. Daftar ini skrining, bukan diagnosis. Butuh pertolongan segera: 112 (darurat), Healing119 (telepon 119 ekstensi 8) untuk kesehatan jiwa, SAPA 129 (WhatsApp 08111-129-129) untuk kekerasan pada anak."

// [nama, lintang, bujur, zona waktu]
export const CITIES: Record<string, [string, number, number, number]> = {
  jakarta: ['Jakarta', -6.2088, 106.8456, 7], bekasi: ['Bekasi', -6.2383, 106.9756, 7], bogor: ['Bogor', -6.595, 106.8166, 7],
  depok: ['Depok', -6.4025, 106.7942, 7], tangerang: ['Tangerang', -6.1783, 106.6319, 7], bandung: ['Bandung', -6.9175, 107.6191, 7],
  semarang: ['Semarang', -6.9667, 110.4167, 7], yogyakarta: ['Yogyakarta', -7.7956, 110.3695, 7], solo: ['Solo', -7.5755, 110.8243, 7],
  surabaya: ['Surabaya', -7.2575, 112.7521, 7], malang: ['Malang', -7.9666, 112.6326, 7], bandaaceh: ['Banda Aceh', 5.5483, 95.3238, 7],
  medan: ['Medan', 3.5952, 98.6722, 7], padang: ['Padang', -0.9471, 100.4172, 7], pekanbaru: ['Pekanbaru', 0.5071, 101.4478, 7],
  palembang: ['Palembang', -2.9761, 104.7754, 7], lampung: ['Bandar Lampung', -5.3971, 105.2668, 7], pontianak: ['Pontianak', -0.0263, 109.3425, 7],
  banjarmasin: ['Banjarmasin', -3.3186, 114.5944, 8], balikpapan: ['Balikpapan', -1.2379, 116.8529, 8], samarinda: ['Samarinda', -0.5022, 117.1536, 8],
  makassar: ['Makassar', -5.1477, 119.4327, 8], manado: ['Manado', 1.4748, 124.8421, 8], denpasar: ['Denpasar', -8.6705, 115.2126, 8],
  mataram: ['Mataram', -8.5833, 116.1167, 8], kupang: ['Kupang', -10.1772, 123.607, 8], ambon: ['Ambon', -3.6954, 128.1814, 9],
  jayapura: ['Jayapura', -2.5337, 140.7181, 9],
}

export const SURAH_LIST: [string, number][] = [
  ['Al-Fatihah', 7], ["An-Naba'", 40], ["An-Nazi'at", 46], ["'Abasa", 42], ['At-Takwir', 29], ['Al-Infithar', 19],
  ['Al-Muthaffifin', 36], ['Al-Insyiqaq', 25], ['Al-Buruj', 22], ['Ath-Thariq', 17], ["Al-A'la", 19], ['Al-Ghasyiyah', 26],
  ['Al-Fajr', 30], ['Al-Balad', 20], ['Asy-Syams', 15], ['Al-Lail', 21], ['Adh-Dhuha', 11], ['Al-Insyirah', 8],
  ['At-Tin', 8], ["Al-'Alaq", 19], ['Al-Qadr', 5], ['Al-Bayyinah', 8], ['Az-Zalzalah', 8], ["Al-'Adiyat", 11],
  ["Al-Qari'ah", 11], ['At-Takatsur', 8], ["Al-'Ashr", 3], ['Al-Humazah', 9], ['Al-Fil', 5], ['Quraisy', 4],
  ["Al-Ma'un", 7], ['Al-Kautsar', 3], ['Al-Kafirun', 6], ['An-Nashr', 3], ['Al-Lahab', 5], ['Al-Ikhlas', 4],
  ['Al-Falaq', 5], ['An-Nas', 6],
]
