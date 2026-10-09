'use client'

import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/pb/feedback'
import { pesanGalat } from '@/lib/errors'
import { importPrototype, type ImportResult } from './import-action'

/** Impor file cadangan (.json) dari aplikasi prototype. Foto dipisahkan di browser dan menyusul. */
export function ImportForm() {
  const router = useRouter()
  const toast = useToast()
  const [useSettings, setUseSettings] = useState(true)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<ImportResult | null>(null)

  async function onFile(file: File) {
    setBusy(true)
    setRes(null)
    let json: string
    try {
      const data = JSON.parse(await file.text())
      delete data._photos
      delete data.ui
      json = JSON.stringify(data)
    } catch {
      setRes({ ok: false, error: 'File tidak bisa dibaca. Pilih file cadangan .json dari Pohon Baik.' })
      setBusy(false)
      return
    }
    try {
      const r = await importPrototype(json, useSettings)
      setRes(r)
      if (r.ok) {
        toast('Impor selesai', { variant: 'success' })
        router.refresh()
      }
    } catch (e) {
      setRes({ ok: false, error: pesanGalat(e, 'Impor gagal. Coba lagi sebentar lagi.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      <label className="pressable flex min-h-14 cursor-pointer items-center gap-3.5 px-4 py-3 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-brand-2" aria-busy={busy}>
        <span aria-hidden className="grid size-10 flex-none place-items-center rounded-tile bg-[var(--kid-6)] text-white">
          <Upload size={18} />
        </span>
        <span className="flex-1">
          <b className="block text-[0.9375rem] text-ink">{busy ? 'Mengimpor…' : 'Impor dari aplikasi lama'}</b>
          <span className="block text-[0.8125rem] text-ink-2">File cadangan .json dari menu Keluarga → Unduh cadangan</span>
        </span>
        <input
          type="file"
          accept=".json,application/json"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </label>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-line px-4 py-3 text-[0.875rem] text-ink-2">
        <input type="checkbox" checked={useSettings} onChange={(e) => setUseSettings(e.target.checked)} className="size-5 flex-none accent-[var(--brand-2)]" />
        Pakai juga nama keluarga, kota, dan tanggal mulai tema dari cadangan
      </label>
      {res && (
        <div role={res.ok ? 'status' : 'alert'} className={`border-t border-line px-4 py-3 text-[0.875rem] ${res.ok ? 'text-brand' : 'text-danger'}`}>
          {res.ok ? (
            <>
              <b>Alhamdulillah, impor selesai.</b>
              <ul className="mt-1 list-disc pl-5 text-ink-2">
                {res.summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              {res.photosSkipped > 0 && <p className="mt-1 text-ink-2">{res.photosSkipped} foto momen belum dipindahkan; menyusul bersama fitur foto.</p>}
            </>
          ) : (
            res.error
          )}
        </div>
      )}
    </div>
  )
}
