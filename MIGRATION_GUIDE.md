# Panduan Migrasi Database & Verifikasi

Dokumen ini menjelaskan proses setup database, migrasi, dan verifikasi untuk Kios POS.

## Daftar Isi

1. [Prasyarat](#prasyarat)
2. [Setup Environment](#setup-environment)
3. [Inisialisasi Database](#inisialisasi-database)
4. [Migrasi Database](#migrasi-database)
5. [Seed Data Awal](#seed-data-awal)
6. [Verifikasi Setup](#verifikasi-setup)
7. [Troubleshooting](#troubleshooting)

## Prasyarat

Pastikan Anda telah menginstal:

- **Node.js** >= 18.x (disarankan LTS)
- **pnpm** >= 8.x (package manager yang direkomendasikan)
- **PostgreSQL** >= 14.x atau akses ke **Supabase**
- **Git** untuk version control

## Setup Environment

### 1. Clone Repository

```bash
git clone https://github.com/noah-isme/kios-pos.git
cd kios-pos
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Konfigurasi Environment Variables

Salin file template environment:

```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan dengan konfigurasi Anda:

```env
# Database Connection (Supabase atau PostgreSQL lokal)
DATABASE_URL="postgresql://postgres:password@localhost:5432/kios_pos?schema=public"
SHADOW_DATABASE_URL="postgresql://postgres:password@localhost:5432/kios_pos_shadow?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-random-secret-here"  # Gunakan: openssl rand -base64 32

# Email Service (opsional - untuk magic link)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-smtp-username"
EMAIL_SERVER_PASSWORD="your-smtp-password"
EMAIL_FROM="Kios POS <no-reply@example.com>"

# Google OAuth (opsional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Supabase Client (opsional - untuk storage)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"

# Application Settings
DISCOUNT_LIMIT_PERCENT=50
STORE_NPWP="01.234.567.8-901.000"
```

### 4. Validasi Environment

Jalankan script validasi untuk memastikan environment sudah benar:

```bash
node scripts/check-env.mjs
```

Output yang diharapkan:
```
✅ Environment looks valid. Parsed values:
{
  DATABASE_URL: 'postgresql://...',
  NEXTAUTH_SECRET: '...',
  ...
}
```

## Inisialisasi Database

### Setup Database Lokal (PostgreSQL)

Jika menggunakan PostgreSQL lokal:

```bash
# Buat database
createdb kios_pos
createdb kios_pos_shadow

# Atau via psql
psql -U postgres -c "CREATE DATABASE kios_pos;"
psql -U postgres -c "CREATE DATABASE kios_pos_shadow;"
```

### Setup Database Supabase

1. Buat project baru di [Supabase Dashboard](https://app.supabase.com)
2. Ambil connection string dari Settings > Database
3. Update `DATABASE_URL` di `.env` dengan connection string dari Supabase

## Migrasi Database

### Metode 1: Push Schema (Development/Sandbox)

Untuk development atau prototyping, gunakan `db:push`:

```bash
pnpm run db:generate  # Generate Prisma Client
pnpm run db:push      # Push schema ke database
```

Perintah ini akan:
- Membaca `prisma/schema.prisma`
- Membandingkan dengan state database saat ini
- Mengaplikasikan perubahan secara langsung
- ⚠️ **Perhatian**: Metode ini tidak membuat file migrasi

### Metode 2: Migrate (Production)

Untuk production atau jika Anda ingin version control migrasi:

```bash
# Generate client Prisma
pnpm run db:generate

# Buat migrasi baru (dev)
npx prisma migrate dev --name init

# Deploy migrasi (production)
pnpm run db:migrate
```

### Verifikasi Schema

Buka Prisma Studio untuk melihat struktur database:

```bash
pnpm run db:studio
```

Browser akan terbuka di `http://localhost:5555` dengan interface visual untuk melihat:
- Tabel yang telah dibuat
- Relasi antar tabel
- Data yang ada (jika sudah di-seed)

## Seed Data Awal

### Import Produk dari CSV

Script seed akan mengimport data dari `data/initial-products.csv`:

```bash
pnpm run seed:products
```

Output yang diharapkan:
```
→ Sync PROD-001 - Produk Contoh 1
→ Sync PROD-002 - Produk Contoh 2
...
✅ Selesai. Produk baru: 10, diperbarui: 0.
```

Script ini akan:
1. Membaca file CSV di `data/initial-products.csv`
2. Membuat/update kategori yang diperlukan
3. Membuat/update supplier yang diperlukan
4. Membuat/update produk dengan relasi yang benar
5. Membuat outlet default jika belum ada
6. Mengatur pengaturan PPN default

### Seed Data Testing (Opsional)

Untuk data testing lengkap termasuk user dan transaksi:

```bash
node scripts/seed-initial.mjs
```

### Seed Data Lengkap (Staging)

Gunakan script baru untuk mengosongkan seluruh tabel dan mengisi ulang dengan dataset realistis (outlet, produk, stok, transaksi, pembayaran, refund, dan ringkasan harian):

```bash
pnpm run seed:full
```

Checklist sebelum menjalankan `seed:full`:

- [ ] `DATABASE_URL` mengarah ke instance yang ingin di-reset (mis. staging).
- [ ] Backup sudah dibuat bila diperlukan.
- [ ] Server aplikasi tidak sedang melayani traffic penting (proses akan menghapus seluruh data).
- [ ] `NEXTAUTH_URL` di `.env` atau `.env.local` sudah sesuai host dev/staging agar cookie login valid.
- [ ] Setelah seeding, login manual (`owner@example.com` / `password`) untuk memastikan token JWT baru diterbitkan.

## Verifikasi Setup

### 1. Verifikasi Database Connection

Buat script sederhana untuk test koneksi:

```bash
# Test koneksi database
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch((e) => {
  console.error('❌ Database connection failed:', e);
  process.exit(1);
}).finally(() => prisma.\$disconnect());
"
```

### 2. Verifikasi Schema dan Data

```bash
# Cek tabel yang ada
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
Promise.all([
  prisma.product.count(),
  prisma.category.count(),
  prisma.supplier.count(),
  prisma.outlet.count()
]).then(([products, categories, suppliers, outlets]) => {
  console.log('📊 Database Statistics:');
  console.log('  Products:', products);
  console.log('  Categories:', categories);
  console.log('  Suppliers:', suppliers);
  console.log('  Outlets:', outlets);
  process.exit(0);
}).catch((e) => {
  console.error('❌ Query failed:', e);
  process.exit(1);
}).finally(() => prisma.\$disconnect());
"
```

### 3. Jalankan Development Server

```bash
pnpm run dev
```

Akses aplikasi di `http://localhost:3000`

### 4. Test Autentikasi (Development Mode)

Jika belum setup email/OAuth, gunakan endpoint development:

```bash
# Auto-login sebagai owner (dev only)
curl http://localhost:3000/api/dev/auto-login
```

Atau buat magic link manual:

```bash
node scripts/create-magiclink.mjs owner@example.com
```

### 5. Jalankan Tests

```bash
# Unit tests
pnpm run test:unit

# E2E tests (pastikan dev server berjalan)
pnpm run test:e2e

# Full verification (lint + typecheck + test + build)
pnpm run verify
```

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Solusi:**
1. Pastikan file `.env` ada di root project
2. Pastikan `DATABASE_URL` terdefinisi di `.env`
3. Restart terminal/IDE setelah membuat `.env`

### Error: "Can't reach database server"

**Solusi:**
1. Pastikan PostgreSQL berjalan: `pg_isready` atau `systemctl status postgresql`
2. Cek kredensial database di `DATABASE_URL`
3. Cek firewall/network jika menggunakan Supabase
4. Test koneksi manual: `psql $DATABASE_URL`

### Error: "P3009: migrate could not create shadow database"

**Solusi:**
1. Pastikan user database punya permission untuk membuat database
2. Atau gunakan `db:push` sebagai alternatif untuk development
3. Setup `SHADOW_DATABASE_URL` secara eksplisit di `.env`

### Error: "Prisma Client generation failed"

**Solusi:**
```bash
# Hapus cache Prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Reinstall
pnpm install
pnpm run db:generate
```

### Error: "Dataset kosong" saat seed

**Solusi:**
1. Pastikan file `data/initial-products.csv` ada
2. Cek format CSV (header harus ada)
3. Pastikan encoding UTF-8

### Error: NextAuth 405 Method Not Allowed

**Solusi:**
1. Pastikan `NEXTAUTH_SECRET` terdefinisi di `.env`
2. Restart development server setelah update `.env`
3. Clear browser cache dan cookies
4. Cek route handler di `src/app/api/auth/[...nextauth]/route.ts`

### Mode Mock (MSW) Aktif saat Tidak Diinginkan

Jika aplikasi menampilkan data mock padahal Anda ingin menggunakan database real:

**Solusi:**
1. Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` terisi di `.env`
2. Atau set environment variable: `MOCK_MODE=false`
3. Restart dev server

### Performance Issue pada Development

**Solusi:**
1. Gunakan Turbopack (sudah default): `pnpm run dev`
2. Tutup Prisma Studio jika tidak digunakan
3. Disable sourcemaps untuk production build
4. Pertimbangkan connection pooling untuk database

## Best Practices

### Development Workflow

1. **Gunakan `db:push` untuk iterasi cepat**
   ```bash
   # Edit prisma/schema.prisma
   pnpm run db:push
   ```

2. **Buat migration untuk perubahan yang final**
   ```bash
   npx prisma migrate dev --name deskripsi_perubahan
   ```

3. **Backup database sebelum migrasi besar**
   ```bash
   pg_dump -U postgres kios_pos > backup.sql
   ```

### Production Deployment

1. **Selalu gunakan migrate di production**
   ```bash
   pnpm run db:migrate
   ```

2. **Setup connection pooling** (PgBouncer untuk Supabase)

3. **Monitor query performance** dengan Prisma metrics

4. **Setup automated backups** di Supabase atau server

### Security Checklist

- [ ] `NEXTAUTH_SECRET` menggunakan value random yang kuat
- [ ] Database credentials tidak di-commit ke Git
- [ ] `.env` masuk di `.gitignore`
- [ ] SSL/TLS enabled untuk koneksi database production
- [ ] Rate limiting pada API endpoints
- [ ] Input validation dengan Zod schemas

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth Documentation](https://next-auth.js.org)
- [Kios POS README](./README.md)
