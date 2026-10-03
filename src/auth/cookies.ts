export function sessionCookie(value: string, maxAgeSeconds: number, secure = true): string {
  return `sid=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax`
}

export function expiredSessionCookie(secure = true): string {
  return `sid=; Max-Age=0; Path=/; HttpOnly;${secure ? ' Secure;' : ''} SameSite=Lax`
}
