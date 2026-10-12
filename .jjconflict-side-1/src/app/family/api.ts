import type { FamilyRepresentation, FamilyChange } from '../../family-detail/model.js'
export type { FamilyRepresentation } from '../../family-detail/model.js'

export class FamilyApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok)
    throw new FamilyApiError(
      response.status,
      String(body.error ?? 'request_failed'),
      typeof body.message === 'string'
        ? body.message
        : 'Die Angaben konnten nicht geladen oder gespeichert werden.',
    )
  return body as T
}
export function loadFamily(signal?: AbortSignal) {
  return request<FamilyRepresentation>('/api/family', { signal })
}

export async function changeFamily(
  change: FamilyChange,
  current: FamilyRepresentation,
): Promise<void> {
  let path = '/api/family',
    method = 'PUT',
    body: unknown = {}
  if (change.type === 'family') {
    method = 'PATCH'
    body = { display_name: change.display_name }
  } else if (change.type === 'person-create') {
    path += '/people'
    method = 'POST'
    body = change.person
  } else if (change.type === 'person-update') {
    path += `/people/${encodeURIComponent(change.person_id)}`
    method = 'PATCH'
    body = change.person
  } else if (change.type === 'person-remove') {
    throw new Error('Personen können hier derzeit nicht entfernt werden.')
  } else if (change.type === 'preference') {
    path +=
      change.target_id === current.data.family.id
        ? `/preferences/${encodeURIComponent(change.key)}`
        : `/people/${encodeURIComponent(change.target_id)}/preferences/${encodeURIComponent(change.key)}`
    method = !change.answer.answered ? 'DELETE' : 'PUT'
    body = change.answer
  } else if (change.type === 'ranking') {
    path += `/people/${encodeURIComponent(change.person_id)}/workshop-ranking`
    body = { workshop_ids: change.workshop_ids }
  } else {
    path += `/people/${encodeURIComponent(change.person_id)}/${change.type === 'signup' ? 'workshop-signups' : 'workshop-interests'}/${encodeURIComponent(change.workshop_id)}`
    method = change.selected ? 'PUT' : 'DELETE'
  }
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (method !== 'POST') {
    const etag = current.resource_etags[path]
    if (!etag) throw new Error('Bitte lade die aktuellen Angaben vor der Änderung.')
    headers['If-Match'] = etag
  }
  const response = await fetch(path, {
    method,
    headers,
    ...(method === 'DELETE' ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
    throw new FamilyApiError(
      response.status,
      error.error ?? 'request_failed',
      error.message ?? 'Die Änderung konnte nicht gespeichert werden.',
    )
  }
}
