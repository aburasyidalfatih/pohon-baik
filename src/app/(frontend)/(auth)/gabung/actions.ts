'use server'

import config from '@payload-config'
import { login } from '@payloadcms/next/auth'
import { redirect } from 'next/navigation'
import { acceptInvite, findInvite } from '@/lib/server/invites'
import { getParent, payloadClient } from '@/lib/server/payload'
import { PRIVACY_VERSION } from '../../privasi/meta'

export type JoinState = { error?: string; field?: string; values?: Record<string, string> } | undefined
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()

/** Sudah masuk: gabung dengan akun yang sedang dipakai. */
export async function joinAsCurrent(_: JoinState, fd: FormData): Promise<JoinState> {
  const parent = await getParent()
  if (!parent) return { error: 'Sesi berakhir, silakan masuk lagi.' }
  const r = await acceptInvite(parent.id, str(fd, 'token'))
  if (r.error) return { error: r.error }
  redirect('/hari-ini?selamat=1')
}

/** Belum punya akun: buat akun orang tua lalu langsung masuk ke keluarga pengundang. */
export async function signUpAndJoin(_: JoinState, fd: FormData): Promise<JoinState> {
  const token = str(fd, 'token')
  const values = { name: str(fd, 'name'), email: str(fd, 'email').toLowerCase() }
  const password = str(fd, 'password')
  if (!(await findInvite(token))) return { error: 'Undangan sudah tidak berlaku. Minta tautan baru ke anggota keluarga.', values }
  if (!values.name) return { error: 'Tulis nama Anda.', field: 'name', values }
  if (!EMAIL.test(values.email)) return { error: 'Tulis email yang valid.', field: 'email', values }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.', field: 'password', values }
  if (fd.get('consent') !== 'on') return { error: 'Setujui kebijakan privasi untuk melanjutkan.', field: 'consent', values }

  const payload = await payloadClient()
  const exists = await payload.count({ collection: 'parents', where: { email: { equals: values.email } }, overrideAccess: true })
  if (exists.totalDocs) return { error: 'Email ini sudah terdaftar. Pilih "Saya sudah punya akun" lalu masuk.', field: 'email', values }

  const parent = await payload.create({
    collection: 'parents',
    data: { name: values.name, email: values.email, password, privacyConsentAt: new Date().toISOString(), privacyVersion: PRIVACY_VERSION },
    overrideAccess: true,
  })
  const r = await acceptInvite(parent.id, token)
  if (r.error) {
    await payload.delete({ collection: 'parents', id: parent.id, overrideAccess: true }).catch(() => {})
    return { error: r.error, values }
  }
  await login({ collection: 'parents', config, email: values.email, password })
  redirect('/hari-ini?selamat=1')
}
