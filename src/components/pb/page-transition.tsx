import { ViewTransition, type ReactNode } from 'react'

/**
 * Pembungkus isi setiap halaman tab agar perpindahan terasa native:
 * - pindah tab (Link tab bar, `transitionTypes={['tab']}`) → memudar + naik sedikit
 * - geser hari di Hari ini (`hari-maju` / `hari-mundur`) → bergeser ke arah yang benar
 * Navigasi lain (Back browser, refresh) tidak dianimasikan. Harus dipasang di page.tsx, bukan layout.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const map = { tab: 'tab-fade', 'hari-maju': 'hari-maju', 'hari-mundur': 'hari-mundur', default: 'none' }
  return (
    <ViewTransition enter={map} exit={map} default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}
