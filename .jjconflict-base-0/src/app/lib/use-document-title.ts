import { useEffect } from 'react'

/**
 * Every organiser screen shares one static `<title>Familienfreizeit</title>`
 * today. Screens that want their own title (spec: "every page gets its own
 * title") set it here and restore the previous title on unmount, so
 * client-side navigation between screens doesn't leak one screen's title
 * into another.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
