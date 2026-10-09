import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { AppError, errorBody } from './lib/errors'
import { healthRoutes } from './modules/health/health.route'
import type { AppEnv } from './types'
import { idempotency } from './middleware/idempotency'

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    // dipanggil otomatis saat validasi Zod gagal
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody('VALIDATION_ERROR', 'Data yang dikirim tidak valid.', result.error.issues),
          422,
        )
      }
    },
  })

  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        const allowed = (c.env?.CORS_ALLOWED_ORIGINS ?? '')
          .split(',')
          .map((o: string) => o.trim())
          .filter(Boolean)
        return allowed.includes(origin) ? origin : null
      },
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )
  
  app.use('*', idempotency)

  app.route('/v1', healthRoutes)

  app.doc('/v1/openapi.json', {
    openapi: '3.0.0',
    info: { title: 'Bisablanja API', version: '0.1.0' },
  })

  app.notFound((c) =>
    c.json(errorBody('NOT_FOUND', 'Rute tidak ditemukan.'), 404),
  )

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message, err.details), err.status)
    }
    if (err instanceof HTTPException) {
      return c.json(errorBody('HTTP_ERROR', 'Permintaan tidak dapat diproses.'), err.status)
    }
    console.error(err)
    return c.json(errorBody('INTERNAL_ERROR', 'Terjadi kesalahan pada server.'), 500)
  })

  return app
}