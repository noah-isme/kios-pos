# Ringkasan Proyek Kios POS

## Gambaran Umum

Kios POS adalah sistem Point of Sale (POS) modern untuk retail yang dibangun dengan teknologi web terkini. Proyek ini menyediakan solusi lengkap untuk mengelola penjualan, inventori, dan laporan bisnis retail.

### Status Proyek

**Versi**: 0.1.0 (MVP)  
**Status**: Development/Production Ready  
**Tanggal Rilis Pertama**: Oktober 2025  
**Lisensi**: -

## Tujuan Proyek

### Masalah yang Dipecahkan

1. **Kesulitan pencatatan penjualan manual** - Sistem kasir otomatis dengan fitur scan barcode
2. **Manajemen inventori yang tidak efisien** - Tracking stok real-time dengan audit trail
3. **Perhitungan pajak yang rumit** - Kalkulasi PPN otomatis per transaksi
4. **Pelaporan yang memakan waktu** - Dashboard dan laporan otomatis
5. **Biaya lisensi POS yang tinggi** - Solusi berbasis web yang lebih terjangkau

### Target Pengguna

- **Toko retail kecil-menengah** (warung, minimarket, toko kelontong)
- **Multi-outlet businesses** yang butuh sinkronisasi data
- **Bisnis yang ingin digitalisasi** dari sistem manual ke digital

## Arsitektur Teknis

### Technology Stack

```
┌─────────────────────────────────────────────┐
│           Frontend (Next.js 15)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  React   │  │   tRPC   │  │ Tailwind │  │
│  │    UI    │  │  Client  │  │    CSS   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
                     ↕ HTTPS
┌─────────────────────────────────────────────┐
│         Backend API (Next.js API)           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   tRPC   │  │ NextAuth │  │  Prisma  │  │
│  │  Server  │  │   Auth   │  │   ORM    │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
                     ↕ SQL
┌─────────────────────────────────────────────┐
│      Database (PostgreSQL/Supabase)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Products │  │  Sales   │  │  Users   │  │
│  │  Stock   │  │ Payments │  │  Roles   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### Key Technologies

| Kategori | Teknologi | Tujuan |
|----------|-----------|---------|
| Frontend Framework | Next.js 15 (App Router) | Full-stack React framework |
| UI Library | React 19 | Interactive user interface |
| Styling | Tailwind CSS 4 | Utility-first CSS |
| Component Library | shadcn/ui | Pre-built accessible components |
| API Layer | tRPC v11 | Type-safe API calls |
| State Management | TanStack Query v5 | Server state management |
| Database | PostgreSQL/Supabase | Relational database |
| ORM | Prisma v6 | Type-safe database access |
| Authentication | NextAuth v4 | Auth with multiple providers |
| PDF Generation | pdf-lib | Receipt printing |
| Testing (Unit) | Vitest | Fast unit testing |
| Testing (E2E) | Playwright | Browser automation |
| Type Safety | TypeScript 5 | Static type checking |
| Validation | Zod | Schema validation |
| Linting | Biome | Fast linting & formatting |

## Struktur Data

### Model Database Utama

```
User (Pengguna sistem)
  ↓ has many
Session (Session login)

User
  ↓ has many
Sale (Transaksi penjualan)
  ↓ has many
  ├── SaleItem (Item dalam transaksi)
  └── Payment (Pembayaran)

Product (Produk)
  ↓ belongs to
  ├── Category (Kategori)
  └── Supplier (Supplier)
  ↓ has many
  ├── SaleItem
  └── StockMovement (Mutasi stok)

Outlet (Toko/Cabang)
  ↓ has many
  ├── Sale
  ├── Stock
  └── StockMovement

TaxSetting (Pengaturan PPN)
  ↓ belongs to
  Outlet
