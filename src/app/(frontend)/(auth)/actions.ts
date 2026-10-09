'use server'

import config from '@payload-config'
import { login, logout } from '@payloadcms/next/auth'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { CITIES } from '@/lib/curriculum/constants'
import { localNow } from '@/lib/curriculum/core'
import { payloadClient } from '@/lib/server/payload'
import type { Family } from '@/payload-types'
import { PRIVACY_VERSION } from '../privasi/meta'

/**
 * Hasil form auth. `field` menunjuk kolom yang salah dan `step` langkah onboarding yang relevan
 * (1 akun, 2 keluarga, 3 anak & persetujuan) agar galat tampil inline di tempat yang tepat.
 */
export type AuthState = { error?: string; field?: string; step?: 1 | 2 | 3; values?: Record<string, string>; sent?: boolean } | undefined

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, 'email').toLowerCase()
  const password = str(fd, 'password')
  if (!EMAIL.test(email)) return { error: 'Tulis email yang valid.', field: 'email', values: { email } }
  if (!password) return { error: 'Tulis kata sandi.', field: 'password', values: { email } }
  try {
    await login({ collection: 'parents', config, email, password })
  } catch (e) {
    const locked = e instanceof Error && /lock/i.test(e.message)
    return {
      error: locked ? 'Terlalu banyak percobaan. Coba lagi 10 menit lagi, atau atur ulang kata sandi.' : 'Email atau kata sandi salah.',
      field: 'password',
      values: { email },
    }
  }
  redirect('/hari-ini')
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const values = {
    name: str(fd, 'name'), email: str(fd, 'email').toLowerCase(), family: str(fd, 'family'), city: str(fd, 'city') || 'jakarta',
    childName: str(fd, 'childName'), childDob: str(fd, 'childDob'),
  }
  const password = str(fd, 'password')
  if (!values.name) return { error: 'Tulis nama Anda.', field: 'name', step: 1, values }
  if (!EMAIL.test(values.email)) return { error: 'Tulis email yang valid.', field: 'email', step: 1, values }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.', field: 'password', step: 1, values }
  if (!values.family) return { error: 'Tulis nama keluarga.', field: 'family', step: 2, values }
  if (!CITIES[values.city]) return { error: 'Pilih kota.', field: 'city', step: 2, values }
  if (values.childName && !isIsoDate(values.childDob)) return { error: 'Isi tanggal lahir anak.', field: 'childDob', step: 3, values }
  if (values.childDob && values.childDob > localNow(CITIES[values.city][3]).date) return { error: 'Tanggal lahir tidak boleh di masa depan.', field: 'childDob', step: 3, values }
  if (fd.get('consent') !== 'on') return { error: 'Setujui kebijakan privasi untuk melanjutkan.', field: 'consent', step: 3, values }

  const payload = await payloadClient()
  const exists = await payload.count({ collection: 'parents', where: { email: { equals: values.email } }, overrideAccess: true })
  if (exists.totalDocs) return { error: 'Email ini sudah terdaftar. Silakan masuk, atau atur ulang kata sandi.', field: 'email', step: 1, values }

  let parent
  try {
    parent = await payload.create({ collection: 'parents', data: { name: values.name, email: values.email, password, privacyConsentAt: new Date().toISOString(), privacyVersion: PRIVACY_VERSION } })
  } catch (e) {
    console.error('[daftar] gagal membuat akun', e)
    return { error: 'Akun belum bisa dibuat. Periksa email Anda atau coba lagi sebentar lagi.', field: 'email', step: 1, values }
  }
  try {
    const tz = CITIES[values.city][3]
    const family = await payload.create({
      collection: 'families',
      overrideAccess: true,
      data: {
        name: values.family,
        members: [{ parent: parent.id, role: 'owner' }],
        city: values.city as Family['city'],
        tz: String(tz) as '7' | '8' | '9',
        themeStart: localNow(tz).date,
        themeOffset: 0,
      },
    })
    if (values.childName) {
      await payload.create({ collection: 'children', overrideAccess: true, data: { family: family.id, name: values.childName, dob: values.childDob } })
    }
  } catch (e) {
    console.error('[daftar] gagal menyiapkan keluarga', e)
    await payload.delete({ collection: 'parents', id: parent.id, overrideAccess: true }).catch(() => {})
    return { error: 'Pendaftaran belum berhasil. Coba lagi sebentar lagi.', step: 3, values }
  }
  await login({ collection: 'parents', config, email: values.email, password })
  // ?selamat=1 membuka lembar sambutan singkat di Hari ini.
  redirect('/hari-ini?selamat=1')
}

