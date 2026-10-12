/**
 * Sixteen random hex characters for a caller-generated entity id.
 *
 * `crypto.randomUUID()` exists only in secure contexts, so a preview served over plain HTTP
 * (for example on a Tailscale address) has none; `crypto.getRandomValues()` is available in
 * every context. The result matches every entity-id pattern (`<prefix>[a-zA-Z0-9_-]+`).
 */
export function randomIdPart(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
