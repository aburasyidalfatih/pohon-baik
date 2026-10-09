'use client'

import { useEffect } from 'react'
import { THEME_COLORS, THEME_COOKIE, type Appearance } from '@/lib/theme'

/** Terapkan tampilan ke <html data-theme>, warna bilah status (theme-color), dan cookie (untuk muatan berikutnya). */
export function applyAppearance(appearance: Appearance | string | null | undefined) {
  const el = document.documentElement
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
  if (appearance === 'light' || appearance === 'dark') {
    el.dataset.theme = appearance
    metas.forEach((m) => m.setAttribute('content', THEME_COLORS[appearance]))
    document.cookie = `${THEME_COOKIE}=${appearance}; path=/; max-age=31536000; samesite=lax`
  } else {
    delete el.dataset.theme
    metas.forEach((m) => m.setAttribute('content', m.media.includes('dark') ? THEME_COLORS.dark : THEME_COLORS.light))
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`
  }
}

/** Menyelaraskan pilihan tampilan keluarga (otomatis/terang/gelap) dari server. */
export function ThemeSync({ appearance }: { appearance: string | null | undefined }) {
  useEffect(() => applyAppearance(appearance), [appearance])
  return null
}
