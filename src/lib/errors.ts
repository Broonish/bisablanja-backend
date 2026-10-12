import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorDetail = { field: string; message: string }

export class AppError extends Error {
  readonly code: string
  readonly status: ContentfulStatusCode
  readonly details?: ErrorDetail[]

  constructor(
    code: string,
    message: string,
    status: ContentfulStatusCode = 400,
    details?: ErrorDetail[],
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function errorBody(
  code: string,
  message: string,
  details?: ErrorDetail[],
) {
  return {
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  }
}

type IssueLike = { path: ReadonlyArray<PropertyKey>; message: string }

// Contoh hasil: "items[0].qty"
function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === 'number') return `${acc}[${segment}]`
    const name = String(segment)
    return acc === '' ? name : `${acc}.${name}`
  }, '')
}

export function toErrorDetails(
  issues: ReadonlyArray<IssueLike>,
): ErrorDetail[] {
  return issues.map((issue) => ({
    field: formatPath(issue.path),
    message: issue.message,
  }))
}
