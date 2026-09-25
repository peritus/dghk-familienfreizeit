import { canonicalEmail } from '../events/types.js'

const configuredOrganisers = ['organiser@example.test']
export const organiserAllowlist = new Set(configuredOrganisers.map(canonicalEmail))
