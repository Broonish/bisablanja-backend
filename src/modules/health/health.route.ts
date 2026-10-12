import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { API_VERSION } from '../../lib/version'
import type { AppEnv } from '../../types'

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string().optional(),
  environment: z.enum(['local', 'staging', 'production']).optional(),
  server_time: z.string().datetime().optional(),
})

const route = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Health check',
  operationId: 'healthCheck',
  responses: {
    200: {
      description: 'Service sehat.',
      content: { 'application/json': { schema: healthResponseSchema } },
    },
    503: { description: 'Service tidak sehat.' },
  },
})

export const healthRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) =>
  c.json(
    {
      status: 'ok' as const,
      version: API_VERSION,
      environment: c.env.ENVIRONMENT,
      server_time: new Date().toISOString(),
    },
    200,
  ),
)
