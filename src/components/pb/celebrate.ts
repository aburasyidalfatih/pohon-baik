'use client'

/** Daun beterbangan kecil saat satu waktu atau satu hari tuntas. */
export function celebrate(n = 16) {
  if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const box = document.createElement('div')
  box.className = 'confetti'
  box.setAttribute('aria-hidden', 'true')
  const em = ['🍃', '🌿', '✨', '🌱', '🍃']
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span')
    s.textContent = em[i % em.length]
    s.style.setProperty('--x', `${((Math.random() * 2 - 1) * 170).toFixed(0)}px`)
    s.style.setProperty('--y', `${(-140 - Math.random() * 200).toFixed(0)}px`)
    s.style.setProperty('--r', `${(Math.random() * 720 - 360).toFixed(0)}deg`)
    s.style.animationDelay = `${(Math.random() * 140).toFixed(0)}ms`
    box.appendChild(s)
  }
  document.body.appendChild(box)
  setTimeout(() => box.remove(), 1800)
}

const HAPTIC_KEY = 'pb-haptic'
export const hapticEnabled = () => {
  try {
    return localStorage.getItem(HAPTIC_KEY) !== 'off'
  } catch {
    return true
  }
}
export const setHapticEnabled = (on: boolean) => {
  try {
    if (on) localStorage.removeItem(HAPTIC_KEY)
    else localStorage.setItem(HAPTIC_KEY, 'off')
  } catch {
    // penyimpanan tidak tersedia (mode privat)
  }
}

/**
 * Getaran singkat. Android: Vibration API. iPhone (Safari iOS 18+): Vibration API tidak ada,
 * tetapi mengetuk `<input type="checkbox" switch>` memicu haptik sistem, jadi dipakai sebagai cadangan.
 * Hanya bekerja di dalam gestur pengguna (ketukan), dan bisa dimatikan di Keluarga → Getar.
 */
export const haptic = (ms: number | number[] = 8) => {
  if (typeof navigator === 'undefined' || !hapticEnabled()) return
  // Browser menolak getar sebelum pengguna pernah mengetuk halaman (dan mencatat galat di konsol).
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (ua && !ua.hasBeenActive) return
  if ('vibrate' in navigator) {
    navigator.vibrate(ms)
    return
  }
  try {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    label.appendChild(input)
    document.head.appendChild(label)
    label.click()
    label.remove()
  } catch {
    // tidak didukung: diam saja
  }
}
