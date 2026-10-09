import { NextResponse, type NextRequest } from 'next/server'

// Pemeriksaan cepat di tepi: tanpa cookie sesi, rute aplikasi langsung diarahkan ke /masuk.
// Validasi token yang sebenarnya tetap dilakukan di server (getParent) dan access control Payload.
const APP_ROUTES = ['/hari-ini', '/tema', '/quran', '/anak', '/keluarga', '/langganan']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) && !req.cookies.has('payload-token')) {
    const url = req.nextUrl.clone()
    url.pathname = '/masuk'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/hari-ini/:path*', '/tema/:path*', '/quran/:path*', '/anak/:path*', '/keluarga/:path*', '/langganan/:path*'] }
