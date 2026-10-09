import { payloadClient } from '@/lib/server/payload'

export const dynamic = 'force-dynamic'

/** Health check untuk Docker/Dokploy: memastikan aplikasi dan database merespons. */
export async function GET() {
  try {
    const payload = await payloadClient()
    await payload.count({ collection: 'themes', overrideAccess: true })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
