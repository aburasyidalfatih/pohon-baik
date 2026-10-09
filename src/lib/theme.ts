// Tampilan (terang/gelap) pilihan keluarga, disimpan juga di cookie agar diterapkan sebelum halaman tergambar.
export const THEME_COOKIE = 'pb-theme'
export const THEME_COLORS = { light: '#f5f4ef', dark: '#0e1310' } as const
export type Appearance = 'auto' | 'light' | 'dark'
