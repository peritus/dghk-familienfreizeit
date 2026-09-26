export type UiCoverageEntry = {
  id: string
  area: 'foundation' | 'component' | 'application' | 'screen'
  subject: string
  source: string
}

/**
 * The repository's review index: every current public renderable has a
 * Storybook entry and a Playwright visual check. Add to this list when adding
 * a component or screen so the contract fails closed in CI.
 */
export const uiCoverage: readonly UiCoverageEntry[] = [
  {
    id: 'foundations-design-tokens--catalog',
    area: 'foundation',
    subject: 'Design tokens',
    source: 'src/app/design/tokens.ts',
  },
  {
    id: 'foundations-style-guide--docs',
    area: 'foundation',
    subject: 'Style guide',
    source: 'src/app/design/style-guide.mdx',
  },
  {
    id: 'ui-button--default',
    area: 'component',
    subject: 'Button',
    source: 'src/app/components/ui/button.tsx',
  },
  {
    id: 'ui-button--variants',
    area: 'component',
    subject: 'Button variants',
    source: 'src/app/components/ui/button.tsx',
  },
  {
    id: 'ui-button--sizes',
    area: 'component',
    subject: 'Button sizes',
    source: 'src/app/components/ui/button.tsx',
  },
  {
    id: 'ui-button--disabled-and-busy',
    area: 'component',
    subject: 'Button disabled/busy',
    source: 'src/app/components/ui/button.tsx',
  },
  {
    id: 'ui-card--complete',
    area: 'component',
    subject: 'Card compound component',
    source: 'src/app/components/ui/card.tsx',
  },
  {
    id: 'ui-card--compact',
    area: 'component',
    subject: 'Card compact composition',
    source: 'src/app/components/ui/card.tsx',
  },
  {
    id: 'ui-alert--informational',
    area: 'component',
    subject: 'Alert',
    source: 'src/app/components/ui/alert.tsx',
  },
  {
    id: 'ui-alert--destructive',
    area: 'component',
    subject: 'Alert destructive',
    source: 'src/app/components/ui/alert.tsx',
  },
  {
    id: 'ui-alertdialog--destructive-confirmation',
    area: 'component',
    subject: 'AlertDialog compound component',
    source: 'src/app/components/ui/alert-dialog.tsx',
  },
  {
    id: 'ui-segmentedcontrol--interactive',
    area: 'component',
    subject: 'SegmentedControl',
    source: 'src/app/components/ui/segmented-control.tsx',
  },
  {
    id: 'ui-segmentedcontrol--narrow',
    area: 'component',
    subject: 'SegmentedControl narrow',
    source: 'src/app/components/ui/segmented-control.tsx',
  },
  {
    id: 'ui-skeleton--page',
    area: 'component',
    subject: 'Skeleton',
    source: 'src/app/components/ui/skeleton.tsx',
  },
  {
    id: 'ui-bed-icons--all-types',
    area: 'component',
    subject: 'Bed icons',
    source: 'src/app/components/bed-icons.tsx',
  },
  {
    id: 'ui-bed-icons--selected-by-value',
    area: 'component',
    subject: 'BedIcon',
    source: 'src/app/components/bed-icons.tsx',
  },
  {
    id: 'ui-drafting-compass-icon--welcome-illustration',
    area: 'component',
    subject: 'DraftingCompassIcon',
    source: 'src/app/components/drafting-compass-icon.tsx',
  },
  {
    id: 'application-public-shell--content',
    area: 'application',
    subject: 'Public Shell',
    source: 'src/app/components/shell.tsx',
  },
  {
    id: 'application-route-states--loading',
    area: 'application',
    subject: 'RouteLoading',
    source: 'src/app/components/route-states.tsx',
  },
  {
    id: 'application-route-states--not-found-state',
    area: 'application',
    subject: 'NotFound',
    source: 'src/app/components/route-states.tsx',
  },
  {
    id: 'application-route-states--healthy-boundary',
    area: 'application',
    subject: 'RouteBoundary',
    source: 'src/app/components/route-states.tsx',
  },
  {
    id: 'application-organiser-frame--navigation',
    area: 'application',
    subject: 'OrganiserFrame',
    source: 'src/app/organiser/organiser-frame.tsx',
  },
  {
    id: 'application-organiser-frame--minimal-recovery-frame',
    area: 'application',
    subject: 'OrganiserMinimalFrame',
    source: 'src/app/organiser/organiser-frame.tsx',
  },
  {
    id: 'application-organiser-app--loaded-dashboard',
    area: 'application',
    subject: 'OrganiserApp loaded dashboard',
    source: 'src/app/organiser/organiser-app.tsx',
  },
  {
    id: 'application-save-status--saved',
    area: 'application',
    subject: 'SaveStatus saved',
    source: 'src/app/organiser/save-status.tsx',
  },
  {
    id: 'application-save-status--drafting-empty',
    area: 'application',
    subject: 'SaveStatus draft empty',
    source: 'src/app/organiser/save-status.tsx',
  },
  {
    id: 'application-save-status--drafting-pending',
    area: 'application',
    subject: 'SaveStatus draft pending',
    source: 'src/app/organiser/save-status.tsx',
  },
  {
    id: 'application-save-status--failed',
    area: 'application',
    subject: 'SaveStatus failed',
    source: 'src/app/organiser/save-status.tsx',
  },
  {
    id: 'screens-public-login--default',
    area: 'screen',
    subject: 'Login',
    source: 'src/app/auth/login.tsx',
  },
  {
    id: 'screens-family-view-welcome--default',
    area: 'screen',
    subject: 'Welcome',
    source: 'src/app/family-view/welcome.tsx',
  },
  {
    id: 'screens-organiser-dashboard--healthy',
    area: 'screen',
    subject: 'Dashboard',
    source: 'src/app/organiser/screens/dashboard.tsx',
  },
  {
    id: 'screens-organiser-families--with-families',
    area: 'screen',
    subject: 'Families',
    source: 'src/app/organiser/screens/families.tsx',
  },
  {
    id: 'screens-organiser-family-detail--with-people',
    area: 'screen',
    subject: 'FamilyDetail',
    source: 'src/app/organiser/screens/family-detail.tsx',
  },
  {
    id: 'screens-organiser-family-detail--missing-family',
    area: 'screen',
    subject: 'FamilyDetail missing',
    source: 'src/app/organiser/screens/family-detail.tsx',
  },
  {
    id: 'screens-organiser-inventory--populated',
    area: 'screen',
    subject: 'Inventory',
    source: 'src/app/organiser/screens/inventory.tsx',
  },
]
