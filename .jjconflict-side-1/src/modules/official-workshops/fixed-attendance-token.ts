const prefix = 'fixed-workshop:'

export function fixedWorkshopAttendanceToken(personId: string, workshopId: string): string {
  return `${prefix}${personId}:${workshopId}`
}

export function fixedWorkshopIdFromToken(personId: string, value: string): string | null {
  const start = `${prefix}${personId}:`
  if (!value.startsWith(start)) return null
  const workshopId = value.slice(start.length)
  return workshopId && !workshopId.includes(':') ? workshopId : null
}

export function isFixedWorkshopAttendanceToken(value: string): boolean {
  return value.startsWith(prefix)
}
