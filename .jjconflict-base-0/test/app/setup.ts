import { configure } from '@testing-library/react'

/**
 * The organiser chunk is lazy-loaded (React.lazy) and its dynamic import can
 * take longer than the 1000ms default under full-suite CPU contention,
 * flaking `findBy*` queries that wait on it. The assertions themselves are
 * correct -- only the wait budget was too tight.
 */
configure({ asyncUtilTimeout: 5000 })
