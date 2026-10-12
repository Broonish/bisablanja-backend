import { createRoute, z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'
import {
  buildPaginationMeta,
  paginationQuerySchema,
  toPagination,
} from '../src/lib/pagination'

const env = {
  ENVIRONMENT: 'local',
  CORS_ALLOWED_ORIGINS: 'https://localhost,https://admin.example.com',
}
const app = createApp()

type ErrorBody = {
  error: {
    code: string
    message: string
    details?: { field: string; message: string }[]
  }
}

const okResponse = {
  200: {
    description: 'ok',
    content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
  },
}

describe('GET /v1/health', () => {
  it('mengembalikan 200 sesuai kontrak', async () => {
    const res = await app.request('/v1/health', {}, env)
    const body = (await res.json()) as Record<string, unknown>
    expect(res.status).toBe(200)
    expect(body).toMatchObject({ status: 'ok', environment: 'local' })
    expect(typeof body.version).toBe('string')
    expect(Number.isNaN(Date.parse(String(body.server_time)))).toBe(false)
  })
})

describe('error envelope', () => {
  it('404 not_found untuk rute yang tidak ada, tanpa details', async () => {
    const res = await app.request('/v1/tidak-ada', {}, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
    expect(body.error).not.toHaveProperty('details')
  })

  it('400 validation_error dengan details {field, message}', async () => {
    const testApp = createApp()
    testApp.openapi(
      createRoute({
        method: 'get',
        path: '/v1/_validasi',
        request: {
          query: z.object({ jumlah: z.coerce.number().int().min(1) }),
        },
        responses: okResponse,
      }),
      (c) => c.json({ ok: true }, 200),
    )
    const res = await testApp.request('/v1/_validasi?jumlah=abc', {}, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('validation_error')
    expect(body.error.details).toEqual([
      { field: 'jumlah', message: expect.any(String) },
    ])
  })
})

describe('CORS', () => {
  it('mengizinkan origin di allowlist', async () => {
    const res = await app.request(
      '/v1/health',
      { headers: { Origin: 'https://localhost' } },
      env,
    )
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://localhost',
    )
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
  it('berformat 3.1.0 dan memuat /v1/health', async () => {
    const res = await app.request('/v1/openapi.json', {}, env)
    const spec = (await res.json()) as {
      openapi: string
      paths: Record<string, unknown>
    }
    expect(spec.openapi).toBe('3.1.0')
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
                schema: z.object({
                  page: z.number(),
                  limit: z.number(),
                  offset: z.number(),
                }),
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

  it('memakai default page=1 dan per_page=20', async () => {
    const res = await buildApp().request('/v1/_daftar', {}, env)
    expect(await res.json()).toEqual({ page: 1, limit: 20, offset: 0 })
  })

  it('menghitung offset dari page dan per_page', async () => {
    const res = await buildApp().request(
      '/v1/_daftar?page=3&per_page=10',
      {},
      env,
    )
    expect(await res.json()).toEqual({ page: 3, limit: 10, offset: 20 })
  })

  it('400 bila per_page melebihi 100', async () => {
    const res = await buildApp().request('/v1/_daftar?per_page=1000', {}, env)
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(400)
    expect(body.error.details?.[0]?.field).toBe('per_page')
  })

  it('menghitung meta sesuai kontrak', () => {
    expect(buildPaginationMeta(45, { page: 1, per_page: 20 })).toEqual({
      page: 1,
      per_page: 20,
      total: 45,
      total_pages: 3,
    })
  })
})

describe('Idempotency-Key', () => {
  it('menerima key yang valid', async () => {
    const res = await app.request(
      '/v1/health',
      { headers: { 'Idempotency-Key': 'abc12345-xyz' } },
      env,
    )
    expect(res.status).toBe(200)
  })

  it('400 invalid_idempotency_key untuk key yang tidak valid', async () => {
    const res = await app.request(
      '/v1/health',
      { headers: { 'Idempotency-Key': 'pendek' } },
      env,
    )
    const body = (await res.json()) as ErrorBody
    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_idempotency_key')
  })
})
