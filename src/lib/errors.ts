/**
 * Ubah galat apa pun (jaringan, sesi, validasi, pesan Inggris dari framework) menjadi kalimat Indonesia
 * yang ramah untuk ditampilkan di toast. Pesan berbahasa Indonesia dari server action diteruskan apa adanya.
 */
export function pesanGalat(e: unknown, fallback = 'Gagal menyimpan. Coba lagi sebentar lagi.'): string {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  if (!msg) return fallback
  if (/failed to fetch|network|load failed|fetch failed|internet|offline|ECONN|timeout/i.test(msg)) return 'Koneksi terputus. Perubahan akan dicoba lagi saat tersambung.'
  if (/unauthori[sz]ed|forbidden|401|403|not allowed|sesi berakhir/i.test(msg)) return 'Sesi berakhir. Silakan masuk lagi.'
  if (/not found|404/i.test(msg)) return 'Data tidak ditemukan. Muat ulang halaman.'
  if (/server action|unexpected response|An unexpected|Internal Server Error|500/i.test(msg)) return fallback
  // Pesan dari server action kita sudah berbahasa Indonesia; pesan Inggris lain diganti fallback.
  return /[a-z]/i.test(msg) && /\b(the|is|was|could|cannot|invalid|error|failed)\b/i.test(msg) ? fallback : msg
}
