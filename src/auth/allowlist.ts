import { canonicalEmail } from '../events/types.js'

export type OrganiserAllowlistEnvironment = {
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS?: string
}

export function organiserAllowlist(env: OrganiserAllowlistEnvironment): ReadonlySet<string> {
  return parseOrganiserEmails(env.DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS)
}

export function parseOrganiserEmails(value: string | undefined): ReadonlySet<string> {
  const emails = new Set<string>()
  for (const candidate of value?.split(',') ?? []) {
    const trimmed = candidate.trim()
    if (!trimmed) continue
    try {
      emails.add(canonicalEmail(trimmed))
    } catch {
      // Invalid configuration must never broaden organiser access.
    }
  }
  return emails
}
