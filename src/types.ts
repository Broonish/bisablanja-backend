export type Bindings = {
  ENVIRONMENT: string
  CORS_ALLOWED_ORIGINS: string
}

export type Variables = {
  idempotencyKey?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}