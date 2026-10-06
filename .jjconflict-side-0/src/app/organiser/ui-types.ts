export type StatusTone = 'neutral' | 'success' | 'attention' | 'danger' | 'draft' | 'held'

export type StatusLabel = {
  label: string
  tone: StatusTone
}
