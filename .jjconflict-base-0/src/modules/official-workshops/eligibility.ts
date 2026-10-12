export type WorkshopEligibilityFailure =
  | 'infant'
  | 'age-unknown'
  | 'age-too-young'
  | 'age-too-old'
  | 'audience-children'
  | 'audience-adults'

export function workshopEligibilityFailure(
  person: { age: number | null; role: unknown },
  workshop: { age_min: number; age_max: number; audience: string },
): WorkshopEligibilityFailure | null {
  if (person.role === 'infant') return 'infant'
  if (person.age === null) return 'age-unknown'
  if (person.age < workshop.age_min) return 'age-too-young'
  if (person.age > workshop.age_max) return 'age-too-old'
  if (workshop.audience === 'children' && person.role === 'adult') return 'audience-children'
  if (workshop.audience === 'adults' && person.role !== 'adult') return 'audience-adults'
  return null
}
