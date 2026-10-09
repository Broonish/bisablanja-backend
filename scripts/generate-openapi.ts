import { writeFile } from 'node:fs/promises'
import { createApp } from '../src/app'

const app = createApp()

const res = await app.request(
  '/v1/openapi.json',
  {},
  { ENVIRONMENT: 'local', CORS_ALLOWED_ORIGINS: '' },
)

if (!res.ok) {
  console.error(`Gagal membuat openapi.json (status ${res.status})`)
  process.exit(1)
}

const spec = await res.json()
await writeFile('openapi.json', JSON.stringify(spec, null, 2) + '\n')
console.log('openapi.json berhasil dibuat')