import { createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import { buildPaginationMeta, paginationQuerySchema, toPagination } from '../src/lib/pagination'

const env = {
  ENVIRONMENT: 'test',
  CORS_ALLOWED_ORIGINS: 'https://localhost,https://admin.example.com',
}
const app = createApp()

type ErrorBody = { error: { code: string; message: string; details: unknown } }

describe('GET /v1/health', () => {
  it('mengembalikan 200', async () => {
    const res = await app.request('/v1/health', {}, env)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'ok', environment: 'test' })
  })
})

describe('error envelope', () => {
  it('404 untuk rute yang tidak ada', async () => {
    const res = await app.request('/v1/tidak-ada', {}, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('422 saat validasi Zod gagal', async () => {
    const testApp = createApp()
    testApp.openapi(
      createRoute({
        method: 'get',
        path: '/v1/_validasi',
        request: { query: z.object({ jumlah: z.coerce.number().int().min(1) }) },
        responses: {
          200: {
            description: 'ok',
            content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
          },
        },
      }),
      (c) => c.json({ ok: true }, 200),
    )
    const res = await testApp.request('/v1/_validasi?jumlah=abc', {}, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(422)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('CORS', () => {
  it('mengizinkan origin di allowlist', async () => {
    const res = await app.request(
      '/v1/health',
      { headers: { Origin: 'https://localhost' } },
      env,
    )
    expect(res.headers.get('access-control-allow-origin')).toBe('https://localhost')
  })

  it('tidak memberi header CORS untuk origin di luar allowlist', async () => {
    const res = await app.request(
      '/v1/health',
      { headers: { Origin: 'https://evil.example' } },
      env,
    )
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('OpenAPI', () => {
  it('memuat /v1/health', async () => {
    const res = await app.request('/v1/openapi.json', {}, env)
    const spec = (await res.json()) as { paths: Record<string, unknown> }
    expect(spec.paths['/v1/health']).toBeDefined()
  })
})

describe('pagination', () => {
  const buildApp = () => {
    const testApp = createApp()
    testApp.openapi(
      createRoute({
        method: 'get',
        path: '/v1/_daftar',
        request: { query: paginationQuerySchema },
        responses: {
          200: {
            description: 'ok',
            content: {
              'application/json': {
                schema: z.object({ page: z.number(), limit: z.number(), offset: z.number() }),
              },
            },
          },
        },
      }),
      (c) => {
        const p = toPagination(c.req.valid('query'))
        return c.json({ page: p.page, limit: p.limit, offset: p.offset }, 200)
      },
    )
    return testApp
  }

  it('memakai default page=1 dan limit=20', async () => {
    const res = await buildApp().request('/v1/_daftar', {}, env)
    expect(await res.json()).toEqual({ page: 1, limit: 20, offset: 0 })
  })

  it('menghitung offset', async () => {
    const res = await buildApp().request('/v1/_daftar?page=3&limit=10', {}, env)
    expect(await res.json()).toEqual({ page: 3, limit: 10, offset: 20 })
  })

  it('422 bila limit melebihi 100', async () => {
    const res = await buildApp().request('/v1/_daftar?limit=1000', {}, env)
    expect(res.status).toBe(422)
  })

  it('menghitung total_pages', () => {
    expect(buildPaginationMeta(45, { page: 1, limit: 20 }).total_pages).toBe(3)
  })
})

describe('Idempotency-Key', () => {
  it('menerima key yang valid', async () => {
    const res = await app.request('/v1/health', { headers: { 'Idempotency-Key': 'abc12345-xyz' } }, env)
    expect(res.status).toBe(201)
  })

  it('400 untuk key yang tidak valid', async () => {
    const res = await app.request('/v1/health', { headers: { 'Idempotency-Key': 'pendek' } }, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('INVALID_IDEMPOTENCY_KEY')
  })
})