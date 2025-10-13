# Kios POS — UI Style Guide

Ringkasan ini menjelaskan konvensi styling dan komponen UI yang digunakan di proyek Kios POS. Tujuannya:

- Menyediakan kontrak visual untuk developer dan desainer.
- Menjelaskan token warna / variable CSS dan cara mereka dipakai bersama Tailwind.
- Menjelaskan utilitas UI yang dipakai di banyak tempat (focusable cards, shimmer, accent classes).
- Menjelaskan primitive motion/animasi, pola optimistic delete + Undo, dan aturan aksesibilitas.

File ini bukan dokumentasi desain lengkap, melainkan panduan praktis untuk menambahkan/menyesuaikan UI sejalan dengan pola proyek.

## Lokasi penting

- Global CSS / tokens: `src/app/globals.css`
- Tailwind config: `tailwind.config.js`
- Motion primitives: `src/components/ui/motion-variants.ts`, `src/components/ui/motion-list.tsx`, `src/components/ui/motion-table.tsx`
- Card component and small UI primitives: `src/components/ui/card.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`
- Optimistic / delete queue: `src/lib/optimistic.ts`, `src/lib/delete-queue.ts`
- Undo toast: `src/components/ui/undo-toast.tsx`
- Accent preview: `src/app/dev/accents/page.tsx` (route: `/dev/accents`)

## Design tokens & CSS variables

Semua token warna utama dan varian accent didefinisikan sebagai CSS variables di `:root` di `globals.css`. Contoh:

- `--accent-amber-50`, `--accent-amber-100`, `--accent-amber-200`, `--accent-amber-700`
- `--accent-sky-*`, `--accent-emerald-*`

Keuntungan:

- runtime theming (dark mode atau tema dinamis) bisa mengubah nilai di CSS tanpa rebuild Tailwind.
- nilai-nilai ini juga digunakan di `tailwind.config.js` (sebagai `var(--...)`) sehingga utility classes tetap tersedia.

Jika perlu menambah warna baru:

1. Tambahkan variable di `:root` dan (opsional) override di `.dark` jika behavior berbeda di dark mode.
2. Tambahkan mapping di Tailwind config hanya bila Anda ingin Tailwind menghasilkan kelas bawaan yang memakai nilai tersebut (mis. `accent-<name>-100`).

Contoh (ringkas) — menambahkan `cerise`:

1. `src/app/globals.css`

```css
:root { --accent-cerise-50: #fff0f6; --accent-cerise-100: #ffd6e7; --accent-cerise-700: #be185d; }
.accent-cerise { --a-50: var(--accent-cerise-50); --a-100: var(--accent-cerise-100); --a-700: var(--accent-cerise-700); }
.accent-cerise-gradient { background-image: linear-gradient(135deg, var(--a-50), var(--a-100), var(--a-700)); }
```

2. (Opsional) `tailwind.config.js` — tambahkan referensi jika ingin kelas Tailwind yang mengacu `var(--accent-cerise-100)`.

## Tailwind wiring

Pattern yang dipakai: Tailwind color entries reference CSS variables. Contoh di `tailwind.config.js`:

```js
colors: {
  'accent-amber-100': 'var(--accent-amber-100)',
  // ...
}
```

Artinya utilitas Tailwind seperti `bg-accent-amber-100` akan menggunakan nilai runtime dari `--accent-amber-100`.

Pastikan `content` di `tailwind.config.js` mencakup seluruh `src` dan `app` agar kelas diformat saat build.

## Accent utility classes

Di `globals.css` ada helper classes yang mempermudah penggunaan accent pada elemen kartu/icon:

- `.accent-<name>` — men-set beberapa `--a-*` runtime variables untuk kartu (dipakai untuk gradient/icon utilities)
- `.accent-gradient` — membuat gradient memakai `--a-50/100/200` (digunakan pada header kartu)
- `.accent-icon` — background + color untuk area icon kecil

Contoh di markup:

```tsx
<Card className="card-focusable accent-amber">
  <div className="card-gradient-shimmer accent-gradient" />
  <div className="rounded-md p-2 accent-icon"> ...icon... </div>
</Card>
```

## Card focus & shimmer utilities

Standar untuk membuat kartu konsisten:

- `card-focusable` — class yang memberi transition, focus ring, dan subtle lift saat keyboard focus. Gunakan pada kartu yang harus dapat di-tabbable secara global.
- `card-gradient-shimmer` — wrapper untuk masked shimmer overlay. Respect `prefers-reduced-motion`.

Rekomendasi:

