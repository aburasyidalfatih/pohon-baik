import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Versi aplikasi per build: menamai cache service worker sehingga setiap deploy memicu "Versi baru tersedia".
const APP_VERSION = process.env.APP_VERSION || new Date().toISOString().replace(/\D/g, '').slice(0, 12)

const nextConfig: NextConfig = {
  output: 'standalone',
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  experimental: {
    // Impor cadangan prototype dikirim lewat Server Action (foto dipisahkan di browser).
    serverActions: { bodySizeLimit: '4mb' },
    // Navigasi & Server Action yang gagal karena sinyal hilang ditahan lalu dikirim ulang otomatis.
    useOffline: true,
    // Catatan: `staleTimes.dynamic` sengaja tidak dipakai. Payload memperingatkan data basi di panel
    // admin, dan centang harian harus selalu segar. Rasa instan saat pindah tab datang dari loading.tsx.
    // 404 bergaya aplikasi untuk URL yang tidak dikenal (ada dua root layout: frontend & admin).
    globalNotFound: true,
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Catatan: tidak memakai Clear-Site-Data saat keluar. Next menerapkannya ke respons server action
      // sehingga navigasi ke /masuk terputus. Halaman aplikasi sudah no-store, service worker tidak
      // menyimpan data keluarga, dan CacheStorage dibersihkan klien (clearAppCaches) sebelum keluar.
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
