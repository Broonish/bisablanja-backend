import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { AppError, errorBody, toErrorDetails } from './lib/errors'
import { API_VERSION } from './lib/version'
import { idempotency } from './middleware/idempotency'
import { healthRoutes } from './modules/health/health.route'
import type { AppEnv } from './types'

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    // dipanggil otomatis saat validasi Zod gagal
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody(
            'validation_error',
            'Data yang dikirim tidak valid.',
            toErrorDetails(result.error.issues),
          ),
          400,
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
      allowHeaders: [
        'Authorization',
        'Content-Type',
        'Idempotency-Key',
        'If-Match',
      ],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )
  app.use('*', idempotency)

  app.route('/v1', healthRoutes)

  app.doc31('/v1/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Bisablanja API', version: API_VERSION },
  })

  app.notFound((c) =>
    c.json(errorBody('not_found', 'Rute tidak ditemukan.'), 404),
  )

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json(errorBody(err.code, err.message, err.details), err.status)
    }
    if (err instanceof HTTPException) {
      return c.json(
        errorBody('http_error', 'Permintaan tidak dapat diproses.'),
        err.status,
      )
    }
    console.error(err)
    return c.json(
      errorBody('internal_error', 'Terjadi kesalahan pada server.'),
      500,
    )
  })

  return app
}
