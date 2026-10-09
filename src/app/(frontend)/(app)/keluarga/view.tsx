'use client'

import { Check, ChevronRight, Download, LocateFixed, LogOut, Plus, Receipt, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { haptic, hapticEnabled, setHapticEnabled } from '@/components/pb/celebrate'
import { useConfirm, useToast } from '@/components/pb/feedback'
import { clearAppCaches } from '@/components/pb/pwa-register'
import { Sheet } from '@/components/pb/sheet'
import { applyAppearance } from '@/components/pb/theme-sync'
import { kidColor, PageHeader, Segmented } from '@/components/pb/ui'
import { Button, Field, FieldGroup, Input, SectionLabel, Select } from '@/components/ui/primitives'
import { CITIES, LOADS, PHASES, TAHFIDZ_TARGETS, type Load, type TahfidzTarget } from '@/lib/curriculum/constants'
import { ageLabel } from '@/lib/curriculum/core'
import { pesanGalat } from '@/lib/errors'
import type { Appearance } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { setModuleHidden } from '../actions'
import { deleteChild, exportBackupJson, saveChild, updateFamilySettings } from './actions'
import { ImportForm } from './import-form'

export type KeluargaViewProps = {
  today: string
  /** Ringkasan langganan untuk baris "Langganan" (mis. "Masa coba gratis · 12 hari lagi"). */
  billing: { summary: string; attention: boolean }
  themes: { order: number; title: string; surah: string }[]
  parent: {
    id: string
    name: string
    email: string
  }
  family: {
    id: string
    name: string
    city: string
    lat?: number | null
    lon?: number | null
    tz?: string | null
    themeStart: string
    themeOffset: number
    appearance?: 'auto' | 'light' | 'dark' | null
  }
  kids: {
    id: string
    name: string
    dob: string
    sex?: 'L' | 'P' | null
    abilityOverrides?: Record<string, string> | null
    load: string
    tahfidzTarget: string
    skipModules: string[]
  }[]
  branches: { code: string; name: string }[]
  signOutAction: () => Promise<void>
}

type Settings = {
  name: string
  city: string
  lat: string
  lon: string
  tz: string
  themeStart: string
  themeOffset: number
  appearance: Appearance
}
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const NUM = /^-?\d+(\.\d+)?$/
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
const TZ_NAME: Record<string, string> = { '7': 'WIB', '8': 'WITA', '9': 'WIT' }

/** Zona waktu Indonesia dari bujur (WIB < 112,5° ≤ WITA < 127,5° ≤ WIT). Di luar Indonesia: null. */
function tzFromCoords(lat: number, lon: number): string | null {
  if (lat < -11.5 || lat > 6.5 || lon < 94.5 || lon > 141.5) return null
  return lon < 112.5 ? '7' : lon < 127.5 ? '8' : '9'
}

function settingsErrors(s: Settings) {
  const e: Partial<Record<'name' | 'lat' | 'lon' | 'themeStart', string>> = {}
  if (!s.name.trim()) e.name = 'Nama keluarga wajib diisi'
  if (s.city === 'custom') {
    const lat = Number(s.lat), lon = Number(s.lon)
    if (!s.lat.trim()) e.lat = 'Isi lintang'
    else if (!NUM.test(s.lat.trim())) e.lat = 'Gunakan angka, mis. -6.2'
    else if (lat < -90 || lat > 90) e.lat = 'Lintang antara -90 dan 90'
    if (!s.lon.trim()) e.lon = 'Isi bujur'
    else if (!NUM.test(s.lon.trim())) e.lon = 'Gunakan angka, mis. 106.8'
    else if (lon < -180 || lon > 180) e.lon = 'Bujur antara -180 dan 180'
  }
  if (!isIsoDate(s.themeStart)) e.themeStart = 'Pilih tanggal'
  return e
}

// Sakelar getar disimpan per perangkat (localStorage); dibaca lewat useSyncExternalStore agar aman saat hidrasi.
const hapticListeners = new Set<() => void>()
const subscribeHaptic = (fn: () => void) => {
  hapticListeners.add(fn)
  return () => {
    hapticListeners.delete(fn)
  }
}

export function KeluargaView({ today, billing, themes, parent, family, kids, branches, signOutAction }: KeluargaViewProps) {
  const toast = useToast()
  const confirm = useConfirm()

  // ---------- Pengaturan keluarga: tersimpan otomatis per kolom ----------
  const [st, setSt] = useState<Settings>(() => ({
    name: family.name,
    city: family.city,
    lat: family.lat != null ? String(family.lat) : '',
    lon: family.lon != null ? String(family.lon) : '',
    tz: family.tz || '7',
    themeStart: family.themeStart,
    themeOffset: family.themeOffset,
    appearance: family.appearance ?? 'auto',
  }))
  const latest = useRef(st)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const seq = useRef(0)
  const [locating, setLocating] = useState(false)
  const errs = settingsErrors(st)

  function persist() {
    if (debounce.current) {
      clearTimeout(debounce.current)
      debounce.current = null
    }
    if (Object.keys(settingsErrors(latest.current)).length) return // kolom salah ditandai inline; tunggu diperbaiki
    const id = ++seq.current
    setSaveState('saving')
    queue.current = queue.current.then(async () => {
      if (id !== seq.current) return // ada perubahan lebih baru yang akan mengirim nilai terakhir
      const s = latest.current
      try {
        await updateFamilySettings({
          name: s.name,
          city: s.city,
          lat: s.city === 'custom' ? Number(s.lat) : undefined,
          lon: s.city === 'custom' ? Number(s.lon) : undefined,
          tz: s.tz,
          themeStart: s.themeStart,
          themeOffset: s.themeOffset,
          appearance: s.appearance,
        })
        if (id === seq.current) setSaveState('saved')
      } catch (e) {
        if (id === seq.current) setSaveState('error')
        toast(pesanGalat(e, 'Pengaturan belum tersimpan. Coba lagi.'), { variant: 'error' })
      }
    })
  }

  /** Ubah satu/lebih kolom. Pilihan disimpan segera; teks ditunda sebentar (debounce). */
  function update(patch: Partial<Settings>, mode: 'now' | 'later' = 'now') {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setSt(next)
    if (debounce.current) clearTimeout(debounce.current)
    if (mode === 'later') {
      debounce.current = setTimeout(persist, 800)
      setSaveState('idle')
    } else persist()
  }
  const flush = () => {
    if (debounce.current) persist()
  }

  // Simpan perubahan teks yang masih tertunda saat meninggalkan layar.
  const persistRef = useRef(persist)
  useEffect(() => {
    persistRef.current = persist
  })
  useEffect(() => {
    const pending = debounce
    return () => {
      if (pending.current) persistRef.current()
    }
  }, [])

  function chooseAppearance(v: Appearance) {
    applyAppearance(v) // pratinjau seketika (tema, warna bilah status, cookie)
    update({ appearance: v })
  }

  function locateMe() {
    if (!('geolocation' in navigator)) {
      toast('Perangkat ini tidak mendukung lokasi. Isi koordinat secara manual.', { variant: 'info' })
      update({ city: 'custom' })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const lat = Number(pos.coords.latitude.toFixed(4))
        const lon = Number(pos.coords.longitude.toFixed(4))
        const tz = tzFromCoords(lat, lon)
        update({ city: 'custom', lat: String(lat), lon: String(lon), ...(tz ? { tz } : {}) })
        toast(tz ? `Lokasi dipakai · ${TZ_NAME[tz]}` : 'Lokasi dipakai. Periksa zona waktu.', { variant: 'success' })
      },
      (err) => {
        setLocating(false)
        update({ city: 'custom' }, 'later')
        toast(
          err.code === err.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Izinkan di pengaturan browser, atau isi koordinat manual.'
            : 'Lokasi belum ditemukan. Coba lagi, atau isi koordinat manual.',
          { variant: 'error' },
        )
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  }

  // ---------- Getar (per perangkat) ----------
  const hapticOn = useSyncExternalStore(subscribeHaptic, hapticEnabled, () => true)
  function toggleHaptic() {
    setHapticEnabled(!hapticOn)
    hapticListeners.forEach((fn) => fn())
    if (!hapticOn) haptic(12)
  }

  // ---------- Cadangan ----------
  const [backingUp, setBackingUp] = useState(false)
  async function downloadBackup() {
    setBackingUp(true)
    try {
      const json = await exportBackupJson()
      const name = `pohonbaik_cadangan_${today}.json`
      const file = new File([json], name, { type: 'application/json' })
      const shareData = { files: [file], title: 'Cadangan Pohon Baik' }
      // Lembar bagikan (iOS/Android): Simpan ke File, kirim ke WhatsApp, Drive, dll.
      if (navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData)
          return
        } catch (e) {
          const n = (e as DOMException)?.name
          if (n === 'AbortError') return
          if (n === 'NotAllowedError') {
            // Gestur ketuk kedaluwarsa saat menunggu server: minta satu ketukan lagi.
            toast('Cadangan siap', { variant: 'info', duration: 10000, action: { label: 'Bagikan', onClick: () => void navigator.share(shareData).catch(() => {}) } })
            return
          }
        }
      }
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast('File cadangan diunduh', { variant: 'success' })
    } catch (e) {
      toast(pesanGalat(e, 'Gagal membuat file cadangan'), { variant: 'error' })
    } finally {
      setBackingUp(false)
    }
  }

  // ---------- Keluar ----------
  const [leaving, setLeaving] = useState(false)
  const cachesCleared = useRef(false)
  async function onSignOut(e: FormEvent<HTMLFormElement>) {
    if (cachesCleared.current) return // putaran kedua: biarkan server action berjalan
    e.preventDefault()
    const form = e.currentTarget
    const ok = await confirm({
      title: 'Keluar dari akun?',
      message: 'Data keluarga yang tersimpan di HP ini akan dibersihkan. Masuk lagi kapan saja dengan email dan kata sandi.',
      confirmLabel: 'Keluar',
      danger: true,
    })
    if (!ok) return
    setLeaving(true)
    await clearAppCaches()
    cachesCleared.current = true
    form.requestSubmit()
  }

  // ---------- Sheet anak ----------
  const [childSheetOpen, setChildSheetOpen] = useState(false)
  const [editingChildId, setEditingChildId] = useState<'new' | string>('new')
  const [childName, setChildName] = useState('')
  const [childDob, setChildDob] = useState('')
  const [childSex, setChildSex] = useState<'L' | 'P' | ''>('')
  const [childAbil, setChildAbil] = useState<Record<string, string>>({})
  const [childLoad, setChildLoad] = useState<Load>('seimbang')
  const [childTahfidz, setChildTahfidz] = useState<TahfidzTarget>('juz30')
  const [childSkip, setChildSkip] = useState<string[]>([])
  const [childErr, setChildErr] = useState<{ name?: string; dob?: string }>({})
  const [busy, setBusy] = useState<'save' | 'delete' | 'modules' | null>(null)

  const openChild = (c?: (typeof kids)[number]) => {
    setEditingChildId(c?.id ?? 'new')
    setChildName(c?.name ?? '')
    setChildDob(c?.dob ?? '')
    setChildSex(c?.sex || '')
    setChildAbil(c?.abilityOverrides || {})
    setChildLoad((c?.load as Load) ?? 'seimbang')
    setChildTahfidz((c?.tahfidzTarget as TahfidzTarget) ?? 'juz30')
    setChildSkip(c?.skipModules ?? [])
    setChildErr({})
    setChildSheetOpen(true)
  }

  function validateChild() {
    const e: { name?: string; dob?: string } = {}
    if (!childName.trim()) e.name = 'Nama panggilan wajib diisi'
    if (!childDob) e.dob = 'Tanggal lahir wajib diisi'
    else if (!isIsoDate(childDob)) e.dob = 'Tanggal lahir tidak valid'
    else if (childDob > today) e.dob = 'Tanggal lahir tidak boleh di masa depan'
    setChildErr(e)
    if (e.name) document.getElementById('child-name')?.focus()
    else if (e.dob) document.getElementById('child-dob')?.focus()
    return !e.name && !e.dob
  }

  async function onSaveChild(e: FormEvent) {
    e.preventDefault()
    if (busy || !validateChild()) return
    setBusy('save')
    try {
      await saveChild(editingChildId, {
        name: childName,
        dob: childDob,
        sex: childSex || undefined,
        abilityOverrides: childAbil,
        load: childLoad,
        tahfidzTarget: childTahfidz,
      })
      setChildSheetOpen(false)
      toast(editingChildId === 'new' ? `${childName.trim()} ditambahkan` : 'Data anak disimpan', { variant: 'success' })
    } catch (err) {
      toast(pesanGalat(err, 'Gagal menyimpan data anak'), { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function onDeleteChild() {
    if (editingChildId === 'new' || busy) return
    const ok = await confirm({
      title: `Hapus data ${childName}?`,
      message: 'Data anak ini akan dihapus dari keluarga dan tidak bisa dikembalikan. Unduh cadangan dulu bila ragu.',
      confirmLabel: 'Hapus anak',
      danger: true,
    })
    if (!ok) return
    setBusy('delete')
    try {
      await deleteChild(editingChildId)
      setChildSheetOpen(false)
      toast('Data anak dihapus', { variant: 'success' })
    } catch (err) {
      toast(pesanGalat(err, 'Gagal menghapus data anak'), { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function showAllModules() {
    if (editingChildId === 'new' || busy) return
    setBusy('modules')
    try {
      setChildSkip(await setModuleHidden(editingChildId, null, false))
      toast('Semua modul ditampilkan lagi', { variant: 'success' })
    } catch (err) {
      toast(pesanGalat(err), { variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION
  const rowCls = 'flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0'

  return (
    <>
      <PageHeader title="Keluarga" subtitle={`${family.name} · ${kids.length} anak`} />

      {/* ---------- Anak ---------- */}
      <SectionLabel>Anak</SectionLabel>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        {kids.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Belum ada anak terdaftar.</p>}
        {kids.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openChild(c)}
            className="pressable flex min-h-14 w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="grid size-10 flex-none place-items-center rounded-full font-bold text-white" style={{ background: kidColor(i) }}>
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[0.9375rem] text-ink">{c.name}</b>
                <span className="block text-[0.8125rem] text-ink-2">
                  {ageLabel(c.dob, today)} · Beban {LOADS.find((l) => l.id === c.load)?.name ?? 'Seimbang'}
                </span>
              </span>
            </span>
            <ChevronRight size={18} aria-hidden className="flex-none text-ink-4" />
          </button>
        ))}
        <button type="button" onClick={() => openChild()} className="pressable flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left font-semibold text-brand-2">
          <span aria-hidden className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
            <Plus size={20} />
          </span>
          <span className="text-[0.9375rem]">Tambah anak</span>
        </button>
      </div>

      {/* ---------- Langganan ---------- */}
      <Link href="/langganan" className="pressable mt-3 flex min-h-14 items-center gap-3.5 rounded-card bg-surface p-4 shadow-card">
        <span aria-hidden className={cn('grid size-10 flex-none place-items-center rounded-tile', billing.attention ? 'bg-gold-soft text-gold-ink' : 'bg-brand-soft text-brand')}>
          <Receipt size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] text-ink">Langganan</b>
          <span className={cn('block text-[0.8125rem]', billing.attention ? 'font-semibold text-gold-ink' : 'text-ink-2')}>{billing.summary}</span>
        </span>
        <ChevronRight size={18} aria-hidden className="flex-none text-ink-4" />
      </Link>

      {/* ---------- Pengaturan keluarga (tersimpan otomatis) ---------- */}
      <div className="flex items-end justify-between gap-2">
        <SectionLabel>Pengaturan</SectionLabel>
        <span role="status" aria-live="polite" className="mx-1 mb-2 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3">
          {saveState === 'saving' && 'Menyimpan…'}
          {saveState === 'saved' && (
            <>
              Tersimpan <Check size={14} aria-hidden className="text-brand-2" />
            </>
          )}
          {saveState === 'error' && <span className="text-danger">Belum tersimpan</span>}
        </span>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          persist()
        }}
        className="rounded-card bg-surface px-4 py-2 shadow-card"
      >
        <Field label="Nama keluarga" id="fam-name" error={errs.name}>
          <Input
            id="fam-name"
            value={st.name}
            onChange={(e) => update({ name: e.target.value }, 'later')}
            onBlur={flush}
            placeholder="Keluarga Andriko"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            required
            aria-invalid={!!errs.name}
            aria-describedby={errs.name ? 'fam-name-err' : undefined}
          />
        </Field>

        <Field label="Kota (untuk jadwal shalat)" id="fam-city">
          <Select id="fam-city" value={st.city} onChange={(e) => update({ city: e.target.value }, e.target.value === 'custom' ? 'later' : 'now')}>
            {Object.entries(CITIES).map(([key, c]) => (
              <option key={key} value={key}>
                {c[0]}
              </option>
            ))}
            <option value="custom">Koordinat sendiri…</option>
          </Select>
        </Field>
        <Button variant="soft" size="sm" onClick={locateMe} disabled={locating} className="mb-1">
          <LocateFixed size={16} aria-hidden /> {locating ? 'Mencari lokasi…' : 'Gunakan lokasi saya'}
        </Button>

        {st.city === 'custom' && (
          <div className="mt-2 border-l-2 border-brand-2 pl-3">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Lintang" id="fam-lat" error={errs.lat && st.lat ? errs.lat : undefined} hint="Selatan: minus">
                <Input
                  id="fam-lat"
                  value={st.lat}
                  onChange={(e) => update({ lat: e.target.value.replace(',', '.') }, 'later')}
                  onBlur={flush}
                  placeholder="-6.2"
                  inputMode="text"
                  pattern="-?\d+(\.\d+)?"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  required
                  aria-invalid={!!(errs.lat && st.lat)}
                  aria-describedby={errs.lat && st.lat ? 'fam-lat-err' : 'fam-lat-hint'}
                />
              </Field>
              <Field label="Bujur" id="fam-lon" error={errs.lon && st.lon ? errs.lon : undefined} hint="Indonesia: 95–141">
                <Input
                  id="fam-lon"
                  value={st.lon}
                  onChange={(e) => update({ lon: e.target.value.replace(',', '.') }, 'later')}
                  onBlur={flush}
                  placeholder="106.8"
                  inputMode="text"
                  pattern="-?\d+(\.\d+)?"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  required
                  aria-invalid={!!(errs.lon && st.lon)}
                  aria-describedby={errs.lon && st.lon ? 'fam-lon-err' : 'fam-lon-hint'}
                />
              </Field>
            </div>
            {(!st.lat || !st.lon) && (
              <p className="ml-1 text-[0.8125rem] text-ink-2">Isi lintang dan bujur, atau ketuk &ldquo;Gunakan lokasi saya&rdquo;. Pengaturan tersimpan setelah koordinat lengkap.</p>
            )}
            <Field label="Zona waktu" id="fam-tz">
              <Select id="fam-tz" value={st.tz} onChange={(e) => update({ tz: e.target.value })}>
                <option value="7">WIB (UTC+7)</option>
                <option value="8">WITA (UTC+8)</option>
                <option value="9">WIT (UTC+9)</option>
              </Select>
            </Field>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-2.5 max-[360px]:grid-cols-1">
          <Field label="Tema dimulai" id="fam-theme">
            <Select id="fam-theme" value={st.themeOffset} onChange={(e) => update({ themeOffset: Number(e.target.value) })}>
              {themes.map((t) => (
                <option key={t.order} value={t.order - 1}>
                  {t.order}. {t.title} · {t.surah}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pada tanggal" id="fam-start" error={errs.themeStart}>
            <Input
              id="fam-start"
              type="date"
              value={st.themeStart}
              onChange={(e) => update({ themeStart: e.target.value })}
              required
              aria-invalid={!!errs.themeStart}
              aria-describedby={errs.themeStart ? 'fam-start-err' : undefined}
            />
          </Field>
        </div>

        <FieldGroup label="Tampilan">
          <Segmented<Appearance>
            label="Tampilan"
            value={st.appearance}
            onChange={chooseAppearance}
            options={[
              { value: 'auto', label: 'Otomatis' },
              { value: 'light', label: 'Terang' },
              { value: 'dark', label: 'Gelap' },
            ]}
          />
        </FieldGroup>

        {saveState === 'error' && (
          <Button type="submit" variant="primary" block className="my-2">
            Simpan ulang
          </Button>
        )}
      </form>

      {/* ---------- Perangkat ini ---------- */}
      <SectionLabel>Perangkat ini</SectionLabel>
      <div className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className={rowCls}>
          <span id="haptic-label" className="min-w-0">
            <span className="block text-[0.9375rem]">Getar saat mencentang</span>
            <span className="block text-[0.8125rem] text-ink-2">Hanya untuk HP ini</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={hapticOn}
            aria-labelledby="haptic-label"
            onClick={toggleHaptic}
            className={cn('hit relative h-8 w-[3.25rem] flex-none rounded-full transition-colors', hapticOn ? 'bg-brand-2' : 'bg-fill')}
          >
            <span
              aria-hidden
              className={cn('absolute top-1 left-1 size-6 rounded-full bg-surface shadow-card transition-transform', hapticOn && 'translate-x-5')}
            />
          </button>
        </div>
      </div>

      {/* ---------- Cadangan data ---------- */}
      <SectionLabel>Cadangan data</SectionLabel>
      <div className="space-y-3">
        <button
          type="button"
          onClick={downloadBackup}
          disabled={backingUp}
          aria-busy={backingUp}
          className="pressable flex w-full items-center gap-3.5 rounded-card bg-surface p-4 text-left shadow-card disabled:opacity-60"
        >
          <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-brand-soft text-brand">
            <Download size={18} />
          </span>
          <span>
            <b className="block text-[0.9375rem] text-ink">{backingUp ? 'Menyiapkan cadangan…' : 'Unduh cadangan'}</b>
            <span className="block text-[0.8125rem] text-ink-2">Simpan ke File atau kirim ke WhatsApp secara berkala</span>
          </span>
        </button>

        <ImportForm />
      </div>

      {/* ---------- Akun ---------- */}
      <SectionLabel>Akun</SectionLabel>
      <div className="overflow-hidden rounded-card bg-surface text-[0.9375rem] shadow-card">
        <div className={rowCls}>
          <span>Nama</span>
          <span className="min-w-0 truncate text-ink-2">{parent.name}</span>
        </div>
        <div className={rowCls}>
          <span>Email</span>
          <span className="min-w-0 truncate text-ink-2">{parent.email}</span>
        </div>
        <div className={rowCls}>
          <span>Kota</span>
          <span className="min-w-0 truncate text-ink-2">{CITIES[family.city]?.[0] ?? 'Koordinat sendiri'}</span>
        </div>
        <Link href="/privasi" className={cn(rowCls, 'pressable text-ink')}>
          <span>Kebijakan privasi</span>
          <ChevronRight size={18} aria-hidden className="text-ink-4" />
        </Link>
      </div>

      <form action={signOutAction} onSubmit={onSignOut} className="mt-5">
        <Button type="submit" variant="danger" block disabled={leaving}>
          <LogOut size={18} aria-hidden /> {leaving ? 'Keluar…' : 'Keluar'}
        </Button>
      </form>
      {appVersion && <p className="mt-3 text-center text-xs text-ink-3">Pohon Baik · versi {appVersion}</p>}

      {/* ---------- Sheet tambah/ubah anak ---------- */}
      <Sheet
        open={childSheetOpen}
        onClose={() => setChildSheetOpen(false)}
        title={editingChildId === 'new' ? 'Tambah anak' : 'Ubah data anak'}
        footer={
          <Button type="submit" form="child-form" variant="primary" block disabled={busy !== null}>
            {busy === 'save' ? 'Menyimpan…' : 'Simpan data anak'}
          </Button>
        }
      >
        <form id="child-form" noValidate onSubmit={onSaveChild} className="py-1">
          <Field label="Nama panggilan" id="child-name" error={childErr.name}>
            <Input
              id="child-name"
              value={childName}
              onChange={(e) => {
                setChildName(e.target.value)
                if (childErr.name) setChildErr((x) => ({ ...x, name: undefined }))
              }}
              placeholder="Aisyah"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              required
              data-autofocus={editingChildId === 'new' ? '' : undefined}
              aria-invalid={!!childErr.name}
              aria-describedby={childErr.name ? 'child-name-err' : undefined}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Tanggal lahir" id="child-dob" error={childErr.dob}>
              <Input
                id="child-dob"
                type="date"
                max={today}
                value={childDob}
                onChange={(e) => {
                  setChildDob(e.target.value)
                  if (childErr.dob) setChildErr((x) => ({ ...x, dob: undefined }))
                }}
                required
                aria-invalid={!!childErr.dob}
                aria-describedby={childErr.dob ? 'child-dob-err' : undefined}
              />
            </Field>
            <Field label="Jenis kelamin" id="child-sex">
              <Select id="child-sex" value={childSex} onChange={(e) => setChildSex(e.target.value as 'L' | 'P' | '')}>
                <option value="">Tidak diisi</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </Select>
            </Field>
          </div>

          <FieldGroup label="Beban harian">
            <div className="space-y-2">
              {LOADS.map((l) => (
                <label
                  key={l.id}
                  className={cn(
                    'pressable flex min-h-11 cursor-pointer items-start gap-3 rounded-tile border p-3',
                    childLoad === l.id ? 'border-brand-2 bg-brand-soft/50' : 'border-line bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="load"
                    value={l.id}
                    checked={childLoad === l.id}
                    onChange={() => setChildLoad(l.id)}
                    className="mt-0.5 size-5 flex-none accent-[var(--brand-2)]"
                  />
                  <span className="text-[0.8125rem]">
                    <b className="text-[0.9375rem] text-ink">{l.name}</b> <span className="text-ink-2">· {l.label}</span>
                    <span className="mt-0.5 block text-ink-2">{l.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </FieldGroup>

          <Field label="Target hafalan Qur'an" id="child-tahfidz" hint={`${TAHFIDZ_TARGETS.find((t) => t.id === childTahfidz)?.desc ?? ''} Hafalan yang lancar dan dipahami lebih utama daripada banyak.`}>
            <Select id="child-tahfidz" value={childTahfidz} onChange={(e) => setChildTahfidz(e.target.value as TahfidzTarget)} aria-describedby="child-tahfidz-hint">
              {TAHFIDZ_TARGETS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>

          {editingChildId !== 'new' && childSkip.length > 0 && (
            <div className="my-2.5 flex items-center justify-between gap-2 rounded-tile bg-surface-2 py-1 pr-1 pl-3 text-[0.8125rem]">
              <span className="text-ink-2">{childSkip.length} modul disembunyikan karena sudah dikuasai.</span>
              <Button size="sm" variant="link" className="min-h-11 px-2" disabled={busy !== null} onClick={showAllModules}>
                {busy === 'modules' ? 'Memproses…' : 'Tampilkan lagi'}
              </Button>
            </div>
          )}

          <details className="my-2.5 rounded-tile bg-surface-2 text-[0.875rem] text-ink">
            <summary className="flex min-h-12 cursor-pointer items-center px-3 font-semibold text-brand-2">Sesuaikan kemampuan per bidang (opsional)</summary>
            <div className="px-3 pb-3">
              <p className="text-[0.8125rem] text-ink-2">
                Biarkan &ldquo;Sesuai usia&rdquo; jika tidak yakin. Pilih fase lain bila kemampuan anak di bidang itu lebih maju atau perlu mengulang.
              </p>
              <div className="mt-2 divide-y divide-line">
                {branches.map((b) => (
                  <label key={b.code} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 text-[0.8125rem] font-medium">{b.name}</span>
                    <Select
                      value={childAbil[b.code] || 'auto'}
                      onChange={(e) => setChildAbil((prev) => ({ ...prev, [b.code]: e.target.value }))}
                      className="w-auto max-w-[55%] flex-none bg-surface py-2"
                    >
                      <option value="auto">Sesuai usia</option>
                      {PHASES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                ))}
              </div>
            </div>
          </details>

          {editingChildId !== 'new' && (
            <Button variant="danger" block className="mt-4 mb-2" disabled={busy !== null} onClick={onDeleteChild}>
              <Trash2 size={16} aria-hidden /> {busy === 'delete' ? 'Menghapus…' : 'Hapus anak'}
            </Button>
          )}
        </form>
      </Sheet>
    </>
  )
}
