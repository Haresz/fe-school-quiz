# Quiz Maker - Frontend

Aplikasi kuis untuk murid sekolah dasar dan pembuat kuis (guru/orang tua). Frontend ini dibangun dengan React 19, Vite, Tailwind CSS v4, TanStack Query, React Hook Form, Zod, dan Supabase.

## Menjalankan Proyek

Prasyarat: Node.js 22+ dan npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Buka `http://localhost:5173`.

### Variabel Lingkungan

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Ya | URL project Supabase. |
| `VITE_SUPABASE_ANON_KEY` | Ya | Anon/public key Supabase. Aman dipakai di browser selama RLS aktif. |
| `VITE_API_BASE_URL` | Ya | Base URL backend AI, contoh `http://localhost:3000`. Tanpa garis miring di akhir. |

Jangan pernah menaruh service role key, secret key, atau token OpenRouter di frontend. Semua nilai `VITE_*` ikut ter-bundle ke browser.

## Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan Vite. |
| `npm run build` | Typecheck lalu build produksi ke `dist/`. |
| `npm run preview` | Melihat hasil build secara lokal. |
| `npm run typecheck` | Memeriksa TypeScript tanpa emit. |
| `npm run lint` | Menjalankan ESLint. |
| `npm test` | Menjalankan seluruh test Vitest sekali. |
| `npm run test:watch` | Menjalankan test dalam mode watch. |

## Arsitektur

```text
src/
  api/          Akses Supabase dan HTTP backend, error mapping, tipe data
  components/   Komponen UI bersama
  features/     Auth, dasbor, editor kuis, generator AI, pemutar, hasil
  i18n/         Seluruh teks antarmuka Bahasa Indonesia
  lib/          Env, Supabase client, util, query client
  routes/       Layout, proteksi route, halaman 404
```

- Semua akses Supabase dan backend berada di `src/api/*`; komponen tidak memanggil Supabase langsung.
- Data server dikelola TanStack Query. Form memakai React Hook Form + resolusi Zod.
- Route pembuat kuis dilindungi `ProtectedRoute`; route murid `/` dan `/play/:code` bersifat publik.
- `vercel.json` mengarahkan semua path SPA ke `index.html`.

## Supabase

Aktifkan autentikasi email/password, lalu isi Site URL dan Redirect URLs dengan domain aplikasi.

RLS wajib aktif pada tabel `quizzes`, `questions`, `attempts`, `attempt_answers`, dan `materials`:

- Pembuat hanya dapat membaca dan mengubah kuis miliknya.
- Murid hanya dapat membaca kuis berstatus `published` dan mengirim attempt.
- `materials` harus mengizinkan pembuat membaca materi aktif. Halaman generator AI mengambil daftar materi langsung dari tabel ini.
- Anon key hanya boleh melakukan operasi yang diizinkan policy.

Untuk pengembangan lokal, pastikan minimal ada satu baris `materials` dengan `is_active = true`, jika tidak halaman AI akan menampilkan keadaan kosong.

## Backend AI

Frontend memanggil `POST {VITE_API_BASE_URL}/ai/generate-quiz` dengan header `Authorization: Bearer <access_token Supabase>`.

Body:

```json
{
  "material_id": "uuid",
  "prompt": "fokus pada soal cerita",
  "num_questions": 5,
  "mix": "mixed",
  "difficulty": "sedang"
}
```

Respons sukses:

```json
{
  "generation_id": "uuid",
  "draft": {
    "material_id": "uuid",
    "title": "Judul kuis",
    "description": "Deskripsi",
    "source": "ai",
    "status": "draft",
    "settings": { "reveal_answers": true },
    "questions": []
  }
}
```

Respons gagal memakai `{ "error": { "code": "...", "message": "..." } }`. Frontend menangani `unauthorized`, `invalid_request`, `material_not_found`, `rate_limited`, `ai_capacity_reached`, `ai_bad_output`, `ai_blocked`, `ai_timeout`, `ai_quota_exceeded`, `ai_unavailable`, dan `internal_error`.

Backend harus mengizinkan origin frontend melalui CORS, termasuk header `Authorization` dan `Content-Type`, serta menangani preflight `OPTIONS`.

## Deploy ke Vercel

1. Impor repository ini sebagai project Vercel.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Tambahkan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_API_BASE_URL` untuk environment Production (dan Preview bila perlu).
4. Deploy. `vercel.json` sudah menangani rewrite SPA.
5. Daftarkan domain Vercel pada Site URL/Redirect URLs Supabase dan daftar origin CORS backend.
6. Verifikasi alur: daftar/masuk, buat kuis manual, generate AI, terbitkan, buka `/play/:code`, kirim jawaban, lalu lihat hasil.

Jika backend dan frontend berada di domain berbeda, cookie tidak dipakai; autentikasi tetap memakai Bearer token. Pastikan HTTPS aktif di production.

## Test dan Verifikasi

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Test mencakup auth, API, validasi form, editor, generator AI, dasbor, pemutar, hasil, dan halaman 404. Build produksi saat ini menghasilkan satu chunk utama di atas 500 kB; ini peringatan ukuran, bukan kegagalan build.

## Batasan

- Timer kuis dihitung di sisi klien berdasarkan waktu mulai; server tidak menegakkan batas waktu, jadi jawaban yang dikirim setelah waktu habis tetap diterima.
- Belum ada uji E2E browser terhadap Supabase dan backend AI nyata.
- Policy RLS `materials`, data seed, dan konfigurasi CORS backend perlu diverifikasi di environment target.
- Kunci/secret yang pernah terekspos harus dirotasi sebelum production.
