/**
 * The typed catalog of visual decisions used by the application.
 *
 * Literal runtime values remain in globals.css because Tailwind consumes the
 * CSS custom properties directly. This file names those variables, records
 * their intent, and gives the Storybook foundation catalog a type-safe source
 * without creating a second set of values that could drift.
 */
export const designTokens = {
  color: [
    { name: 'background', cssVariable: '--background', use: 'page background' },
    { name: 'secondaryBackground', cssVariable: '--secondary-background', use: 'cards, headers, and popovers' },
    { name: 'paper', cssVariable: '--paper', use: 'paper and provisional surfaces' },
    { name: 'input', cssVariable: '--input', use: 'field backgrounds' },
    { name: 'main', cssVariable: '--main', use: 'primary action and attention' },
    { name: 'mainDeep', cssVariable: '--main-deep', use: 'small accent controls and rules' },
    { name: 'mainForeground', cssVariable: '--main-foreground', use: 'text on primary actions' },
    { name: 'danger', cssVariable: '--danger', use: 'destructive action or failure' },
    { name: 'dangerForeground', cssVariable: '--danger-foreground', use: 'text on destructive actions' },
    { name: 'offline', cssVariable: '--offline', use: 'offline status' },
    { name: 'muted', cssVariable: '--muted', use: 'supporting text' },
    { name: 'foreground', cssVariable: '--foreground', use: 'body text' },
    { name: 'border', cssVariable: '--border', use: 'strong component outlines' },
    { name: 'ring', cssVariable: '--ring', use: 'keyboard focus' },
    { name: 'shadowColor', cssVariable: '--shadow-c', use: 'pressable offset shadow color' },
  ],
  geometry: [
    { name: 'baseRadius', cssVariable: '--radius-base', use: 'shared corner radius' },
    { name: 'shadow', cssVariable: '--shadow', use: 'pressable offset shadow' },
  ],
  typography: [
    { name: 'bodyWeight', cssVariable: '--font-weight-base', use: 'normal body copy' },
    { name: 'headingWeight', cssVariable: '--font-weight-heading', use: 'headings and labels' },
  ],
} as const

export type DesignTokenGroup = keyof typeof designTokens

export const tokenCssVariable = (
  variable: (typeof designTokens)[DesignTokenGroup][number]['cssVariable'],
) => `var(${variable})`
