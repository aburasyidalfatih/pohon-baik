import type { ReactNode } from 'react'
import { PRIVACY_STATUS, PRIVACY_VERSION } from './meta'

// Isi kebijakan privasi. Disusun dari kode aplikasi (koleksi Payload, cookie, cache) per Oktober 2026.
// Dipakai di halaman /privasi dan di lembar persetujuan saat mendaftar (tanpa meninggalkan formulir).
// CATATAN: alamat kontak, penyelenggara, dan lokasi server masih placeholder (ditandai «isi»).

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-6 mb-2 text-[1.0625rem] font-bold text-ink">{children}</h2>
}
function Todo({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-warn-soft px-1 text-warn-ink">{children}</mark>
}

export function PrivacyContent({ compact = false }: { compact?: boolean }) {
  return (
    <div className="text-[0.9375rem] leading-relaxed text-ink-2 [&_b]:text-ink [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5">
      <p className="inline-block rounded-field bg-warn-soft px-2.5 py-1 text-[0.8125rem] font-semibold text-warn-ink">
        Versi {PRIVACY_VERSION} · {PRIVACY_STATUS}
      </p>
      {!compact && <p className="mt-3">Kebijakan ini menjelaskan data apa yang disimpan Pohon Baik, untuk apa, dan hak Anda atas data itu.</p>}

      <H>Data yang kami simpan</H>
      <ul>
        <li><b>Akun orang tua:</b> nama, email, dan kata sandi (disimpan dalam bentuk hash, tidak bisa dibaca), serta waktu dan versi persetujuan kebijakan ini.</li>
        <li><b>Keluarga:</b> nama keluarga, kota atau koordinat lokasi dan zona waktu (untuk jadwal shalat), tanggal mulai tema, dan pilihan tampilan.</li>
        <li><b>Anak:</b> nama panggilan, tanggal lahir, jenis kelamin (opsional), beban harian, target hafalan, penyesuaian kemampuan per bidang, dan modul yang disembunyikan.</li>
        <li><b>Catatan harian:</b> tugas yang dicentang setiap hari, termasuk kegiatan keluarga seperti Majelis Malam.</li>
        <li><b>Hafalan Qur&apos;an:</b> surah/bagian yang disetor dan jadwal murajaah yang sudah dikerjakan.</li>
        <li><b>Momen &amp; foto:</b> cerita, usaha anak yang Anda tulis, kategori, dan tanggal momen. Foto yang Anda pilih diperkecil di HP, lalu diproses ulang di server sehingga metadata (termasuk lokasi GPS) terhapus. Foto disimpan privat, hanya bisa dibuka anggota keluarga Anda, dan ikut terhapus bila momennya dihapus. Cadangan .json belum memuat berkas foto.</li>
        <li><b>Target capaian:</b> target usia yang Anda tandai tercapai beserta tanggalnya.</li>
        <li><b>Tonggak kemampuan dan rapor:</b> kemampuan yang sudah tampak beserta tanggalnya, serta tingkat dan catatan rapor per semester.</li>
        <li><b>Langganan dan pembayaran:</b> tanggal akhir masa coba, masa aktif langganan tiap anak, pesanan (nomor, anak yang dibayar, jumlah, status, metode bayar), dan permohonan keringanan beserta alasan yang Anda tulis. Pembayaran diproses oleh Midtrans; nomor kartu, PIN, atau saldo e-wallet tidak pernah kami terima atau simpan.</li>
      </ul>

      <H>Untuk apa data dipakai</H>
      <ul>
        <li>Menyusun tugas harian, materi, dan tema yang sesuai usia setiap anak.</li>
        <li>Menghitung waktu shalat dan tanggal sesuai lokasi keluarga.</li>
        <li>Menampilkan perkembangan anak (hafalan, momen, rapor) hanya kepada anggota keluarga Anda.</li>
        <li>Mengirim email yang Anda minta, misalnya tautan atur ulang kata sandi.</li>
        <li>Memproses langganan: mengirim nama, email, nomor pesanan, dan jumlah ke Midtrans untuk membuat halaman bayar, lalu mencatat status pembayaran.</li>
      </ul>

      <H>Yang tidak kami lakukan</H>
      <ul>
        <li>Tidak menjual data dan tidak membagikannya ke pihak lain untuk iklan. Data anak tidak dikirim ke Midtrans; yang dikirim hanya nama panggilan anak sebagai keterangan pesanan.</li>
        <li>Tidak menampilkan iklan dan tidak memasang pelacak atau analitik pihak ketiga.</li>
      </ul>

      <H>Penyimpanan dan keamanan</H>
      <ul>
        <li>Data disimpan di basis data server Pohon Baik (<Todo>isi: penyedia dan lokasi server</Todo>) dan dikirim lewat koneksi terenkripsi (HTTPS).</li>
        <li>Akses dibatasi: setiap orang tua hanya bisa membaca dan mengubah data keluarganya sendiri.</li>
        <li>Di HP Anda tersimpan cookie sesi masuk (berlaku hingga 30 hari), cookie pilihan tampilan, pengaturan getar, dan cache aplikasi agar tetap bisa dibuka saat sinyal lemah.</li>
        <li>Saat Anda menekan <b>Keluar</b>, cache aplikasi dan data situs di HP itu dihapus, sehingga data keluarga tidak tertinggal di HP yang dipakai bersama.</li>
      </ul>

      <H>Hak Anda (UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi)</H>
      <ul>
        <li><b>Akses:</b> melihat semua data keluarga di aplikasi kapan saja.</li>
        <li><b>Koreksi:</b> mengubah data keluarga dan anak di menu Keluarga.</li>
        <li><b>Unduh cadangan:</b> mengambil salinan data dalam file .json lewat Keluarga → Unduh cadangan.</li>
        <li><b>Hapus:</b> menghapus data anak di menu Keluarga. Untuk menghapus seluruh akun dan data keluarga, hubungi kami lewat email di bawah; permintaan diproses sesuai tenggat UU PDP (<Todo>isi tenggat layanan</Todo>).</li>
        <li><b>Menarik persetujuan:</b> Anda dapat berhenti kapan saja dan meminta penghapusan data.</li>
      </ul>

      <H>Anak-anak</H>
      <p>Akun dibuat dan dikelola oleh orang tua atau wali. Anak tidak membuat akun sendiri; data anak diisi oleh orang tua untuk keperluan pendampingan.</p>

      <H>Kontak</H>
      <p>
        Pertanyaan atau permintaan terkait data pribadi: <Todo>privasi@… (isi alamat email)</Todo>. Penyelenggara: <Todo>isi nama penyelenggara</Todo>.
      </p>
      <p className="mt-3">Bila kebijakan ini berubah, kami memberi tahu di aplikasi dan meminta persetujuan ulang bila perubahannya penting.</p>
    </div>
  )
}
