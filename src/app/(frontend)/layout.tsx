import type { Metadata, Viewport } from 'next'
import { Amiri } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRegister } from '@/components/pb/pwa-register'
import { THEME_COLORS, THEME_COOKIE } from '@/lib/theme'
import splash from '@/lib/splash.json'
import './globals.css'

// Font Arab untuk basmalah, doa, dan ayat (dimuat sendiri, tidak bergantung font HP).
const amiri = Amiri({ subsets: ['arabic'], weight: ['400', '700'], display: 'swap', variable: '--font-amiri', preload: false })

export const metadata: Metadata = {
  title: { default: 'Pohon Baik', template: '%s · Pohon Baik' },
  description: 'Menemani Ayah dan Bunda mendidik anak 0–15 tahun: akarnya iman, buahnya anak yang tangguh di segala zaman.',
  applicationName: 'Pohon Baik',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192' }],
    apple: '/apple-touch-icon.png',
  },
  // Splash iOS (terang & gelap) agar aplikasi tidak membuka dengan layar putih polos.
  appleWebApp: { capable: true, title: 'Pohon Baik', statusBarStyle: 'default', startupImage: splash },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Android: keyboard menyusutkan layout sehingga form & tombol Simpan tidak tertutup.
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
  ],
}

// Terapkan pilihan tampilan keluarga (cookie) SEBELUM halaman tergambar: tanpa kedip tema yang salah.
const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(!m)return;var t=m[1],d=document.documentElement;d.dataset.theme=t;var c=t==='dark'?'${THEME_COLORS.dark}':'${THEME_COLORS.light}';document.querySelectorAll('meta[name="theme-color"]').forEach(function(x){x.setAttribute('content',c)})}catch(e){}})()`

// Hanya saat pengembangan: redam atribut & galat dari ekstensi browser (mis. Urban VPN) agar
// overlay galat Next.js tidak terganggu. Tidak dikirim ke production (tidak ada monkey-patch DOM).
const devExtensionGuard = `(function(){try{
var oS=Element.prototype.setAttribute,oG=Element.prototype.getAttribute,oH=Element.prototype.hasAttribute;
Element.prototype.setAttribute=function(n,v){if(n==='bis_skin_checked'){this.__bis=v||'1';return}return oS.apply(this,arguments)};
Element.prototype.getAttribute=function(n){if(n==='bis_skin_checked')return this.__bis!==undefined?this.__bis:null;return oG.apply(this,arguments)};
Element.prototype.hasAttribute=function(n){if(n==='bis_skin_checked')return this.__bis!==undefined;return oH.apply(this,arguments)};
var ext=function(s){return /chrome-extension:\\/\\/|moz-extension:\\/\\/|M_ID|bis_|eppiocemhmnlbhjplcgkofciiegomcon/.test(s)};
addEventListener('error',function(e){if(ext((e.filename||'')+' '+((e.error&&e.error.stack)||'')+' '+(e.message||''))){e.stopImmediatePropagation();e.preventDefault()}},true);
addEventListener('unhandledrejection',function(e){var r=e.reason;if(ext(((r&&r.stack)||'')+' '+((r&&r.message)||String(r||'')))){e.stopImmediatePropagation();e.preventDefault()}},true);
var oE=console.error;console.error=function(){var a='';for(var i=0;i<arguments.length;i++){try{a+=(typeof arguments[i]==='string'?arguments[i]:JSON.stringify(arguments[i]))+' '}catch(_){a+=String(arguments[i])+' '}}
if(/hydrat/i.test(a)&&/bis_skin_checked|bis_register|__processed_/.test(a))return;if(/chrome-extension:\\/\\//.test(a)&&/M_ID/.test(a))return;return oE.apply(console,arguments)};
}catch(e){}})()`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={amiri.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {process.env.NODE_ENV !== 'production' && <script dangerouslySetInnerHTML={{ __html: devExtensionGuard }} />}
      </head>
      <body suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
