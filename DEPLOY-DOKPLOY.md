# Deploy Pohon Baik ke VPS dengan Dokploy

Satu aplikasi (Next.js + Payload) dan satu database PostgreSQL, keduanya dikelola Dokploy.

## 1. Database
Dokploy → Project → **Create Service → Database → PostgreSQL** (versi 17).
- Catat *Internal Connection URL*, misalnya `postgresql://pohonbaik:<sandi>@pohonbaik-db-xxxx:5432/pohonbaik`.
- Aktifkan **backup harian** (Dokploy → Backups, tujuan S3/R2 atau penyimpanan lain). Data anak termasuk data pribadi; backup wajib.
- Jangan buka port database ke internet. Untuk seed dari laptop, pakai tunnel SSH (langkah 5).

## 2. Aplikasi
Dokploy → **Create Service → Application**.
- **Source:** repository Git (GitHub/Gitea) yang berisi folder ini. Jika repo berisi seluruh `pohon-baik/`, isi **Build Path** = `/web`.
- **Build Type:** Dockerfile (`Dockerfile` di folder ini).
- **Port:** 3000.

### Environment variables
| Variabel | Nilai |
|---|---|
| `DATABASE_URL` | Internal Connection URL dari langkah 1 |
| `PAYLOAD_SECRET` | String acak panjang (`openssl rand -hex 32`). Jangan diganti setelah ada pengguna: sesi login akan batal |
| `SERVER_URL` | `https://domain-anda` (tanpa garis miring di akhir) |
| `CONTENT_INCLUDE_UNREVIEWED` | `true` selama pemakaian pribadi (materi seed belum ditinjau ustadz). Ubah ke `false` saat dibuka untuk umum |
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard Midtrans (Settings → Access Keys). Wajib untuk menerima pembayaran langganan |
| `MIDTRANS_IS_PRODUCTION` | `true` untuk akun production, `false` untuk sandbox |
| `MIDTRANS_ENABLED_PAYMENTS` | Opsional. Disarankan `other_qris,gopay,shopeepay` agar biaya transaksi Rp25.000 tetap kecil |

### Midtrans
Di dashboard Midtrans → **Settings → Payment → Notification URL**, isi `https://domain-anda/webhooks/midtrans`. Notifikasi diverifikasi dengan tanda tangan SHA-512 lalu dicocokkan ulang ke API status Midtrans. Uji dulu dengan akun sandbox.

### Volume
**Advanced → Mounts → Volume:** mount path `/app/media` (unggahan admin tidak hilang saat redeploy).

### Domain
**Domains → Add Domain:** host `domain-anda`, port 3000, HTTPS aktif (Let's Encrypt). Arahkan DNS A record domain ke IP VPS.

Klik **Deploy**. Saat pertama kali terhubung ke database, aplikasi otomatis menjalankan migrasi (membuat semua tabel). Cek `https://domain-anda/healthz` → `{"ok":true}`.

## 3. Admin pertama
Buka `https://domain-anda/admin` → buat pengguna pertama. Akun pertama otomatis berperan **admin**. Akun staf lain (konten, peninjau/ustadz, dukungan) dibuat dari menu Staf.

## 4. Akun keluarga
Buka `https://domain-anda/daftar`. Gunakan browser/profil yang berbeda dari akun admin (cookie sesi sama).

## 5. Mengisi materi (seed) dari laptop
Materi diisi dari laptop melalui tunnel SSH, tanpa membuka port database:

```bash
# Terminal 1: teruskan port database (ganti nama kontainer & alamat VPS)
ssh -L 5433:<ip-kontainer-db>:5432 user@ip-vps
```
Nama/IP kontainer database: di VPS jalankan `docker ps` lalu `docker inspect <nama> | grep IPAddress`.

```bash
# Terminal 2: di folder web/
DATABASE_URL="postgresql://pohonbaik:<sandi>@localhost:5433/pohonbaik" PAYLOAD_SECRET="<sama dengan server>" npm run seed:remote
```
`seed:remote` mematikan push skema otomatis dan menjalankan migrasi lebih dulu, sehingga aman untuk database server. Seed aman diulang.

## 6. Pembaruan
- Push ke branch yang dipantau Dokploy (atau klik Deploy). Aktifkan **Auto Deploy** bila ingin otomatis.
- Mengubah koleksi/skema: di laptop jalankan `npm run payload migrate:create <nama>`, commit file di `src/migrations/`, lalu deploy. Migrasi berjalan otomatis saat aplikasi start.

## Catatan
- **Database production harus mulai kosong** (dibuat lewat migrasi saat aplikasi pertama start). Jangan mengarahkan aplikasi production ke database yang pernah dipakai `npm run dev` di laptop: Payload akan berhenti di pertanyaan interaktif tentang skema hasil push dan kontainer tidak pernah sehat.
- **Login Google** direncanakan menyusul: akun Google akan ditautkan ke akun orang tua lewat email yang sudah terverifikasi, sehingga akun email + kata sandi yang ada tetap berlaku.
- Email (lupa kata sandi, verifikasi) membutuhkan layanan email seperti Resend; disiapkan bersama login Google.
