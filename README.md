# Bisablanja Backend

API backend Bisablanja.com: Hono + Zod di Cloudflare Workers.
Repository: skalar.cc/bisablanja-backend

## Menjalankan di lokal

Prasyarat: Node.js LTS terbaru dan pnpm.

```bash
pnpm install
cp .dev.vars.example .dev.vars    # PowerShell: Copy-Item .dev.vars.example .dev.vars
pnpm dev
```

Cek: buka http://localhost:8787/v1/health, harus mengembalikan `{"status":"ok", ...}`.

## Script

| Script                  | Fungsi                                             |
| ----------------------- | -------------------------------------------------- |
| `pnpm dev`              | Menjalankan `wrangler dev`                         |
| `pnpm types`            | Membuat tipe binding (`worker-configuration.d.ts`) |
| `pnpm typecheck`        | Pengecekan tipe TypeScript                         |
| `pnpm lint`             | ESLint                                             |
| `pnpm format`           | Prettier (mengubah file)                           |
| `pnpm test`             | Vitest                                             |
| `pnpm openapi:generate` | Membuat ulang `openapi.json`                       |

## Struktur folder

```
src/
  index.ts            entry Worker
  app.ts              createApp(): CORS, middleware, route, OpenAPI, error handler
  types.ts            Bindings, Variables, AppEnv
  lib/                helper bersama
    errors.ts         AppError, errorBody, toErrorDetails
    pagination.ts     paginationQuerySchema, buildPaginationMeta, paginatedSchema
    version.ts        API_VERSION
  middleware/         middleware bersama (idempotency.ts: header Idempotency-Key)
  modules/<nama>/     satu folder per modul
    <nama>.route.ts   definisi route (createRoute) dan handler tipis
    <nama>.schema.ts  schema Zod request/response
    <nama>.service.ts business logic
test/                 test Vitest (*.test.ts)
scripts/              skrip pendukung (generate-openapi.ts)
.github/workflows/    CI dan deploy staging
openapi.json          hasil generate, jangan diedit manual
wrangler.jsonc        konfigurasi Worker per environment
```

Route modul baru didaftarkan di `src/app.ts` lewat `app.route('/v1', <nama>Routes)`.

## Konvensi

- File dan folder: kebab-case, dengan akhiran peran (`health.route.ts`, `product.schema.ts`, `order.service.ts`).
- Path API: `/v1/<resource>` dengan kebab-case. Kontrak menulis path tanpa `/v1` karena `/v1` sudah ada di URL server.
- Semua route didefinisikan dengan `createRoute` dari `@hono/zod-openapi` agar masuk ke `openapi.json`.
- Field JSON dan query parameter: snake_case, mengikuti PRD dan kontrak (`product_id`, `per_page`).
- Kode error: snake_case huruf kecil, mengikuti enum `ErrorCode` di kontrak (`validation_error`, `not_found`).
- Pesan error berbahasa Indonesia. Uang berupa integer rupiah, zona waktu bisnis WIB (BR-22).
- Issue Linear memakai kode `BE-xx`; PR berjudul `BE-xx: <judul issue>` dan menyertakan ID issue Linear.

## Variabel environment

| Variabel               | Fungsi                              | Contoh                                    |
| ---------------------- | ----------------------------------- | ----------------------------------------- |
| `ENVIRONMENT`          | Nama environment                    | `local`                                   |
| `CORS_ALLOWED_ORIGINS` | Origin yang diizinkan, dipisah koma | `http://localhost:5173,https://localhost` |

Lokal dibaca dari `.dev.vars`. Staging dan production diatur di `wrangler.jsonc` dan Cloudflare secrets (pipeline deploy dikerjakan di BE-02).

## Format error

```json
{
  "error": {
    "code": "validation_error",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "field": "items[0].qty", "message": "..." }]
  }
}
```

`details` hanya ada untuk validasi gagal. Kode error mengikuti enum `ErrorCode` di draft kontrak (lihat bagian OpenAPI).

| Kode                      | Status | Keterangan                           |
| ------------------------- | ------ | ------------------------------------ |
| `validation_error`        | 400    | Validasi Zod gagal                   |
| `invalid_idempotency_key` | 400    | Header `Idempotency-Key` tidak valid |
| `not_found`               | 404    | Rute tidak ditemukan                 |
| `http_error`              | sesuai | Error HTTP dari framework            |
| `internal_error`          | 500    | Kesalahan server                     |

## Pagination

Query `page` (default 1) dan `per_page` (default 20, maksimum 100). Response list berbentuk `{ data, meta: { page, per_page, total, total_pages } }`. Helper ada di `src/lib/pagination.ts`.

## CORS

Hanya origin di `CORS_ALLOWED_ORIGINS` yang mendapat header CORS (origin admin dan origin Capacitor Android `https://localhost`).

## OpenAPI

- Draft kontrak lengkap (seluruh endpoint MVP): `bisablanja-openapi.json` / `bisablanja-openapi.yaml` di repo workspace Bisablanja.com. Ini acuan saat membuat route baru.
- `openapi.json` di repo ini adalah hasil generate dari route yang sudah diimplementasikan lewat `pnpm openapi:generate`. Jangan diedit manual. Wajib dijalankan dan di-commit setiap API berubah (NFR-10); CI gagal bila `openapi.json` tidak sesuai hasil generate.

## Konfigurasi AI agent

Panduan agent ada di `AGENTS.md` (dan `CLAUDE.md` yang mengacu ke file yang sama). Berisi stack, perintah, struktur, konvensi, dan aturan kerja agent.
