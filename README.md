# Pohon Baik · aplikasi web (SaaS)

Monolit **Next.js 16.3 + Payload CMS 3.90 + PostgreSQL**. Rancangan lengkap: [`../arsitektur-saas-nextjs.md`](../arsitektur-saas-nextjs.md). Prototype lama tetap di [`../app`](../app) dan menjadi sumber materi.

## Menjalankan di laptop

Butuh Node 22 dan Docker Desktop.

```bash
npm install
npm run db:up          # PostgreSQL 17 di Docker (port 5432)
cp .env.example .env   # lalu isi PAYLOAD_SECRET dengan string acak panjang
npm run seed           # impor materi dari ../app (aman diulang)
npm run dev            # http://localhost:3000
```

| Alamat | Isi |
|---|---|
| `/` | Halaman sambutan |
| `/daftar`, `/masuk` | Akun orang tua (email + kata sandi) |
| `/hari-ini` | Hari ini: langit sesuai waktu shalat, tema berjalan, tugas tema per anak, Majelis Malam (dari database) |
| `/langganan` | Status masa coba & langganan per anak, bayar (Midtrans), keringanan, riwayat |
| `/admin` | Panel admin & CMS. Staf pertama yang dibuat otomatis menjadi admin |
| `/design` | Galeri design system (hanya saat pengembangan) |

Akun uji lokal: [`scripts/dev-accounts.md`](scripts/dev-accounts.md).

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run seed` | Impor/perbarui materi dari prototype. Dokumen dicocokkan lewat kunci alami; status tinjauan yang sudah diberikan tidak diubah |
| `npm run test:int` | Uji: logika kurikulum (golden test vs prototype, 4.000+ perbandingan waktu shalat) dan access control data keluarga |
| `npm run generate:types` | Perbarui `src/payload-types.ts` setelah mengubah koleksi |
| `npm run payload migrate:create <nama>` | Buat migrasi setelah mengubah skema (production memakai migrasi; dev memakai push otomatis) |
| `npm run build` | Build production |

## Struktur

```
src/
├─ app/(frontend)/          aplikasi orang tua: (auth)/masuk|daftar, (app)/hari-ini|tema|quran|anak|keluarga, design/
├─ app/(payload)/           panel admin & REST/GraphQL API (dibuat Payload, jangan diubah)
├─ collections/
│  ├─ content.ts            materi: bands, branches, modules, themes, themeTasks, majelis, ageProfiles, warnings, contentReviews
│  ├─ family.ts             parents (auth), families, children
│  └─ Users.ts              staf: admin · konten · peninjau · dukungan
├─ access/                  aturan akses (UU PDP: staf konten tidak bisa melihat data anak)
├─ fields/content.ts        field & hook bersama materi (status tinjauan, pembersihan cache)
├─ lib/prayer/praytimes.ts  waktu shalat (dipindah dari prototype, hasil identik)
├─ lib/curriculum/          usia, kelompok usia, tema 28 hari, kartu waktu aktif, murajaah berjarak
├─ lib/server/              sesi orang tua, query materi ber-cache (tag `content`)
├─ components/ui|pb/        design system: primitives, langit, pohon, kartu waktu, tab bar, sheet
├─ migrations/              migrasi database
└─ proxy.ts                 proteksi rute (Next.js 16)
scripts/seed-content.ts     impor materi prototype
```

## Aturan penting

- **Zona waktu:** semua tanggal berupa string `YYYY-MM-DD` dan "sekarang" dihitung dengan zona waktu keluarga (`localNow(tz)`), bukan zona server.
- **Materi tampil** hanya yang berstatus *Disetujui*. Saat pengembangan/pemakaian pribadi, `CONTENT_INCLUDE_UNREVIEWED=true` menampilkan materi hasil seed yang masih *Perlu ditinjau*. Menyimpan **Catatan tinjauan** otomatis mengubah status materi yang ditinjau.
- **Sesi:** orang tua dan staf memakai cookie yang sama (`payload-token`). Masuk ke `/admin` dengan akun staf di browser/profil terpisah dari akun orang tua.
- **Langganan:** gratis 30 hari untuk semua anak sejak keluarga dibuat (`families.trialEndsAt`), lalu Rp25.000 per anak per tahun (`children.paidUntil`). Aturan dan harga ada di `src/lib/billing/rules.ts`. Anak yang belum aktif: tugas per anak, Anakku, dan Qur'an terkunci (data tidak dikirim ke browser, penulisan ditolak di hook koleksi); tanda bahaya, Majelis Malam, Tema, dan unduh cadangan tetap terbuka. Field langganan hanya bisa diubah server/staf, bukan orang tua lewat API.
- **Pembayaran:** Midtrans Snap. Notifikasi masuk ke `/webhooks/midtrans` (tanda tangan diverifikasi, status dicek ulang ke API). Tanpa `MIDTRANS_SERVER_KEY` saat pengembangan, pembayaran memakai halaman simulasi `/langganan/simulasi`. Keringanan disetujui staf di admin → Keluarga → bagian *Keringanan biaya*.
- **Target & momen:** target capaian kelompok usia ditandai di Anakku → Kenali; lembar "Tercapai!" meminta cerita, *usahanya* (pujian proses), dan foto, lalu menjadi momen bersumber `target`. Foto momen disimpan privat di koleksi `momentPhotos` (`MEDIA_DIR/momen`); tab Momen punya "Kenang bersama" (bulan ini dan sejak ulang tahun terakhir) dengan pertanyaan pemandu untuk dibuka bersama anak.
