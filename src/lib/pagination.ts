import { z } from '@hono/zod-openapi'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function toPagination({ page, per_page }: PaginationQuery) {
  return {
    page,
    perPage: per_page,
    limit: per_page,
    offset: (page - 1) * per_page,
  }
}

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  per_page: z.number().int().min(1),
  total: z.number().int().min(0),
  total_pages: z.number().int().min(0),
})

export function buildPaginationMeta(
  total: number,
  { page, per_page }: PaginationQuery,
) {
  return { page, per_page, total, total_pages: Math.ceil(total / per_page) }
}

// Dipakai route list: paginatedSchema(productSchema)
export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: paginationMetaSchema })
}
