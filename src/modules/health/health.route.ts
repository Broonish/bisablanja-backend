import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AppEnv } from '../../types'

const route = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  responses: {
    200: {
      description: 'Layanan berjalan',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            environment: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
  },
})

export const healthRoutes = new OpenAPIHono<AppEnv>().openapi(route, (c) =>
  c.json(
    {
      status: 'ok' as const,
      environment: c.env.ENVIRONMENT,
      timestamp: new Date().toISOString(),
    },
    200,
  ),
)