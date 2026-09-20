export function sessionCookie(value: string, maxAgeSeconds: number): string { return `sid=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Lax` }
export function expiredSessionCookie(): string { return 'sid=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax' }
