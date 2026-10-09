import { createMiddleware } from 'hono/factory'
import { AppError } from '../lib/errors'
import type { AppEnv } from '../types'

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export const idempotency = createMiddleware<AppEnv>(async (c, next) => {
  const key = c.req.header('Idempotency-Key')
  if (key !== undefined) {
    if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
      throw new AppError(
        'INVALID_IDEMPOTENCY_KEY',
        'Idempotency-Key tidak valid. Gunakan 8 sampai 128 karakter: huruf, angka, strip, atau garis bawah.',
        400,
      )
    }
    c.set('idempotencyKey', key)
  }
  await next()
})