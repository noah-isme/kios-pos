# Panduan Deploy Kios POS

Panduan lengkap untuk deploy Kios POS ke production.

## Daftar Isi

1. [Deployment ke Vercel](#deployment-ke-vercel)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Environment Variables](#environment-variables)
4. [Email Service Setup](#email-service-setup)
5. [Google OAuth Setup](#google-oauth-setup)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring dan Maintenance](#monitoring-dan-maintenance)

## Deployment ke Vercel

### 1. Persiapan

```bash
# Install Vercel CLI (opsional)
npm i -g vercel

# Login ke Vercel
vercel login
```

### 2. Link Project

```bash
# Di root project
vercel link
```

Pilih/buat project baru dan link dengan repository GitHub Anda.

### 3. Set Environment Variables

Di Vercel Dashboard (Settings > Environment Variables), tambahkan semua variabel dari `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
SHADOW_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Email
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=Kios POS <noreply@yourdomain.com>

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Supabase Client
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>

# App Settings
DISCOUNT_LIMIT_PERCENT=50
STORE_NPWP=01.234.567.8-901.000
```

### 4. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

Atau gunakan GitHub integration untuk auto-deploy pada setiap push ke main branch.

## Database Setup (Supabase)

### 1. Buat Project Supabase

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Klik "New Project"
3. Isi detail:
   - **Name**: kios-pos
   - **Database Password**: Generate password yang kuat
   - **Region**: Pilih region terdekat dengan users
4. Tunggu project provisioning (~2 menit)

### 2. Setup Connection Pooling

1. Di Supabase Dashboard, buka Settings > Database
2. Copy **Connection Pooling** string untuk `DATABASE_URL`
3. Copy **Connection String** (Direct) untuk `SHADOW_DATABASE_URL`

Format:
```env
# Pooling (untuk application)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct (untuk migrations)
SHADOW_DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Jalankan Migrasi

```bash
# Set environment variables
export DATABASE_URL="<connection-pooling-url>"
export SHADOW_DATABASE_URL="<direct-connection-url>"

# Run migrations
pnpm run db:migrate

# Verify
pnpm run db:studio
```

### 4. Seed Data Produk

```bash
pnpm run seed:products
```

### 5. Setup Storage (Opsional)

Jika menggunakan Supabase Storage untuk upload gambar produk:

1. Di Supabase Dashboard, buka Storage
2. Buat bucket baru: `product-images`
3. Set policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'product-images');

   -- Allow public read
   CREATE POLICY "Allow public read"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'product-images');
   ```

## Environment Variables

### Critical Variables (Wajib)

- `DATABASE_URL` - Connection string ke database
- `NEXTAUTH_SECRET` - Secret untuk JWT signing
- `NEXTAUTH_URL` - URL aplikasi Anda

### Optional tapi Disarankan

- `EMAIL_SERVER_*` - Untuk magic link authentication
- `GOOGLE_CLIENT_ID/SECRET` - Untuk Google OAuth
- `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` - Untuk storage/realtime

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API keys (jika diperlukan)
openssl rand -hex 32
```

## Email Service Setup

### Option 1: SendGrid (Recommended)

1. Daftar di [SendGrid](https://sendgrid.com)
2. Verify domain Anda
3. Buat API Key:
   - Settings > API Keys > Create API Key
   - Permissions: "Full Access" atau "Mail Send"
4. Setup environment variables:
   ```env
   EMAIL_SERVER_HOST=smtp.sendgrid.net
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=apikey
   EMAIL_SERVER_PASSWORD=<your-api-key>
   EMAIL_FROM=Kios POS <noreply@yourdomain.com>
   ```

### Option 2: Amazon SES

1. Setup di AWS Console > SES
2. Verify domain
3. Buat SMTP credentials
4. Setup environment variables:
   ```env
   EMAIL_SERVER_HOST=email-smtp.<region>.amazonaws.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=<smtp-username>
   EMAIL_SERVER_PASSWORD=<smtp-password>
   EMAIL_FROM=Kios POS <noreply@yourdomain.com>
   ```

### Option 3: Resend (Modern Alternative)

1. Daftar di [Resend](https://resend.com)
2. Verify domain
3. Buat API Key
4. Gunakan Resend SDK (perlu sedikit modifikasi code)

## Google OAuth Setup

### 1. Buat OAuth Client

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru atau pilih existing
3. Enable "Google+ API"
4. Credentials > Create Credentials > OAuth Client ID
5. Application Type: "Web application"
6. Authorized JavaScript origins:
   ```
   https://yourdomain.vercel.app
   http://localhost:3000 (untuk development)
   ```
7. Authorized redirect URIs:
   ```
   https://yourdomain.vercel.app/api/auth/callback/google
   http://localhost:3000/api/auth/callback/google
   ```

### 2. Configure Consent Screen

1. OAuth consent screen > Edit
2. Isi informasi aplikasi
3. Add scopes: `email`, `profile`
4. Add test users (jika masih testing)

### 3. Set Environment Variables

```env
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
```

## Post-Deployment Verification

### 1. Health Check Endpoints

```bash
# Check if app is live
curl https://yourdomain.vercel.app

# Check auth endpoints
curl https://yourdomain.vercel.app/api/auth/providers

# Check tRPC endpoints (should return 401 if not authenticated)
curl https://yourdomain.vercel.app/api/trpc/products.list
```

### 2. Test Authentication

1. Buka `https://yourdomain.vercel.app/auth/login`
2. Test magic link atau Google OAuth
3. Verify session persistence
4. Check role-based access

### 3. Test Core Features

- [ ] Login dengan magic link
- [ ] Login dengan Google OAuth
- [ ] Akses halaman Kasir
- [ ] Akses halaman Produk
- [ ] Akses halaman Laporan
- [ ] Buat transaksi test
- [ ] Export PDF struk
- [ ] Lihat laporan harian

### 4. Performance Check

```bash
# Lighthouse audit
npx lighthouse https://yourdomain.vercel.app --view

# Core Web Vitals
# Cek di Vercel Analytics atau Google Search Console
```

## Monitoring dan Maintenance

### Vercel Analytics

Enable di Vercel Dashboard:
1. Project > Analytics
2. Enable Web Analytics
3. Enable Audiences (opsional)

### Database Monitoring

Di Supabase Dashboard:
1. Reports > Performance
2. Monitor query performance
3. Set up alerts untuk:
   - Connection pool exhaustion
   - Slow queries (>1s)
   - High CPU usage

### Error Tracking (Recommended)

Setup Sentry untuk production error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

Environment variables:
```env
SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
```

### Backup Strategy

#### Database Backups

Supabase otomatis backup daily. Untuk manual backup:

```bash
# Export via Supabase CLI
supabase db dump -f backup.sql

# Atau via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

#### Point-in-Time Recovery

Supabase Pro plan menyediakan PITR. Setup di Dashboard > Settings > Backups.

### Maintenance Checklist

#### Daily
- [ ] Monitor error rates di Vercel/Sentry
- [ ] Check database metrics di Supabase

#### Weekly
- [ ] Review slow queries
- [ ] Check disk space usage
- [ ] Review user feedback/issues

#### Monthly
- [ ] Update dependencies: `pnpm update`
- [ ] Review security advisories
- [ ] Backup production database
- [ ] Review analytics dan usage patterns

## Scaling Considerations

### Database

- **Connection Pooling**: Sudah setup via Supabase Pooler (PgBouncer)
- **Read Replicas**: Available di Supabase Pro plan
- **Indexes**: Review query performance dan tambah indexes jika perlu

### Caching

Implementasi caching layer:

```typescript
// Di tRPC procedures, gunakan staleTime
export const productRouter = router({
  list: publicProcedure
    .input(productListInputSchema)
    .query(async ({ ctx, input }) => {
      // ... query
    })
    .meta({ 
      staleTime: 60_000 // Cache 1 menit
    })
});
```

### CDN

Vercel otomatis menggunakan CDN untuk:
- Static assets
- ISR/SSG pages
- API routes dengan caching headers

### Rate Limiting

Implementasi rate limiting untuk API:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});
```

## Troubleshooting Production

### Issue: 500 Internal Server Error

1. Check Vercel logs: `vercel logs <deployment-url>`
2. Check Sentry (jika enabled)
3. Verify environment variables
4. Check database connection

### Issue: Database Connection Timeout

1. Verify connection pooling URL
2. Check Supabase status
3. Increase connection pool size jika perlu
4. Monitor concurrent connections

### Issue: Authentication Failures

1. Verify `NEXTAUTH_SECRET` set correctly
2. Check `NEXTAUTH_URL` matches deployment URL
3. Verify OAuth redirect URLs di Google Console
4. Check email service credentials

### Issue: Slow Performance

1. Enable Vercel Analytics
2. Check database query performance
3. Add database indexes
4. Implement caching
5. Optimize bundle size

## Security Checklist

- [ ] `NEXTAUTH_SECRET` adalah random string yang kuat
- [ ] Database credentials tidak exposed di client
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] SQL injection protection (Prisma handles ini)
- [ ] XSS protection (React handles ini)
- [ ] CSRF protection (NextAuth handles ini)
- [ ] HTTPS enforced (Vercel default)
- [ ] Security headers configured di `next.config.ts`
- [ ] Regular dependency updates
- [ ] Environment variables tidak di-commit

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth Deployment](https://next-auth.js.org/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
