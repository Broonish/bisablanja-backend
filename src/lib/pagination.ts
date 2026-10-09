import { z } from '@hono/zod-openapi'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function toPagination(query: PaginationQuery) {
  return { ...query, offset: (query.page - 1) * query.limit }
}

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  total_pages: z.number().int(),
})

export function buildPaginationMeta(total: number, { page, limit }: PaginationQuery) {
  return { page, limit, total, total_pages: Math.ceil(total / limit) }
}