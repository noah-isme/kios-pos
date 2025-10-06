# Kios POS

Kios POS adalah implementasi sistem Point of Sale retail berbasis Next.js (App Router) dengan TypeScript, tRPC, Prisma, dan Supabase. Proyek ini menyiapkan fondasi MVP lengkap untuk modul kasir, manajemen produk, otentikasi role, pencetakan struk PDF, dan laporan penjualan harian.

## Stack Utama

- **Frontend & API**: Next.js App Router + TypeScript, tRPC, TanStack Query, Tailwind CSS 4, shadcn/ui.
- **Database & ORM**: Supabase Postgres yang diakses lewat Prisma.
- **Autentikasi**: NextAuth (Email magic link via Nodemailer + Google OAuth) dengan Prisma Adapter.
- **UI & Utilitas**: shadcn/ui, lucide-react, pdf-lib untuk struk PDF, sonner untuk notifikasi.
- **Deploy**: Vercel untuk frontend/API, Supabase untuk database, auth, dan storage.

## Fitur

- Modul kasir end-to-end (scan barcode, diskon item, diskon tambahan, kalkulasi PPN, pembayaran mock, cetak struk PDF).
- Manajemen produk, kategori, dan supplier lengkap dengan konfigurasi harga, promo, dan PPN per produk.
- Panel pengaturan PPN untuk menentukan tarif aktif yang dipakai kasir.
- Laporan penjualan harian (total transaksi, total item, total kas tunai, estimasi float keesokan hari).
- Integrasi NextAuth dengan role Owner, Admin, Kasir (enum `Role` pada Prisma).
- Template struk PDF siap cetak menggunakan `pdf-lib`.
- Script impor CSV untuk mengisi katalog awal langsung ke Supabase/Postgres.

## Persiapan Lingkungan

1. Salin file contoh environment dan isi kredensial Anda:

   ```bash
   cp .env.example .env
   ```

   Variabel yang dikonfigurasi meliputi koneksi Supabase/Postgres (`DATABASE_URL`, `SHADOW_DATABASE_URL`), rahasia autentikasi NextAuth (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`), kredensial OAuth Google (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), pengaturan SMTP untuk magic link (`EMAIL_SERVER_*`, `EMAIL_FROM`), serta opsi Supabase client-side (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Sesuaikan dengan environment Anda atau kosongkan nilai opsional sesuai instruksi di `.env.example`.

   Contoh konfigurasi `.env` untuk pengembangan lokal:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kios_pos?schema=public"
   SHADOW_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kios_pos_shadow?schema=public"
   
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="dev-secret-change-me"
   
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   
   EMAIL_SERVER_HOST="smtp.example.com"
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER="apikey"
   EMAIL_SERVER_PASSWORD="supersecret"
   EMAIL_FROM="Kios POS <no-reply@example.com>"
   
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_ANON_KEY="public-anon-key"
   ```

2. Jalankan perintah Prisma untuk menghasilkan klien TypeScript:

   ```bash
   npm install
   npm run db:generate
   ```

3. Terapkan skema database (gunakan `prisma db push` untuk Supabase sandbox, atau `prisma migrate` untuk lingkungan produksi):

   ```bash
   npm run db:push
   ```

4. (Opsional) Import dataset produk contoh ke Supabase agar katalog kasir terisi:

   ```bash
   npm run seed:products
   ```

5. Jalankan development server:

   ```bash
   npm run dev
   ```

## Impor Data Awal

- File `data/initial-products.csv` menampung contoh 8 produk beserta harga jual, stok, kategori, supplier, diskon default, promo, dan tarif PPN.
- Jalankan `npm run seed:products` untuk membaca CSV tersebut dan:
  - Membuat kategori serta supplier (jika belum ada) sekaligus menautkannya ke produk.
  - Mengisi stok awal pada outlet utama (`MAIN`) lengkap dengan jejak mutasi `StockMovement` bertipe `INITIAL`.
  - Membuat pengaturan PPN default (jika belum tersedia) dengan tarif dominan dari dataset.
- Ubah atau tambahkan baris CSV sesuai kebutuhan, lalu jalankan kembali script untuk melakukan sinkronisasi.

## Struktur Penting

- `src/app/page.tsx` – Beranda dengan ringkasan stack dan akses cepat ke modul.
- `src/app/cashier/page.tsx` – UI kasir dengan integrasi tRPC dan pdf-lib.
- `src/app/reports/daily/page.tsx` – Laporan penjualan harian.
- `src/app/management/products/page.tsx` – Manajemen produk + kategori + supplier + konfigurasi promo/PPN.
- `src/app/management/stock/page.tsx` – Penyesuaian stok, transfer, dan stock opname.
- `src/app/docs/implementation/page.tsx` – Panduan implementasi langkah demi langkah.
- `src/app/docs/persiapan-awal/page.tsx` – Checklist persiapan awal yang mendetail (tujuan, alur kasir, role, outlet).
- `src/server/api` – Router tRPC (`sales`, `products`, `outlets`, `settings`).
- `prisma/schema.prisma` – Skema database beserta enum Role dan PaymentMethod.
- `scripts/seed-supabase.mjs` – Script impor CSV ke Supabase.
- `data/initial-products.csv` – Dataset awal untuk script seed.

## Testing Manual

- Gunakan halaman **Kasir** untuk mensimulasikan penjualan (sertakan variasi metode bayar & refund). Setelah checkout, PDF struk akan terbuka di tab baru lengkap dengan breakdown diskon & PPN.
- Halaman **Laporan Harian** menampilkan rekap penjualan berdasarkan data `Sale` dan `Payment`.
- Halaman **Produk** menyediakan panel lengkap untuk sinkronisasi SKU, kategori, supplier, promo, dan tarif PPN per produk.
- Halaman **Manajemen Stok** mendukung penyesuaian cepat, transfer antar outlet, serta stock opname.


## Deploy

- Deploy aplikasi ke Vercel (`vercel --prod`) dan arahkan environment variables sesuai `.env`.
- Pastikan Supabase menyediakan `DATABASE_URL`, `NEXTAUTH_SECRET`, kredensial SMTP, dan OAuth Google.

## Langkah Lanjutan

- Implementasikan integrasi pembayaran QRIS/kartu menggunakan provider resmi.
- Tambahkan approval workflow untuk retur/refund di modul kasir.
- Integrasikan Supabase Storage untuk menyimpan bukti pembayaran non-tunai.
- Siapkan integrasi akuntansi / marketplace dan loyalty program sesuai roadmap.
