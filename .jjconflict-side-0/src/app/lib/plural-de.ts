const rules = new Intl.PluralRules('de')

export function pluralDe(count: number, one: string, other: string): string {
  return rules.select(count) === 'one' ? one : other
}

export function changeCountLabel(count: number): string {
  return `${count} ${pluralDe(count, 'Änderung', 'Änderungen')}`
}
