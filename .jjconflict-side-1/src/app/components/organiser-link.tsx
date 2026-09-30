import { Link, type LinkProps } from 'wouter'
import type { OrganiserPath } from '../../organiser/routes.js'

declare const organiserHomePathBrand: unique symbol
export type OrganiserHomePath = '~/' & { readonly [organiserHomePathBrand]: true }

export const organiserHomePath = '~/' as OrganiserHomePath

type OrganiserLinkProps = Omit<LinkProps, 'href' | 'to' | 'asChild'> & {
  href: OrganiserPath | OrganiserHomePath
}

/** The only link adapter allowed inside the nested organiser router. */
export function OrganiserLink({ href, ...props }: OrganiserLinkProps) {
  if (href !== organiserHomePath && (href.startsWith('/organiser') || !href.startsWith('/'))) {
    throw new Error(`organiser links must use nested paths: ${href}`)
  }
  return <Link {...({ ...props, href } as LinkProps)} />
}
