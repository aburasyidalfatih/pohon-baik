import { BackButton } from './back-button'
import { PrivacyContent } from './content'

export const metadata = { title: 'Kebijakan privasi' }

export default function PrivasiPage() {
  return (
    <main className="page-enter mx-auto min-h-dvh max-w-[560px] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <nav className="sticky top-0 z-10 -mx-5 bg-bg/90 px-5 pt-[calc(0.25rem+env(safe-area-inset-top))] backdrop-blur-xl">
        <BackButton />
      </nav>
      <h1 className="mt-2 mb-3 text-[2rem] leading-tight font-bold tracking-[-0.02em]">Kebijakan privasi</h1>
      <PrivacyContent />
    </main>
  )
}
