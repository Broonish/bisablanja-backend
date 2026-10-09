# AGENTS.md

Panduan untuk AI agent dan developer di repository backend Bisablanja.com.

## Ringkasan
API backend marketplace sembako Bisablanja.com (PRD v1.5). Hono + Zod di Cloudflare Workers.
Sumber kebenaran: PRD dan issue Linear project Backend Development (kode issue BE-xx).

## Tech stack
- TypeScript 5, Hono, `@hono/zod-openapi`, Zod
- Cloudflare Workers (wrangler), environment: local, staging, production
- Rencana (belum ada di repo): D1 + Drizzle, R2, Firebase Auth

## Perintah
- `pnpm dev`: jalankan lokal (http://localhost:8787)
- `pnpm lint` / `pnpm typecheck` / `pnpm test`: wajib lulus sebelum PR
- `pnpm openapi:generate`: buat ulang `openapi.json` setiap route berubah
- `pnpm types`: buat ulang tipe binding wrangler setelah mengubah `wrangler.jsonc`

## Struktur
- `src/modules/<nama>/`: satu folder per modul (`*.route.ts`, `*.schema.ts`, `*.service.ts`)
- `src/lib/`: helper bersama (errors, pagination)
- `src/middleware/`: middleware bersama (CORS, idempotency)
- `test/`: test Vitest, `scripts/`: skrip pendukung

## Konvensi
- Semua route di bawah `/v1`, didefinisikan dengan `createRoute` agar masuk ke `openapi.json`.
- Error selalu memakai envelope `{ error: { code, message, details } }`, pesan berbahasa Indonesia. Lempar `AppError`, jangan membuat format sendiri.
- Kode error UPPER_SNAKE_CASE. Validasi gagal: 422 `VALIDATION_ERROR`.
- Field JSON memakai snake_case, mengikuti PRD (contoh: `product_id`).
- Uang berupa integer rupiah. Bahasa id-ID, zona waktu bisnis WIB (BR-22).
- Pagination: query `page` (default 1) dan `limit` (default 20, maksimum 100) lewat `paginationQuerySchema`.
- Route tipis: business logic ditaruh di service, bukan di handler.

## Aturan untuk agent
- Kerjakan hanya scope issue Linear yang sedang dikerjakan. Jangan menambah fitur di luar scope.
- Jangan pernah commit secret. Variabel lokal ada di `.dev.vars` (di-ignore), contohnya di `.dev.vars.example`.
- Jalankan lint, typecheck, test, dan `pnpm openapi:generate` sebelum menyatakan pekerjaan selesai.
- Setiap perubahan API wajib menyertakan `openapi.json` yang sudah diperbarui (NFR-10).
- Harga dan total tidak dipercaya dari klien; dihitung di server (BR-09, NFR-02).
- Tulis test untuk perilaku baru. Jangan mematikan aturan lint untuk meloloskan kode.