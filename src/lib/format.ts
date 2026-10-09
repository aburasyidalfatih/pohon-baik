import { weekday } from './curriculum/core'

export const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${HARI[weekday(iso)]}, ${d} ${BULAN[m - 1]} ${y}`
}

export function hijri(iso: string) {
  try {
    const [y, m, d] = iso.split('-').map(Number)
    const s = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
    return `${s.replace(/\s?(SH|AH|H)$/, '')} H`
  } catch {
    return ''
  }
}
