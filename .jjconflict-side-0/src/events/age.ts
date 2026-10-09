export function ageFromBirthdate(birthdate: string | null, referenceDate: string): number | null {
  if (!birthdate) return null
  const birth = new Date(`${birthdate}T00:00:00Z`)
  const reference = new Date(`${referenceDate}T00:00:00Z`)
  if (Number.isNaN(birth.valueOf()) || Number.isNaN(reference.valueOf())) return null
  let age = reference.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    reference.getUTCMonth() < birth.getUTCMonth() ||
    (reference.getUTCMonth() === birth.getUTCMonth() && reference.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? age : null
}