- Jika seluruh kartu adalah tautan (mis. homepage quick action), bungkus `Card` dengan `<Link>` dan berikan `tabIndex={0}` pada `Card` agar fokus terlihat tanpa merusak aksesibilitas tautan internal.
- Jika kartu mengandung banyak kontrol interaktif (form, button), pertimbangkan untuk tidak membuat container kartu fokusable agar tidak menciptakan double focus order.

## Motion primitives

Kustom motion primitives yang tersedia:

- `MotionList` + `MotionItem` — list yang otomatis membuat staggered entrance.
- `MotionTableBody` + `MotionTableRow` — tabel dengan staggered row animations.
- `containerCards`, `cardVariant`, `rowVariant`, `fadeVariant` — variant presets di `motion-variants.ts`.

Cara pakai singkat:

```tsx
import MotionList, { MotionItem } from '@/components/ui/motion-list';
import { containerCards, cardVariant } from '@/components/ui/motion-variants';

<MotionList variants={containerCards} className="grid ...">
  {items.map(i => (
    <MotionItem key={i.id} variants={cardVariant}> ... </MotionItem>
  ))}
</MotionList>
```

Preferensi:

- Variants dipilih agar animasi cepat, subtle, dan menghormati `prefers-reduced-motion`.

## Optimistic delete + Undo pattern

Pola UX yang dipakai saat hapus:

1. Optimistic update: hapus item di UI segera (cache update) menggunakan helper `optimisticOnMutate`.
2. Schedule server delete: panggil server delete setelah delay (mis. 6s) — diimplementasikan di `delete-queue.ts`.
3. Tampilkan Undo toast (`useUndoToast` di `undo-toast.tsx`) yang memberi kesempatan untuk membatalkan selama countdown.
4. Jika Undo dipilih, cancel scheduled delete dan restore snapshot dari optimistic helper.

File referensi: `src/lib/optimistic.ts`, `src/lib/delete-queue.ts`, `src/components/ui/undo-toast.tsx`.

## Accessibility guidance

- Fokus: gunakan `card-focusable` untuk memperjelas fokus keyboard pada kartu. Pastikan tidak membuat dua fokus untuk satu interaksi.
- Motion: gunakan `prefers-reduced-motion` guards pada semua animasi (sudah diterapkan pada shimmer dan motion primitives).
- ARIA: untuk card yang mewakili entitas dengan judul dan deskripsi, gunakan `aria-labelledby` dan `aria-describedby` untuk mempermudah screen reader (contoh di `docs/persiapan-awal/page.tsx`).
- Color contrast: periksa kontras warna teks terhadap background (kartu dengan gradient menggunakan area icon berwarna ringan; teks utama tetap tempel di area card yang mempunyai kontras cukup).

## How to preview

1. Jalankan dev server:
```bash
pnpm dev
```
2. Buka: `http://localhost:3000/dev/accents` untuk melihat preview accent, shimmer, dan fokus.
3. Cek halaman lain (home, reports, products) untuk melihat bagaimana utilitas ini dipakai di produksi.

## Testing

- Unit tests: `pnpm run test:unit` (Vitest)
- E2E / Playwright (jika dikonfigurasi): `pnpm run test:e2e` (jalankan setelah dev server aktif)

## When to add new utilities

- Jika ada kebutuhan design yang berulang (mis. background variant baru, chip, badge khusus), prefer menambahkan small, composable utility di `globals.css` dan usage example di `src/app/dev/accents/page.tsx`.
- Jangan menambahkan global class yang terlalu spesifik untuk satu halaman — prefer komposisi utility + component prop.

## Troubleshooting

- Tailwind classes not applied: pastikan `tailwind.config.js` `content` path mencakup file yang memakai kelas.
- Colors not updating in runtime: periksa variable names di `:root` dan pastikan kelas CSS merujuk `var(--accent-... )` yang tepat.
- Focus ring missing: pastikan `.card-focusable` tidak dioverride oleh aturan lain dan periksa `prefers-reduced-motion` setting pada OS (akan mematikan some transitions).

## Example checklist for PRs that touch UI styles

- Add/update tokens in `globals.css` and optionally `tailwind.config.js`.
- Add usage example to `src/app/dev/accents/page.tsx` (or update it) for reviewers to visually validate.
- Run `pnpm tsc --noEmit` and `pnpm run test:unit`.
- Manually spot-check pages affected and run E2E tests if they cover the area.

---

If you ingin, saya bisa:

- Menjalankan repo-wide sweep untuk menerapkan `card-focusable` ke semua Card yang cocok.
- Membuat small `CONTRIBUTING_UI.md` template yang meng-automate checklist PR UI (test, preview, screenshot).

Pilih salah satu bila mau saya lanjutkan.
