import { notFound } from 'next/navigation'
import { PrayerHero } from '@/components/pb/prayer-hero'
import { SkyScene } from '@/components/pb/sky'
import { ProgressBar, ProgressRing, TreeCard, TreeSvg } from '@/components/pb/tree'
import { TaskRow, WaktuSection } from '@/components/pb/waktu'
import { Button, Card, Chip, Field, Input, LargeTitle, SectionLabel, Subtitle } from '@/components/ui/primitives'
import { computePrayerTimes } from '@/lib/prayer/praytimes'
import { SheetDemo } from './sheet-demo'

export const metadata = { title: 'Design system' }

const pt = computePrayerTimes('2026-10-02', -6.2088, 106.8456, 7)
const SKY: { w: 'subuh' | 'pagi' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'; at: number }[] = [
  { w: 'subuh', at: 280 }, { w: 'pagi', at: 480 }, { w: 'dzuhur', at: 760 }, { w: 'ashar', at: 960 }, { w: 'maghrib', at: 1080 }, { w: 'isya', at: 1260 },
]
const TOKENS = ['bg', 'surface', 'surface-2', 'ink', 'ink-2', 'ink-3', 'brand', 'brand-2', 'brand-soft', 'gold', 'gold-soft', 'danger', 'danger-soft', 'warn-soft']

/** Galeri komponen untuk pengembangan (tidak tersedia di production). */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <main className="mx-auto max-w-[560px] px-4 py-6">
      <LargeTitle>Design system</LargeTitle>
      <Subtitle>Token dan komponen Pohon Baik, dipindah dari prototype.</Subtitle>

      <SectionLabel>Warna</SectionLabel>
      <div className="grid grid-cols-4 gap-2">
        {TOKENS.map((t) => (
          <div key={t} className="text-center text-[11px] text-ink-2">
            <div className="mb-1 h-12 rounded-tile shadow-card" style={{ background: `var(--${t})` }} />
            {t}
          </div>
        ))}
      </div>

      <SectionLabel>Tombol & chip</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary">Utama</Button>
        <Button>Biasa</Button>
        <Button variant="soft" size="sm">Lancar</Button>
        <Button variant="danger" size="sm">Hapus</Button>
        <Chip>Bahasa</Chip>
        <Chip tone="gold">Tema</Chip>
        <Chip tone="soft">Pagi</Chip>
      </div>

      <SectionLabel>Kartu utama (langit hidup)</SectionLabel>
      <PrayerHero greeting="Assalamu'alaikum, Keluarga Contoh" city="Jakarta" tz={7} today={pt} tomorrow={pt} initialNowMin={700} />
      <div className="grid grid-cols-3 gap-2">
        {SKY.map(({ w, at }) => (
          <div key={w} className={`relative h-24 overflow-hidden rounded-tile sky-${w}`}>
            <SkyScene waktu={w} pt={pt} nowMin={at} className="absolute inset-0 size-full" />
            <span className="absolute bottom-1.5 left-2 text-xs font-semibold text-white">{w}</span>
          </div>
        ))}
      </div>

      <SectionLabel>Pohon keluarga</SectionLabel>
      <TreeCard total={12} done={7} fruits={2} streak={5} />
      <div className="grid grid-cols-4 gap-2">
        {[0, 4, 9, 14].map((d, i) => <div key={d} className="rounded-tile bg-surface p-1 shadow-card"><TreeSvg total={14} done={d} fruits={i} /></div>)}
      </div>

      <SectionLabel>Progres</SectionLabel>
      <Card className="flex items-center gap-4">
        <ProgressRing value={0.65} />
        <div className="flex-1"><ProgressBar value={0.4} /></div>
      </Card>

      <SectionLabel>Kartu waktu & tugas</SectionLabel>
      <WaktuSection waktu="subuh" time="04:21" done={3} total={3}>
        <TaskRow title="Dzikir pagi bersama" tag="Iman & Ibadah" done />
      </WaktuSection>
      <WaktuSection waktu="pagi" time="05:35" done={1} total={3} now open>
        <TaskRow title="&quot;Allah yang menciptakan (nama)&quot;: sebut sambil menunjuk mata" tag="Tema" tagTone="gold" />
        <TaskRow title="Ngobrol bolak-balik (5–10 momen per hari)" description="Tanyakan hal yang ia lihat atau lakukan, lalu tunggu jawabannya." tag="Ikatan & Emosi" done />
        <TaskRow title="Membaca dialogis 10 menit" tag="Bahasa" />
      </WaktuSection>

      <SectionLabel>Kartu bertema</SectionLabel>
      <Card tone="tint">Kartu tint: info ringan.</Card>
      <Card tone="gold">Kartu emas: pandangan Islam.</Card>
      <Card tone="warn">Kartu peringatan: kapan perlu konsultasi.</Card>

      <SectionLabel>Formulir & sheet</SectionLabel>
      <Field label="Nama panggilan"><Input placeholder="Aisyah" /></Field>
      <SheetDemo />
    </main>
  )
}
