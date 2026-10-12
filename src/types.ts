export type Bindings = {
  ENVIRONMENT: 'local' | 'staging' | 'production'
  CORS_ALLOWED_ORIGINS: string
}

export type Variables = {
  idempotencyKey?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
