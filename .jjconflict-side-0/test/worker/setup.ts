import { env } from 'cloudflare:workers'
import { beforeAll, beforeEach } from 'vitest'

beforeAll(async () => {
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS event (seq INTEGER PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL, type TEXT NOT NULL, subject TEXT, payload TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS event_type_idx ON event(type, seq);
    CREATE TABLE IF NOT EXISTS magic_link (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, created_ip TEXT);
    CREATE TABLE IF NOT EXISTS session (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT);
    CREATE TABLE IF NOT EXISTS rate_limit (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS email_log (id INTEGER PRIMARY KEY AUTOINCREMENT, to_email TEXT NOT NULL, kind TEXT NOT NULL, communication_seq INTEGER, family_id TEXT, delivery_key TEXT UNIQUE, status TEXT NOT NULL, sent_at TEXT, provider_id TEXT, error TEXT);
  `)
})

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM event'),
    env.DB.prepare('DELETE FROM magic_link'),
    env.DB.prepare('DELETE FROM session'),
    env.DB.prepare('DELETE FROM rate_limit'),
    env.DB.prepare('DELETE FROM email_log'),
  ])
})
