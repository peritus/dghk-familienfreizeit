import { derivePublicAttention } from '../../../attention/public.js'
import { ScreenLayout, ScreenHeader } from '../shared/ui/screen-layout.js'
import { LoadingState, ErrorState } from '../shared/ui/screen-state.js'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'wouter'
import { buttonVariants } from '../shared/ui/button'

export function RouteLoading() {
  return (
    <ScreenLayout header={<ScreenHeader title="Ansicht laden" />}>
      <LoadingState />
    </ScreenLayout>
  )
}

export function NotFound() {
  return (
    <ScreenLayout
      header={
        <ScreenHeader
          title="Diese Seite gibt es nicht"
          description="Über die Startseite findest Du zurück."
        />
      }
    >
      <Link data-slot="button" href="~/" className={buttonVariants({ variant: 'neutral' })}>
        Zur Startseite
      </Link>
    </ScreenLayout>
  )
}

export class RouteBoundary extends Component<
  { children: ReactNode; reset_key?: string; render_fallback?: (content: ReactNode) => ReactNode },
  { failed: boolean; reset_key: string | undefined }
> {
  state = { failed: false, reset_key: undefined }

  static getDerivedStateFromProps(
    props: {
      children: ReactNode
      reset_key?: string
      render_fallback?: (content: ReactNode) => ReactNode
    },
    state: { failed: boolean; reset_key: string | undefined },
  ) {
    if (props.reset_key !== state.reset_key) return { failed: false, reset_key: props.reset_key }
    return null
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // No user data or error details are rendered by this public boundary.
  }

  render() {
    if (!this.state.failed) return this.props.children
    const content = (
      <ScreenLayout header={<ScreenHeader title="Ansicht nicht verfügbar" />}>
        <ErrorState onRetry={() => window.location.reload()} retry_label="Neu laden">
          {derivePublicAttention('route-failed').wording.detail}
        </ErrorState>
      </ScreenLayout>
    )
    return this.props.render_fallback ? this.props.render_fallback(content) : content
  }
}
