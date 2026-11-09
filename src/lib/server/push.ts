import 'server-only'
import { sendNotification, setVapidDetails, WebPushError } from 'web-push'
import { WAKTU } from '@/lib/curriculum/constants'
import { localNow, prayerFor } from '@/lib/curriculum/core'
import { composeBody, dueWaktu } from '@/lib/push/schedule'
import type { Parent } from '@/payload-types'
import { getDay } from './day'
import { payloadClient } from './payload'

// Kunci VAPID: `npx web-push generate-vapid-keys`. Publik dikirim ke browser, privat hanya di server.
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || ''
export const pushConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)

let ready = false
function setup() {
  if (ready) return
  setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:halo@pohonbaik.id', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  ready = true
}

/**
 * Kirim pengingat waktu shalat ke semua perangkat yang berlangganan. Dipanggil cron (mis. tiap 5 menit).
 * Isi: tugas waktu itu untuk anak yang langganannya aktif, plus Majelis Malam saat Maghrib.
 */
export async function sendPrayerReminders(now = Date.now()) {
  if (!pushConfigured()) return { sent: 0, removed: 0, skipped: 'VAPID belum diatur' }
  setup()
  const payload = await payloadClient()
  const subs = await payload.find({ collection: 'pushSubscriptions', limit: 0, pagination: false, depth: 0, overrideAccess: true })

  // Kelompokkan per keluarga: tugas cukup dihitung sekali per keluarga.
  const byFamily = new Map<string, typeof subs.docs>()
  for (const s of subs.docs) {
    const fid = typeof s.family === 'object' ? s.family.id : s.family
    byFamily.set(fid, [...(byFamily.get(fid) ?? []), s])
  }

  let sent = 0, removed = 0
  for (const [familyId, list] of byFamily) {
    try {
      const family = await payload.findByID({ collection: 'families', id: familyId, depth: 0, overrideAccess: true })
      const tz = Number(family.tz ?? 7)
      const { date, minutes } = localNow(tz, now)
      const pt = prayerFor({ city: family.city, lat: family.lat, lon: family.lon, tz }, date)
      const pending = list.filter((s) => dueWaktu(pt, date, minutes, s.lastSent))
      if (!pending.length) continue
      const waktu = dueWaktu(pt, date, minutes, null)!

      const parentId = typeof pending[0].parent === 'object' ? pending[0].parent.id : pending[0].parent
      const parent = (await payload.findByID({ collection: 'parents', id: parentId, depth: 0, overrideAccess: true })) as Parent
      const children = (await payload.find({ collection: 'children', where: { family: { equals: familyId } }, sort: 'dob', depth: 0, limit: 20, overrideAccess: true })).docs
      const day = await getDay({ parent: { ...parent, collection: 'parents' } as Parent, family, children }, date)
      const kids = day.kids.filter((k) => !k.locked).map((k) => ({ name: k.name, tasks: k.tasks[waktu].filter((t) => !k.done.includes(t.id)).map((t) => t.t) }))
      const body = composeBody(kids, waktu === 'maghrib' && day.majelis && !day.familyDone.includes('majelis') ? day.majelis.story : null)

      for (const s of pending) {
        // Tandai dulu agar cron yang tumpang tindih tidak mengirim dua kali.
        await payload.update({ collection: 'pushSubscriptions', id: s.id, data: { lastSent: `${date}|${waktu}` }, overrideAccess: true })
        if (!body) continue
        try {
          await sendNotification(
            { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
            JSON.stringify({ title: `${WAKTU[waktu].name} · ${pt[waktu]}`, body, url: '/hari-ini', tag: 'pb-waktu' }),
            { TTL: 60 * 40, urgency: 'normal' },
          )
          sent++
        } catch (e) {
          if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) {
            await payload.delete({ collection: 'pushSubscriptions', id: s.id, overrideAccess: true })
            removed++
          } else console.warn('[push] gagal kirim', e instanceof Error ? e.message : e)
        }
      }
    } catch (e) {
      console.error('[push] gagal memproses keluarga', familyId, e)
    }
  }
  return { sent, removed }
}
