export async function logout(): Promise<void> {
  const headers = new Headers()
  headers.set('Origin', window.location.origin)
  const response = await fetch('/api/logout', {
    method: 'POST',
    headers,
  })
  if (!response.ok) throw new Error('logout failed')
}