```

### Relasi Penting

- **Product ← Category**: Many-to-One (produk memiliki satu kategori)
- **Product ← Supplier**: Many-to-One (produk memiliki satu supplier)
- **Sale → SaleItem**: One-to-Many (satu transaksi banyak item)
- **Sale → Payment**: One-to-Many (satu transaksi bisa bayar dengan multiple metode)
- **Outlet → Stock**: One-to-Many (outlet memiliki banyak stok produk)

## Fitur Utama

### 1. Modul Kasir (POS)

**User Story**: Sebagai kasir, saya ingin memproses transaksi dengan cepat

**Fitur**:
- ✅ Input produk via SKU/barcode/search
- ✅ Tampilan real-time total dan subtotal
- ✅ Diskon per item (%, nominal, atau promo)
- ✅ Diskon tambahan untuk keseluruhan transaksi
- ✅ Kalkulasi PPN otomatis
- ✅ Multiple payment methods (Cash, QRIS, Card)
- ✅ Split payment (bayar dengan multiple metode)
- ✅ Cetak struk PDF (58mm & 80mm)
- ✅ Validasi stok sebelum checkout

**Technical Implementation**:
- React state management untuk cart
- tRPC mutation untuk create sale
- Optimistic updates dengan TanStack Query
- PDF generation client-side dengan pdf-lib

### 2. Manajemen Produk

**User Story**: Sebagai admin, saya ingin mengelola katalog produk

**Fitur**:
- ✅ CRUD produk (Create, Read, Update, Delete)
- ✅ Manajemen kategori
- ✅ Manajemen supplier
- ✅ Upload/edit barcode
- ✅ Set harga jual dan harga modal
- ✅ Konfigurasi promo dengan periode
- ✅ Set diskon default per produk
- ✅ Tandai produk taxable/non-taxable
- ✅ Bulk import via CSV

**Technical Implementation**:
- Server-side validation dengan Zod
- Prisma transactions untuk data consistency
- Optimistic updates untuk UX yang smooth
- CSV parser untuk bulk import

### 3. Manajemen Stok

**User Story**: Sebagai admin, saya ingin tracking inventori

**Fitur**:
- ✅ Penyesuaian stok (stock adjustment)
- ✅ Transfer stok antar outlet
- ✅ Stock opname (physical inventory)
- ✅ History mutasi stok (audit trail)
- ✅ Alert low stock (planned)

**Technical Implementation**:
- StockMovement table untuk audit trail
- Transaction-based updates untuk consistency
- Trigger otomatis pada sale untuk kurangi stok

### 4. Laporan Penjualan

**User Story**: Sebagai owner, saya ingin melihat performa penjualan

**Fitur**:
- ✅ Laporan harian (daily summary)
- ✅ Total penjualan per hari
- ✅ Jumlah transaksi
- ✅ Breakdown per payment method
- ✅ Total item terjual
- ✅ Estimasi float keesokan hari
- ⏳ Laporan bulanan (planned)
- ⏳ Laporan per produk (planned)
- ⏳ Export ke Excel (planned)

**Technical Implementation**:
- Aggregation queries dengan Prisma
- Server-side calculation
- Caching untuk performance

### 5. Autentikasi & Authorization

**User Story**: Sebagai owner, saya ingin kontrol akses sistem

**Fitur**:
- ✅ Login dengan email (magic link)
- ✅ Login dengan Google OAuth
- ✅ Role-based access (Owner, Admin, Kasir)
- ✅ Session management
- ✅ Logout

**Technical Implementation**:
- NextAuth dengan Prisma adapter
- Email service via Nodemailer
- Google OAuth integration
- Middleware untuk protected routes

## Alur Kerja Utama

### Alur Transaksi Penjualan

```
1. Kasir membuka halaman Kasir
   ↓
2. Pilih outlet (jika multi-outlet)
   ↓
3. Tambahkan produk ke cart
   - Scan barcode / input SKU / search nama
   - Set quantity
   - Apply diskon item (opsional)
   ↓
4. Apply diskon tambahan (opsional)
   ↓
5. Review total (subtotal + diskon + PPN)
   ↓
6. Input pembayaran
   - Pilih metode (Cash/QRIS/Card)
   - Input nominal
   - Tambah metode lain jika split payment
   ↓
7. Validasi
   - Cek stok tersedia
   - Cek pembayaran >= total
   - Cek diskon tidak melebihi limit
   ↓
8. Proses checkout
   - Create Sale record
   - Create SaleItem records
   - Create Payment records
   - Update Stock
   - Create StockMovement records
   ↓
9. Generate & print receipt PDF
   ↓
10. Kembali ke cart kosong
```

### Alur Setup Awal

```
1. Clone repository
   ↓
2. Install dependencies (pnpm install)
   ↓
3. Setup environment variables (.env)
   ↓
4. Setup database (Supabase/PostgreSQL)
   ↓
5. Generate Prisma client (pnpm run db:generate)
   ↓
6. Push/migrate schema (pnpm run db:push)
   ↓
7. Seed initial data (pnpm run seed:products)
   ↓
8. Run dev server (pnpm run dev)
   ↓