export async function signOut() {
  const payload = await payloadClient()
  // Tutup sesi di server (bila gagal, tetap lanjut: cookie di bawah selalu dihapus).
  try {
    const res = await logout({ config })
    if (!res.success) console.warn('logout Payload:', res.message)
  } catch (e) {
    console.warn('logout Payload gagal:', e)
  }
  // Hapus cookie sesi secara eksplisit: logout() Payload tidak selalu menghapusnya untuk koleksi
  // orang tua, sehingga pengguna tetap masuk. Atribut disamakan dengan cookie saat login.
  const store = await cookies()
  for (const c of store.getAll()) {
    if (c.name === `${payload.config.cookiePrefix}-token` || c.name.startsWith(`${payload.config.cookiePrefix}-token`)) {
      store.set(c.name, '', { path: '/', maxAge: 0, expires: new Date(0), httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && (process.env.SERVER_URL ?? '').startsWith('https') })
    }
  }
  // ?keluar menampilkan pesan "Anda sudah keluar" di halaman masuk.
  redirect('/masuk?keluar=1')
}

// ---------- Lupa & atur ulang kata sandi ----------

// Batas sederhana per email (per proses server) agar tautan tidak dikirim bertubi-tubi.
const lastResetRequest = new Map<string, number>()
const RESET_INTERVAL_MS = 60_000

/** Asal URL untuk tautan email. Production WAJIB memakai SERVER_URL (header Host bisa dipalsukan). */
async function appOrigin(): Promise<string | null> {
  const env = process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL
  if (env) return env.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') return null
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

const resetEmailHtml = (url: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#171a17">
  <p>Assalamu'alaikum,</p>
  <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Pohon Baik Anda. Ketuk tombol di bawah dalam 1 jam:</p>
  <p><a href="${url}" style="display:inline-block;background:#2b6e48;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Atur kata sandi baru</a></p>
  <p style="color:#5c625b;font-size:14px">Atau salin tautan ini: ${url}</p>
  <p style="color:#5c625b;font-size:14px">Bila Anda tidak meminta ini, abaikan email ini. Kata sandi lama tetap berlaku.</p>
</div>`

/** Selalu menjawab netral (tidak membocorkan email mana yang terdaftar). */
export async function requestPasswordReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, 'email').toLowerCase()
  if (!EMAIL.test(email)) return { error: 'Tulis email yang valid.', field: 'email', values: { email } }

  const now = Date.now()
  if (now - (lastResetRequest.get(email) ?? 0) < RESET_INTERVAL_MS) return { sent: true, values: { email } }
  lastResetRequest.set(email, now)

  try {
    const payload = await payloadClient()
    // Email dikirim sendiri (bukan bawaan Payload) karena tautan bawaan mengarah ke /admin/reset,
    // padahal orang tua tidak punya akses admin. Tautan kita: /atur-sandi?token=…
    const token = await payload.forgotPassword({ collection: 'parents', data: { email }, disableEmail: true })
    const origin = await appOrigin()
    if (token && !origin) console.error('[lupa-sandi] SERVER_URL belum diatur; email atur ulang tidak dikirim')
    if (token && origin) {
      const url = `${origin}/atur-sandi?token=${encodeURIComponent(token)}`
      if (process.env.NODE_ENV !== 'production') console.info(`[lupa-sandi] Tautan atur ulang untuk ${email}: ${url}`)
      await payload.sendEmail({
        from: `"${payload.email.defaultFromName}" <${payload.email.defaultFromAddress}>`,
        to: email,
        subject: 'Atur ulang kata sandi Pohon Baik',
        html: resetEmailHtml(url),
      })
    }
  } catch (e) {
    console.error('[lupa-sandi] gagal memproses permintaan', e)
  }
  return { sent: true, values: { email } }
}

export async function resetPassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const token = str(fd, 'token')
  const password = str(fd, 'password')
  const confirmPw = str(fd, 'confirm')
  if (!token) return { error: 'Tautan tidak lengkap. Minta tautan baru.', field: 'token' }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.', field: 'password' }
  if (password !== confirmPw) return { error: 'Kedua kata sandi belum sama.', field: 'confirm' }

  let email = ''
  try {
    const payload = await payloadClient()
    const res = await payload.resetPassword({ collection: 'parents', data: { token, password }, overrideAccess: true })
    email = typeof res.user?.email === 'string' ? res.user.email : ''
  } catch {
    return { error: 'Tautan sudah kedaluwarsa atau sudah dipakai. Minta tautan baru.', field: 'token' }
  }

  // Masuk otomatis dengan sandi baru; bila gagal, arahkan ke halaman masuk dengan pesan sukses.
  let loggedIn = false
  if (email) {
    try {
      await login({ collection: 'parents', config, email, password })
      loggedIn = true
    } catch {
      loggedIn = false
    }
  }
  redirect(loggedIn ? '/hari-ini' : '/masuk?sandi=baru')
}
