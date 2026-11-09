import { timingSafeEqual } from 'node:crypto'
import { sendPrayerReminders } from '@/lib/server/push'

export const dynamic = 'force-dynamic'

const authorized = (req: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '')
  const want = Buffer.from(secret)
  return got.length === want.length && timingSafeEqual(got, want)
}

/**
 * Pengingat waktu shalat. Jadwalkan tiap 5 menit (Dokploy → Schedules, atau cron eksternal):
 *   curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<domain>/cron/prayer-push
 * Aman dipanggil berulang: setiap perangkat menerima satu pengingat per waktu.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false }, { status: 401 })
  return Response.json({ ok: true, ...(await sendPrayerReminders()) })
}
export const POST = GET
