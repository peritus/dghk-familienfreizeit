interface Env {
  /** Local-only development adapter; production must leave this unset. */
  DGHK_DEBUG_ONLY_DANGEROUS_SHOW_MAGIC_LINKS_ON_CONSOLE?: 'true'
  /** Local-only development adapter; production must leave this unset. */
  DGHK_DEBUG_ONLY_DANGEROUS_ALLOW_INSECURE_SESSION_COOKIES?: 'true'
  /** Optional comma-separated organiser allowlist; unset means no organisers. */
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_ORGANISER_EMAILS?: string
  /** Local/demo-only adapter; production must leave this unset. */
  DGHK_DEBUG_ONLY_DANGEROUS_DEMO_LOGIN?: 'true'
  /** Exact local-preview hostname allowed to use the dangerous adapters. */
  DGHK_DEBUG_ONLY_LOCAL_PREVIEW_HOST?: string
  /** Operational switch for one declared feature (spec/architecture/features.md §6). */
  DGHK_FEATURE_FAMILY_PREFERENCES_FAMILY_ROOM_WISHES?: 'on' | 'off'
  /** Operational switch for one declared feature (spec/architecture/features.md §6). */
  DGHK_FEATURE_FAMILY_PREFERENCES_ORGANISER_ROOM_WISHES?: 'on' | 'off'
  /** Operational switch for one declared feature (spec/architecture/features.md §6). */
  DGHK_FEATURE_WORKSHOP_RANKINGS_FAMILY_WORKSHOP_WISHES?: 'on' | 'off'
  /** Operational switch for one declared feature (spec/architecture/features.md §6). */
  DGHK_FEATURE_WORKSHOP_RANKINGS_ORGANISER_WORKSHOP_WISHES?: 'on' | 'off'
}
