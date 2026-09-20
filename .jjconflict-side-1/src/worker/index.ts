import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', async (context) => {
  try {
    const row = await context.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    if (row?.ok === 1) return context.json({ status: 'ok' })
  } catch {
    // Report availability without disclosing binding details or database errors.
  }
  return context.json({ status: 'unavailable' }, 503)
})

app.notFound((context) => context.json({ error: 'not_found' }, 404))

export default app
