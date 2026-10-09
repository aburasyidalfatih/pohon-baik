// Pohon Baik Service Worker
// Prinsip:
// - Halaman (HTML/RSC) TIDAK disimpan: isinya data keluarga & anak (privasi, UU PDP).
//   Saat offline, navigasi menampilkan halaman statis /offline.
// - Aset statis ber-hash (_next/static) disimpan cache-first per versi build; versi lama dihapus saat aktif.
// - Ikon & manifest: stale-while-revalidate (perubahan ikon tetap sampai ke pengguna).
// - Versi baru tidak langsung mengambil alih halaman yang terbuka; aplikasi menampilkan
//   "Versi baru tersedia · Muat ulang", lalu mengirim SKIP_WAITING.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const STATIC_CACHE = `pb-static-${VERSION}`
const SHELL_CACHE = `pb-shell-${VERSION}`
const OFFLINE_URL = '/offline'
const SHELL = [OFFLINE_URL, '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        SHELL.map((url) =>
          fetch(url, { cache: 'reload', redirect: 'follow' }).then((res) => {
            // Jangan pernah menyimpan respons hasil redirect (Safari menolaknya untuk navigasi).
            if (res.ok && !res.redirected) return cache.put(url, res)
          }),
        ),
      ),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, SHELL_CACHE])
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key)
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable()
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CLEAR') event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))))
})

const isStatic = (url) => url.pathname.startsWith('/_next/static/')
const isIcon = (url) => /^\/(icon[^/]*\.(png|svg)|apple-touch-icon\.png|manifest\.webmanifest|splash\/.+\.png)$/.test(url.pathname)

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // API, admin, dan data RSC selalu ke jaringan (Next.js useOffline menangani pengulangan).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse
          return preload || (await fetch(request))
        } catch {
          const offline = await caches.match(OFFLINE_URL, { cacheName: SHELL_CACHE })
          return offline || new Response('Sedang offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
        }
      })(),
    )
    return
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit) return hit
        const res = await fetch(request)
        if (res.ok && !res.redirected) cache.put(request, res.clone())
        return res
      }),
    )
    return
  }

  if (isIcon(url)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(request)
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok && !res.redirected) cache.put(request, res.clone())
            return res
          })
          .catch(() => hit)
        return hit || fresh
      }),
    )
  }
})
