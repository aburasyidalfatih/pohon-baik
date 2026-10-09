import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

// ---------- Button ----------
// Tinggi minimal 44px (md) / 40px + area sentuh 44px (sm, icon) sesuai HIG & Material.
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-[14px] font-semibold transition active:scale-[.97] active:opacity-85 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-2',
  {
    variants: {
      variant: {
        default: 'bg-fill text-ink',
        primary: 'bg-brand-2 text-on-brand',
        soft: 'bg-brand-soft text-brand',
        danger: 'bg-danger-soft text-danger',
        dangerSolid: 'bg-danger-strong text-white',
        link: 'bg-transparent p-0 text-brand-2 active:scale-100',
      },
      size: { md: 'min-h-12 px-4 py-3 text-base', sm: 'hit min-h-10 rounded-[12px] px-3.5 py-2 text-sm', icon: 'hit size-10 rounded-full p-0' },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>
export function Button({ className, variant, size, block, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}

// ---------- Card ----------
const cardVariants = cva('rounded-card my-3 p-4', {
  variants: {
    tone: {
      default: 'bg-surface shadow-card',
      tint: 'bg-brand-soft',
      gold: 'bg-gold-soft',
      warn: 'bg-warn-soft',
    },
  },
  defaultVariants: { tone: 'default' },
})
export function Card({ className, tone, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ tone }), className)} {...props} />
}

// ---------- Chip / tag ----------
const chipVariants = cva('inline-block whitespace-nowrap rounded-md px-1.5 py-px align-[1px] text-[0.75rem] font-semibold', {
  variants: {
    tone: { brand: 'bg-brand-soft text-brand', gold: 'bg-gold-soft text-gold-ink', soft: 'bg-fill text-ink-2' },
  },
  defaultVariants: { tone: 'brand' },
})
export function Chip({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chipVariants>) {
  return <span className={cn(chipVariants({ tone }), className)} {...props} />
}

// ---------- Teks halaman ----------
export const LargeTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1 className={cn('mt-0.5 text-[2rem] leading-tight font-bold tracking-[-0.02em]', className)} {...p} />
)
export const Subtitle = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mb-3.5 text-sm text-ink-2', className)} {...p} />
)
export const SectionLabel = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('mx-1 mt-5 mb-2 text-[0.8125rem] font-semibold tracking-[.04em] text-ink-2 uppercase', className)} {...p} />
)

// ---------- Form ----------
/** Satu kolom isian: `<label>` membungkus SATU kontrol. Untuk grup tombol/radio pakai `FieldGroup`. */
export function Field({ label, children, hint, error, id }: { label: string; children: React.ReactNode; hint?: string; error?: string | null; id?: string }) {
  return (
    <label className="my-2.5 block" htmlFor={id}>
      <span className="mb-1.5 ml-1 block text-[0.8125rem] font-semibold text-ink-2">{label}</span>
      {children}
      {error ? (
        <span id={id ? `${id}-err` : undefined} role="alert" className="mt-1 ml-1 block text-[0.8125rem] font-medium text-danger">{error}</span>
      ) : hint ? (
        <span id={id ? `${id}-hint` : undefined} className="mt-1 ml-1 block text-xs text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}
/** Grup pilihan (radio, segmented, tombol) dengan `<fieldset>`/`<legend>`; mengetuk judul tidak memilih apa pun. */
export function FieldGroup({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <fieldset className={cn('my-2.5 min-w-0 border-0 p-0', className)}>
      <legend className="mb-1.5 ml-1 block p-0 text-[0.8125rem] font-semibold text-ink-2">{label}</legend>
      {children}
      {hint && <span className="mt-1 ml-1 block text-xs text-ink-3">{hint}</span>}
    </fieldset>
  )
}
const inputCls = 'w-full min-h-12 rounded-field border-0 bg-surface-2 px-3.5 py-3 text-base text-ink outline-none focus:ring-2 focus:ring-brand-2 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger'
export const Input = ({ className, ...p }: React.ComponentProps<'input'>) => <input className={cn(inputCls, className)} {...p} />
export const Select = ({ className, ...p }: React.ComponentProps<'select'>) => <select className={cn(inputCls, className)} {...p} />
export const Textarea = ({ className, ...p }: React.ComponentProps<'textarea'>) => <textarea className={cn(inputCls, 'min-h-24 resize-none', className)} {...p} />

// ---------- Keadaan kosong ----------
export function EmptyState({ icon, title, children, action, className }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-8 text-center', className)}>
      {icon && <div className="mb-3 grid size-16 place-items-center rounded-[20px] bg-brand-soft text-brand" aria-hidden>{icon}</div>}
      <b className="text-[1.0625rem]">{title}</b>
      {children && <p className="mt-1 max-w-[30ch] text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ---------- Skeleton (layar memuat) ----------
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div aria-hidden className={cn('skeleton', className)} {...p} />
