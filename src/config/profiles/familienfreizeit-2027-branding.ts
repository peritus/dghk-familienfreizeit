const logoUrl = new URL(
  './familienfreizeit-2027-logo.svg',
  (import.meta as ImportMeta & { readonly url: string }).url,
).href

export const familienfreizeit2027Branding = {
  logo: logoUrl,
} as const
