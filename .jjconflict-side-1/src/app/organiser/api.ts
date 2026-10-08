import type {
  OrganiserApplyRequest,
  OrganiserApplyResponse,
  OrganiserLogResponse,
  OrganiserStaleResponse,
} from '../../organiser/protocol.js'

export class OrganiserApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: Record<string, unknown>,
  ) {
    super(typeof body.error === 'string' ? body.error : 'organiser request failed')
  }
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) throw new OrganiserApiError(response.status, body)
  return body as T
}

export function loadOrganiserLog(): Promise<OrganiserLogResponse> {
  return request('/api/organiser/log')
}

export function applyOrganiserEvents(
  requestBody: OrganiserApplyRequest,
): Promise<OrganiserApplyResponse> {
  return request('/api/organiser/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  })
}

export function staleResponse(error: OrganiserApiError): OrganiserStaleResponse | null {
  if (error.status !== 409 || error.body.error !== 'stale_head') return null
  return error.body as unknown as OrganiserStaleResponse
}