9. Test aplikasi (login → create sale → check report)
```

## File dan Folder Penting

```
kios-pos/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   └── trpc/         # tRPC endpoints
│   │   ├── cashier/          # Halaman kasir
│   │   ├── management/       # Halaman manajemen
│   │   │   ├── products/    # Kelola produk
│   │   │   └── stock/       # Kelola stok
│   │   ├── reports/          # Halaman laporan
│   │   │   └── daily/       # Laporan harian
│   │   └── auth/             # Halaman login/logout
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/           # Layout components
│   │   └── dashboard/        # Dashboard widgets
│   ├── server/               # Server-side code
│   │   ├── api/              # tRPC routers & schemas
│   │   │   ├── routers/     # Router definitions
│   │   │   ├── schemas/     # Zod validation schemas
│   │   │   └── services/    # Business logic
│   │   ├── auth.ts          # NextAuth configuration
│   │   └── db.ts            # Prisma client
│   ├── lib/                  # Utility functions
│   │   ├── pdf.ts           # PDF generation
│   │   ├── utils.ts         # Helper functions
│   │   └── mock-mode.ts     # MSW mock setup
│   └── env.ts                # Environment validation
├── prisma/
│   └── schema.prisma         # Database schema
├── scripts/
│   ├── seed-supabase.mjs     # Import produk dari CSV
│   ├── seed-initial.mjs      # Setup data testing
│   ├── check-env.mjs         # Validasi environment
│   └── auth-post.mjs         # Test auth endpoints
├── data/
│   └── initial-products.csv  # Data produk awal
├── tests/
│   ├── unit/                 # Vitest unit tests
│   └── e2e/                  # Playwright E2E tests
├── docs/
│   └── UI_STYLE.md           # Style guide
├── CHANGELOG.md              # Riwayat perubahan
├── MIGRATION_GUIDE.md        # Panduan migrasi database
├── DEPLOYMENT.md             # Panduan deployment
└── README.md                 # Dokumentasi utama
```

## Metrics & KPIs

### Performance Targets

- **Time to First Byte (TTFB)**: < 200ms
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.0s
- **API Response Time**: < 500ms (p95)
- **Database Query Time**: < 100ms (p95)

### Business Metrics

- **Transaksi per hari**: Tracking via daily report
- **Rata-rata nilai transaksi**: Total / jumlah transaksi
- **Top selling products**: Count di SaleItem
- **Payment method distribution**: Breakdown di Payment
- **Diskon utilization**: % transaksi dengan diskon

## Roadmap

### Phase 1: MVP (✅ Completed)

- [x] Setup project structure
- [x] Database schema
- [x] Authentication system
- [x] Modul kasir dasar
- [x] Manajemen produk
- [x] Laporan harian
- [x] PDF receipt
- [x] Testing infrastructure

### Phase 2: Enhancement (🚧 In Progress)

- [ ] Laporan bulanan & tahunan
- [ ] Export laporan ke Excel/PDF
- [ ] Dashboard analytics dengan charts
- [ ] Low stock alerts
- [ ] User management UI
- [ ] Audit log untuk admin actions
- [ ] Product image upload
- [ ] Barcode generator

### Phase 3: Integration (📋 Planned)

- [ ] QRIS payment gateway (Xendit/Midtrans)
- [ ] EDC integration untuk kartu debit/kredit
- [ ] Email notifications
- [ ] WhatsApp notifications
- [ ] Marketplace integration (Tokopedia, Shopee)
- [ ] Accounting software integration
- [ ] Loyalty program

### Phase 4: Scale (🔮 Future)

- [ ] Multi-currency support
- [ ] Multi-language (i18n)
- [ ] Mobile app (React Native)
- [ ] Offline mode dengan sync
- [ ] AI-powered demand forecasting
- [ ] Advanced reporting & BI

## Kontributor & Maintenance

### Setup Development

```bash
# Clone & install
git clone https://github.com/noah-isme/kios-pos.git
cd kios-pos
pnpm install

# Setup environment
cp .env.example .env
# Edit .env dengan credentials Anda

# Setup database
pnpm run db:push
pnpm run seed:products

# Run dev server
pnpm run dev
```

### Workflow

1. **Development**: Buat branch dari `main`
2. **Testing**: Jalankan `pnpm run verify` sebelum commit
3. **Pull Request**: Submit PR dengan deskripsi jelas
4. **Review**: Wait for code review
5. **Merge**: Setelah approved, merge ke `main`
6. **Deploy**: Auto-deploy via Vercel

### Coding Standards

- **TypeScript strict mode** - No `any` types
- **ESLint + Biome** - Linting & formatting
- **Conventional Commits** - Commit message format
- **100% type coverage** - All functions typed
- **Test coverage > 80%** - Unit & E2E tests
- **Documentation** - JSDoc untuk complex functions

## Support & Resources

### Dokumentasi

- [README.md](./README.md) - Getting started
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Database setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [CHANGELOG.md](./CHANGELOG.md) - Version history

### Referensi External

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [NextAuth Docs](https://next-auth.js.org)

### Issues & Bugs

Report bugs di GitHub Issues dengan template:

```markdown
**Deskripsi Bug**
Jelaskan bug dengan jelas dan ringkas.

**Langkah Reproduksi**
1. Buka halaman '...'
2. Klik '...'
3. Lihat error

**Expected Behavior**
Jelaskan apa yang seharusnya terjadi.

**Screenshots**
Tambahkan screenshot jika membantu.

**Environment**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 0.1.0]
```

## Lisensi

[Tentukan lisensi sesuai kebutuhan project]

---

**Catatan**: Dokumen ini adalah living document dan akan diupdate seiring perkembangan proyek.

**Last Updated**: Oktober 2025
**Version**: 0.1.0
