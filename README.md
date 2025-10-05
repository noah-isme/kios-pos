# Kios POS

Kios POS adalah implementasi sistem Point of Sale retail berbasis Next.js (App Router) dengan TypeScript, tRPC, Prisma, dan Supabase. Proyek ini menyiapkan fondasi MVP lengkap untuk modul kasir, manajemen produk, otentikasi role, pencetakan struk PDF, dan laporan penjualan harian.

## Stack Utama

- **Frontend & API**: Next.js App Router + TypeScript, tRPC, TanStack Query, Tailwind CSS 4, shadcn/ui.
- **Database & ORM**: Supabase Postgres yang diakses lewat Prisma.
- **Autentikasi**: NextAuth (Email magic link via Nodemailer + Google OAuth) dengan Prisma Adapter.
- **UI & Utilitas**: shadcn/ui, lucide-react, pdf-lib untuk struk PDF, sonner untuk notifikasi.
- **Deploy**: Vercel untuk frontend/API, Supabase untuk database, auth, dan storage.

## Fitur

- Modul kasir end-to-end (scan barcode, diskon item, diskon tambahan, pembayaran mock, cetak struk PDF).
- Manajemen produk dan kategori dengan CRUD berbasis Prisma.
- Laporan penjualan harian (total transaksi, total item, total kas tunai, estimasi float keesokan hari).
- Integrasi NextAuth dengan role Owner, Admin, Kasir (enum `Role` pada Prisma).
- Template struk PDF siap cetak menggunakan `pdf-lib`.

## Persiapan Lingkungan

1. Salin file contoh environment dan isi kredensial Anda:

   ```bash
   cp .env.example .env
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

4. Jalankan development server:

   ```bash
   npm run dev
   ```

## Struktur Penting

- `src/app/page.tsx` – Beranda dengan ringkasan stack dan akses cepat ke modul.
- `src/app/cashier/page.tsx` – UI kasir dengan integrasi tRPC dan pdf-lib.
- `src/app/reports/daily/page.tsx` – Laporan penjualan harian.
- `src/app/management/products/page.tsx` – CRUD produk/kategori.
- `src/app/docs/implementation/page.tsx` – Panduan implementasi langkah demi langkah.
- `src/server/api` – Router tRPC (`sales`, `products`, `outlets`).
- `prisma/schema.prisma` – Skema database beserta enum Role dan PaymentMethod.

## Testing Manual

- Gunakan halaman **Kasir** untuk mensimulasikan penjualan. Setelah checkout, PDF struk akan terbuka di tab baru.
- Halaman **Laporan Harian** menampilkan rekap penjualan berdasarkan data `Sale` dan `Payment`.
- Halaman **Produk** menyediakan form sederhana untuk menambah/mengubah SKU.

## Deploy

- Deploy aplikasi ke Vercel (`vercel --prod`) dan arahkan environment variables sesuai `.env`.
- Pastikan Supabase menyediakan `DATABASE_URL`, `NEXTAUTH_SECRET`, kredensial SMTP, dan OAuth Google.

## Langkah Lanjutan

- Implementasikan integrasi pembayaran QRIS/kartu menggunakan provider resmi.
- Tambahkan approval workflow untuk retur/refund di modul kasir.
- Integrasikan Supabase Storage untuk menyimpan bukti pembayaran non-tunai.
- Siapkan integrasi akuntansi / marketplace dan loyalty program sesuai roadmap.
