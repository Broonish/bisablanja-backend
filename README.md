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

| Script | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan `wrangler dev` |
| `pnpm types` | Membuat tipe binding (`worker-configuration.d.ts`) |
| `pnpm typecheck` | Pengecekan tipe TypeScript |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier (mengubah file) |
| `pnpm test` | Vitest |
| `pnpm openapi:generate` | Membuat ulang `openapi.json` |

## Struktur folder

```
src/
  index.ts          entry Worker
  app.ts            createApp(): middleware, route, OpenAPI, error handler
  types.ts          Bindings, Variables, AppEnv
  lib/              helper bersama (errors, pagination)
  middleware/       CORS dan Idempotency-Key
  modules/<nama>/   satu folder per modul (route, schema, service)
test/               test Vitest
scripts/            skrip pendukung (generate-openapi)
```

## Konvensi penamaan

- File dan folder: kebab-case, dengan akhiran peran (`health.route.ts`, `product.schema.ts`, `order.service.ts`).
- Path API: `/v1/<resource>` dengan kebab-case.
- Field JSON: snake_case, mengikuti PRD.
- Kode error: UPPER_SNAKE_CASE.
- Issue Linear memakai kode `BE-xx`; PR berjudul `BE-xx: <judul issue>` dan menyertakan ID issue Linear.

## Variabel environment

| Variabel | Fungsi | Contoh |
|---|---|---|
| `ENVIRONMENT` | Nama environment | `local` |
| `CORS_ALLOWED_ORIGINS` | Origin yang diizinkan, dipisah koma | `http://localhost:5173,https://localhost` |

Lokal dibaca dari `.dev.vars`. Staging dan production diatur di `wrangler.jsonc` dan Cloudflare secrets (pipeline deploy dikerjakan di BE-02).

## Format error

```json
{ "error": { "code": "NOT_FOUND", "message": "Rute tidak ditemukan.", "details": null } }
```

| Kode | Status | Keterangan |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Validasi Zod gagal; `details` berisi daftar isu |
| `NOT_FOUND` | 404 | Rute tidak ditemukan |
| `INVALID_IDEMPOTENCY_KEY` | 400 | Header `Idempotency-Key` tidak valid |
| `HTTP_ERROR` | sesuai | Error HTTP dari framework |
| `INTERNAL_ERROR` | 500 | Kesalahan server |

## Pagination dan Idempotency-Key

- Query `page` (default 1) dan `limit` (default 20, maksimum 100). Helper ada di `src/lib/pagination.ts`.
- Header `Idempotency-Key` (8 sampai 128 karakter: huruf, angka, `-`, `_`) divalidasi dan tersedia di context. Penyimpanan dan deduplikasi dikerjakan setelah D1 tersedia.

## CORS

Hanya origin di `CORS_ALLOWED_ORIGINS` yang mendapat header CORS (origin admin dan origin Capacitor Android `https://localhost`).

## OpenAPI

`pnpm openapi:generate` menulis `openapi.json`. Wajib dijalankan dan di-commit setiap API berubah (NFR-10).

## Konfigurasi AI agent

Panduan agent ada di `AGENTS.md` (dan `CLAUDE.md` yang mengacu ke file yang sama). Berisi stack, perintah, struktur, konvensi, dan aturan kerja agent.