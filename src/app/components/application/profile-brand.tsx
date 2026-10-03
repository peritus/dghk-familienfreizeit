import type { ProfileBranding } from '../../../config/presentation.js'

export function ProfileBrand({
  branding,
  className,
}: {
  branding?: ProfileBranding
  className?: string
}) {
  if (!branding) return null
  return (
    <img
      src={branding.logo}
      alt=""
      aria-hidden="true"
      className={className ? `${className} dark:invert` : 'dark:invert'}
    />
  )
}
