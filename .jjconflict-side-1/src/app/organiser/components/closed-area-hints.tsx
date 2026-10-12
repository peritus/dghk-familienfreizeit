import { AttentionNotices } from '../attention.js'
/** The dashboard uses the same canonical selector as every other attention surface. */
export function ClosedAreaHints() {
  return <AttentionNotices scope="dashboard" actionable />
}
