// Server Component: seluruh teks statis Anakku (profil usia, tanda bahaya, layanan bantuan, modul)
// dirender di server. Hanya pulau kecil yang dihidrasi: tonggak, momen, rapor, sheet, dan wadah sub-tab.
import {
  Ban,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Clock,
  Construction,
  HandHeart,
  Heart,
  Lock,
  MessageCircle,
  Moon,
  MoonStar,
  Phone,
  Smartphone,
  Sprout,
  Stethoscope,
  Target,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { LockedNotice } from '@/components/pb/billing-notice'
import { PageHeader } from '@/components/pb/ui'
import { buttonVariants, Chip, EmptyState, SectionLabel } from '@/components/ui/primitives'
import { CRISIS_CONTACTS, WAKTU, type Waktu } from '@/lib/curriculum/constants'
import { cn } from '@/lib/utils'
import { AnakChildPicker, AnakProvider, AnakTabs, CatatMomenButton, CatatMomenCard, KidAvatar } from './anak-client'
import { MilestoneChecklist } from './milestones'
import { KenangBersama } from './kenang'
import { MomenList } from './momen'
import { TargetChecklist } from './targets'
import { RaporPanel } from './rapor'
import { LAPIS, type AgeProfile, type Branch, type MilestoneGroup, type Moment, type NextAgeProfile, type Pustaka, type RaporMap } from './types'

export type AnakViewProps = {
  today: string
  activeChild: { id: string; name: string; ageLabel: string; phaseName: string }
  childIndex: number
  childrenList: { id: string; name: string }[]
  daysLived: number
  daysToNextBirthday: number
  /** Awal tahun usia berjalan dan usia (tahun), untuk "Kenang bersama". */
  lastBirthday: string
  ageYears: number
  profile: AgeProfile | null
  nextProfile: NextAgeProfile | null
  milestonesDone: Record<string, string>
  moments: Moment[]
  semester: string
  raporMap: RaporMap
  branchesByLapis: Record<string, Branch[]>
  pustaka: Pustaka
  warningAlways: string
}

export function AnakView(p: AnakViewProps) {
  const { activeChild: child } = p
  return (
    <AnakProvider key={child.id} childId={child.id} childName={child.name} today={p.today}>
      <PageHeader title="Anakku" subtitle="Kenali tumbuh kembangnya, catat momen, isi rapor" />
      <AnakChildPicker kids={p.childrenList} value={child.id} />
      <IdentityCard {...p} />
      <AnakTabs
        panels={{
          profil: <KenaliPanel {...p} />,
          momen: (
            <>
              <CatatMomenCard childName={child.name} />
              <KenangBersama moments={p.moments} childName={child.name} today={p.today} lastBirthday={p.lastBirthday} ageYears={p.ageYears} />
              <MomenList moments={p.moments} />
            </>
          ),
          rapor: <RaporPanel childId={child.id} semester={p.semester} branchesByLapis={p.branchesByLapis} rapor={p.raporMap} />,
          modul: <ModulPanel pustaka={p.pustaka} />,
        }}
      />
    </AnakProvider>
  )
}

/** Anak yang langganannya belum aktif: hanya tanda bahaya dan layanan bantuan yang tampil (selalu terbuka). */
export function LockedAnakView({ child, childrenList, warnings, consult, warningAlways, price }: {
  child: { id: string; name: string }
  childrenList: { id: string; name: string }[]
  warnings: string[]
  consult: string[]
  warningAlways: string
  price: number
}) {
  // Daftar skrining usia dan daftar konsultasi profil sebagian sama: tampilkan sekali saja.
  const items = [...new Set([...warnings, ...consult])]
  return (
    <>
      <PageHeader title="Anakku" subtitle="Kenali tumbuh kembangnya, catat momen, isi rapor" />
      <AnakChildPicker kids={childrenList} value={child.id} />
      <LockedNotice kids={[child.name]} price={price} what="Profil usia, momen, rapor, dan modulnya" />
      <Section icon={TriangleAlert} title="Tanda yang perlu dikonsultasikan" tone="warn">
        {items.length > 0 && <div className="mb-2.5"><Bullets items={items} tone="warn" /></div>}
        <p className="text-[0.8125rem] text-warn-ink">{warningAlways}</p>
      </Section>
      <CrisisCard />
    </>
  )
}

// ---------- Kartu identitas anak ----------
function IdentityCard({ activeChild: c, childIndex, daysLived, daysToNextBirthday }: AnakViewProps) {
  return (
    <section aria-label={`Tentang ${c.name}`} className="my-3 flex items-center gap-4 rounded-sheet bg-surface p-4.5 shadow-card">
      <KidAvatar index={childIndex} name={c.name} />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-bold tracking-tight text-ink">{c.name}</h2>
        <p className="text-[0.8125rem] font-medium text-ink-2">
          {c.ageLabel} · Fase {c.phaseName}
        </p>
        <p className="mt-0.5 text-[0.75rem] text-ink-3">
          Hari ke-{daysLived.toLocaleString('id-ID')} ·{' '}
          {daysToNextBirthday === 0 ? 'Hari ini ulang tahun' : `Ultah ${daysToNextBirthday} hari lagi`}
        </p>
      </div>
      <CatatMomenButton />
    </section>
  )
}

// ---------- Kartu seksi dengan ikon lucide (VP10) ----------
const TONES = {
  default: { box: 'bg-surface', title: 'text-ink', body: 'text-ink-2' },
  danger: { box: 'bg-danger-soft', title: 'text-danger', body: 'text-danger' },
  gold: { box: 'bg-gold-soft', title: 'text-warn-ink', body: 'text-ink-2' },
  warn: { box: 'bg-warn-soft', title: 'text-warn-ink', body: 'text-warn-ink' },
} as const

function Section({ icon: Icon, title, tone = 'default', children }: { icon: LucideIcon; title: string; tone?: keyof typeof TONES; children: ReactNode }) {
  const t = TONES[tone]
  return (
    <section className={cn('rounded-card p-4 shadow-card', t.box)}>
      <h3 className={cn('mb-2.5 flex items-center gap-2 text-[0.9375rem] font-bold', t.title)}>
        <Icon size={18} aria-hidden className="flex-none" />
        {title}
      </h3>
      {children}
    </section>
  )
}

function Bullets({ items, tone = 'default', mark = '•' }: { items: string[]; tone?: keyof typeof TONES; mark?: string }) {
  return (
    <ul className={cn('space-y-1.5 text-sm', TONES[tone].body)}>
      {items.map((x, i) => (
        <li key={i} className="flex items-start gap-2">
          <span aria-hidden className="flex-none">
            {mark}
          </span>
          <span>{x}</span>
        </li>
      ))}
    </ul>
  )
}

// ---------- Sub-tab Kenali ----------
function milestoneGroups(profile: AgeProfile): MilestoneGroup[] {
  return [
    ...(profile.milestones ?? []).map((g, gi) => ({
      label: g.age,
      items: g.items.map((text, ii) => ({ key: `${profile.year}-t${gi}-${ii}`, text })),
    })),
    ...(profile.abilities ?? []).map((a, ai) => ({
      label: a.domain,
      items: a.items.map((text, ii) => ({ key: `${profile.year}-b${ai}-${ii}`, text })),
    })),
  ].filter((g) => g.items.length > 0)
}

function KenaliPanel({ profile, nextProfile, activeChild, today, milestonesDone, pustaka, warningAlways, daysToNextBirthday }: AnakViewProps) {
  const groups = profile ? milestoneGroups(profile) : []
  return (
    <>
      {profile ? (
        <>
          <section className="rounded-card bg-gradient-to-br from-brand-soft to-surface p-5 shadow-card">
            <p className="text-[0.75rem] font-bold tracking-wider text-brand-2 uppercase">Usia {profile.label}</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-ink">{profile.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{profile.summary}</p>
          </section>

          {profile.feelings.length > 0 && (
            <Section icon={Heart} title="Yang dirasakan anak">
              <Bullets items={profile.feelings} />
            </Section>
          )}

          {profile.normal.length > 0 && (
            <Section icon={CircleHelp} title="Apakah wajar…?">
              <div className="-my-1 divide-y divide-line">
                {profile.normal.map((n, i) => (
                  <details key={i} className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-sm font-semibold text-ink transition active:opacity-60 [&::-webkit-details-marker]:hidden">
                      <span>{n.q}</span>
                      <ChevronDown size={18} aria-hidden className="flex-none text-ink-3 transition group-open:rotate-180" />
                    </summary>
                    <p className="pb-3 text-[0.8125rem] leading-relaxed text-ink-2">{n.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          )}

          {groups.length > 0 && (
            <Section icon={Sprout} title="Tonggak kemampuan">
              <MilestoneChecklist childId={activeChild.id} today={today} groups={groups} done={milestonesDone} />
            </Section>
          )}

          {pustaka.targets.length > 0 && (
            <Section icon={Target} title="Target capaian usia">
              <TargetChecklist childId={activeChild.id} childName={activeChild.name} targets={pustaka.targets} done={milestonesDone} />
            </Section>
          )}

          {profile.limits.length > 0 && (
            <Section icon={Construction} title="Batas kemampuannya (belum wajar dituntut)">
              <Bullets items={profile.limits} />
            </Section>
          )}

          {profile.stimulation.length > 0 && (
            <Section icon={HandHeart} title="Cara orang tua menstimulasi">
              <Bullets items={profile.stimulation} mark="✓" />
            </Section>
          )}

          {profile.avoid.length > 0 && (
            <Section icon={Ban} title="Yang sebaiknya dihindari" tone="danger">
              <Bullets items={profile.avoid} tone="danger" mark="✕" />
            </Section>
          )}

          {profile.islam.length > 0 && (
            <Section icon={MoonStar} title="Pandangan Islam" tone="gold">
              <ul className="space-y-2 text-sm text-ink-2">
                {profile.islam.map((x, i) => (
                  <li key={i}>
                    {x.text}
                    {x.source && <small className="ml-1 font-semibold text-warn-ink">({x.source})</small>}
                  </li>
                ))}
              </ul>
              {profile.worship && (
                <p className="mt-3 border-t border-line pt-2.5 text-[0.8125rem] text-ink-2">
                  <b className="text-ink">Ibadah di usia ini: </b>
                  {profile.worship}
                </p>
              )}
            </Section>
          )}

          {profile.consult.length > 0 && (
            <Section icon={Stethoscope} title="Kapan perlu konsultasi ke dokter" tone="warn">
              <Bullets items={profile.consult} tone="warn" />
            </Section>
          )}
        </>
      ) : (
        <div className="rounded-card bg-surface shadow-card">
          <EmptyState icon={<BookOpen size={28} />} title="Profil usia belum tersedia">
            Materi untuk usia {activeChild.name} sedang disiapkan.
          </EmptyState>
        </div>
      )}

      {/* Tanda bahaya: tampil di semua usia */}
      <Section icon={TriangleAlert} title="Tanda yang perlu dikonsultasikan" tone="warn">
        {pustaka.warnings && pustaka.warnings.length > 0 && (
          <div className="mb-2.5">
            <Bullets items={pustaka.warnings} tone="warn" />
          </div>
        )}
        <p className="text-[0.8125rem] text-warn-ink">{warningAlways}</p>
      </Section>

      <CrisisCard />

      {nextProfile && (
        <section className="rounded-card border border-dashed border-ink-4 bg-surface/60 p-5">
          <p className="flex items-center gap-2 text-[0.75rem] font-bold text-ink-3 uppercase">
            <Lock size={14} aria-hidden />
            Intip tahun depan · Usia {nextProfile.label}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink">{nextProfile.title}</h3>
          <p className="mt-1 text-[0.8125rem] text-ink-2">{nextProfile.summary}</p>
          {nextProfile.wajarSamples.length > 0 && (
            <ul className="mt-2.5 space-y-1 text-[0.8125rem] text-ink-3">
              {nextProfile.wajarSamples.map((w, i) => (
                <li key={i}>
                  <span aria-hidden>• </span>
                  {w}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.75rem] font-semibold text-brand-2">
            Terbuka lengkap saat {activeChild.name} berulang tahun ({daysToNextBirthday} hari lagi).
          </p>
        </section>
      )}
    </>
  )
}

/** Layanan bantuan dengan tombol telepon/WhatsApp langsung. */
function CrisisCard() {
  return (
    <Section icon={Phone} title="Butuh bantuan sekarang?">
      <p className="-mt-1 mb-3 text-[0.8125rem] text-ink-2">
        Gratis dan rahasia. Simpan nomor ini di HP orang tua dan, untuk anak yang lebih besar, di HP mereka juga.
      </p>
      <ul className="space-y-3.5 text-sm">
        {CRISIS_CONTACTS.map((c) => {
          const tel = c.how.match(/Telepon (\d+)/)?.[1]
          const wa = c.how.match(/WhatsApp ([\d-]+)/)?.[1]?.replace(/-/g, '').replace(/^0/, '62')
          return (
            <li key={c.name}>
              <b>{c.name}</b> <span className="text-ink-2">· {c.how}</span>
              <span className="block text-[0.8125rem] text-ink-2">{c.for}</span>
              {(tel || wa) && (
                <span className="mt-1.5 flex flex-wrap gap-2">
                  {tel && (
                    <a href={`tel:${tel}`} className={buttonVariants({ variant: 'soft', size: 'sm' })}>
                      <Phone size={15} aria-hidden /> Telepon {tel}
                    </a>
                  )}
                  {wa && (
                    <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'default', size: 'sm' })}>
                      <MessageCircle size={15} aria-hidden /> WhatsApp
                    </a>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

// ---------- Sub-tab Modul ----------
function ModulPanel({ pustaka }: { pustaka: Pustaka }) {
  const rows: { icon: LucideIcon; label: string; text: string }[] = [
    { icon: Clock, label: 'Slot belajar', text: pustaka.slotIlmu },
    {
      icon: Moon,
      label: 'Kebutuhan tidur',
      text: `${pustaka.sleep.jam}, sekitar pukul ${pustaka.sleep.pukul}${pustaka.sleep.catatan ? `. ${pustaka.sleep.catatan}` : ''}`,
    },
    { icon: Smartphone, label: 'Aturan layar & gawai', text: pustaka.screen },
  ]
  return (
    <>
      <section className="divide-y divide-line rounded-card bg-surface px-4 shadow-card">
        {rows.map(({ icon: Icon, label, text }) => (
          <div key={label} className="flex gap-3 py-3 text-[0.8125rem]">
            <Icon size={18} aria-hidden className="mt-0.5 flex-none text-brand-2" />
            <p>
              <b className="text-ink">{label}: </b>
              <span className="text-ink-2">{text}</span>
            </p>
          </div>
        ))}
      </section>


      {LAPIS.map((lapis) => {
        const list = pustaka.modulesByLapis[lapis] ?? []
        if (list.length === 0) return null
        return (
          <section key={lapis}>
            <SectionLabel>{lapis}</SectionLabel>
            <div className="space-y-2.5">
              {list.map((g) => (
                <div key={g.branchCode} className="rounded-card bg-surface p-4 shadow-card">
                  <h3 className="mb-2 text-[0.75rem] font-bold tracking-wider text-brand-2 uppercase">{g.branchName}</h3>
                  <ul className="space-y-2.5">
                    {g.items.map((m) => (
                      <li key={m.id} className="text-[0.8125rem]">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <b className="text-ink">{m.title}</b>
                          {m.daily ? (
                            <Chip tone="brand">Harian · {m.waktu ? (WAKTU[m.waktu as Waktu]?.name ?? 'Waktu') : 'Waktu'}</Chip>
                          ) : (
                            <Chip tone="soft">Target pekanan</Chip>
                          )}
                        </div>
                        {m.desc && <p className="mt-0.5 text-ink-2">{m.desc}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
