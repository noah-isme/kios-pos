# Changelog

Semua perubahan penting pada proyek Kios POS akan didokumentasikan dalam file ini.

Format ini mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added

- Sistem autentikasi lengkap dengan NextAuth
  - Magic link email menggunakan Nodemailer
  - Google OAuth integration
  - Role-based access control (Owner, Admin, Kasir)
  - Prisma Adapter untuk session management

- Modul Kasir (POS)
  - Antarmuka scan barcode untuk produk
  - Sistem diskon per item dan diskon tambahan
  - Kalkulasi PPN otomatis berdasarkan pengaturan
  - Proses pembayaran mock (cash, QRIS, card)
  - Cetak struk PDF menggunakan pdf-lib
  - Format struk 58mm dan 80mm

- Manajemen Produk
  - CRUD produk dengan SKU, barcode, dan kategori
  - Manajemen kategori dan supplier
  - Konfigurasi harga, harga modal, dan markup
  - Sistem promo dengan tanggal mulai/akhir
  - Pengaturan diskon default per produk
  - Konfigurasi PPN per produk (taxable/non-taxable)

- Manajemen Stok
  - Penyesuaian stok (adjustment)
  - Transfer stok antar outlet
  - Stock opname (inventori fisik)

- Laporan Penjualan
  - Laporan harian dengan ringkasan transaksi
  - Total penjualan dan jumlah item terjual
  - Breakdown pembayaran per metode
  - Estimasi float kas untuk hari berikutnya

- Panel Pengaturan
  - Konfigurasi tarif PPN aktif
  - Pengaturan outlet dan NPWP
  - Batas diskon maksimal

- Database dan ORM
  - Skema Prisma lengkap dengan relasi
  - Migrasi database via Prisma
  - Seed script untuk data awal produk dari CSV
  - Support PostgreSQL/Supabase

- Testing Infrastructure
  - Unit tests dengan Vitest
  - E2E tests dengan Playwright
  - Mock service worker (MSW) untuk development tanpa backend

- Developer Experience
  - TypeScript strict mode
  - ESLint dengan Biome
  - Hot reload dengan Turbopack
  - Environment validation dengan Zod
  - tRPC untuk type-safe API
  - TanStack Query untuk data fetching

- UI/UX
  - shadcn/ui component library
  - Tailwind CSS 4 dengan custom accent colors
  - Responsive design
  - Framer Motion animations
  - Dark mode ready
  - Loading states dan optimistic updates

- Scripts Utilitas
  - `seed-supabase.mjs` - Import produk awal dari CSV
  - `seed-initial.mjs` - Setup data awal untuk testing
  - `check-env.mjs` - Validasi environment variables
  - `auth-post.mjs` - Test endpoint autentikasi
  - `create-magiclink.mjs` - Generate magic link untuk testing
  - `create-session.mjs` - Buat session untuk testing

- Documentation
  - README lengkap dengan setup guide
  - Panduan implementasi langkah demi langkah
  - Dokumentasi persiapan awal (checklist)
  - UI style guide

- CI/CD
  - GitHub Actions workflow untuk CI
  - Automated testing pada PR
  - Type checking dan linting
  - Build verification

### Changed

- Optimasi query database dengan Prisma
- Peningkatan performa UI dengan animasi yang lebih smooth
- Perbaikan validation schema untuk input forms

### Fixed

- Debug logs di NextAuth options telah dihapus
- Session handling yang lebih robust
- Error handling untuk database connections
- Validasi email format yang lebih baik

### Security

- Environment variables validation
- SQL injection protection via Prisma
- XSS protection dengan proper escaping
- CSRF protection via NextAuth
- Role-based authorization pada semua endpoints

## [0.1.0] - 2025-10-14

### Added

- Initial project setup
- Basic structure and architecture
- Core dependencies dan tooling
