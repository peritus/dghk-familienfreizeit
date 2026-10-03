import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(
  repositoryRoot,
  'test/fixtures/workshop-assignment/prototype-dataset.kdl',
)
const defaultOutputDirectory = resolve(repositoryRoot, 'test/fixtures/families')

function usage() {
  return `Usage: node scripts/generate-family-fixture.mjs [options]

Options:
  --count COUNT              Number of families to extract (default: all source families)
  --output PATH              Family fixture path (default: test/fixtures/families/COUNT_families.kdl)
  --catalogue-output PATH    Also write the workshop-only catalogue fixture
  --help                     Show this help
`
}

function parseArgs(argv) {
  const options = { count: null, output: null, catalogueOutput: null, help: false }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
      continue
    }
    if (argument === '--count' || argument === '--output' || argument === '--catalogue-output') {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`)
      if (argument === '--count') options.count = parseCount(value)
      else if (argument === '--output') options.output = resolve(value)
      else options.catalogueOutput = resolve(value)
      continue
    }
    if (argument.startsWith('--count='))
      options.count = parseCount(argument.slice('--count='.length))
    else if (argument.startsWith('--output='))
      options.output = resolve(argument.slice('--output='.length))
    else if (argument.startsWith('--catalogue-output='))
      options.catalogueOutput = resolve(argument.slice('--catalogue-output='.length))
    else throw new Error(`unknown option ${argument}`)
  }
  return options
}

function parseCount(value) {
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('count must be a positive integer')
  return count
}

function familyId(index) {
  return `fam_f${index}`
}

function isFamilyEvent(line) {
  return line.startsWith('FamilyInvited ') || line.startsWith('PersonAdded ')
}

function isWorkshopPreference(line) {
  return line.startsWith('LabelSet ') && line.includes(' key="prefers-workshop" ')
}

function entityId(line) {
  return line.match(/ entity_id="([^"]+)"/)?.[1] ?? null
}

function personIdFromEvent(line) {
  return line.match(/ person_id="([^"]+)"/)?.[1] ?? null
}

function roomAndFoodPreferences(index, count) {
  const family = familyId(index)
  const preferences = []
  if (index % 4 === 0)
    preferences.push(
      `LabelSet entity_id="${family}" key="needs-private-sanitary" value="private-sanitary" strength=preferred note=#null`,
    )
  if (index % 6 === 0)
    preferences.push(
      `LabelSet entity_id="${family}" key="sole-occupancy" value="no-other-families" strength=preferred note=#null`,
    )
  if (index % 8 === 0)
    preferences.push(
      `LabelSet entity_id="${family}" key="needs-ground-floor" value="ground-floor" strength=preferred note=#null`,
    )
  const foodNotes = ['Vegetarisch', 'Vegan', 'Allergie: Nüsse', 'Keine besonderen Essenswünsche']
  preferences.push(
    `LabelSet entity_id="${family}" key="family-note" value="Essenswunsch: ${foodNotes[index % foodNotes.length]}" strength=#null note=#null`,
  )
  if (index % 10 === 0 && index + 1 < count)
    preferences.push(
      `LabelSet entity_id="${family}" key="apart-from" value="${familyId(index + 1)}" strength=preferred note=#null`,
    )
  return preferences
}

function extractFamilyFixture(lines, count) {
  const familyEvents = lines.filter(isFamilyEvent)
  const families = [...new Set(familyEvents.map((line) => line.match(/family_id="([^"]+)"/)?.[1]))]
  if (count > families.length)
    throw new Error(`prototype contains only ${families.length} families`)
  const selectedFamilies = new Set(families.slice(0, count))
  const selectedPeople = new Set(
    familyEvents
      .filter((line) => selectedFamilies.has(line.match(/family_id="([^"]+)"/)?.[1]))
      .map(personIdFromEvent)
      .filter(Boolean),
  )
  const preferences = lines.filter(
    (line) => isWorkshopPreference(line) && selectedPeople.has(entityId(line)),
  )
  const roomPreferences = [...selectedFamilies]
    .map((id) => Number(id.slice('fam_f'.length)))
    .flatMap((index) => roomAndFoodPreferences(index, count))
  return [
    `// Extracted from workshop-assignment/prototype-dataset.kdl for ${count} families.`,
    ...familyEvents.filter((line) => selectedFamilies.has(line.match(/family_id="([^"]+)"/)?.[1])),
    '',
    ...preferences,
    '',
    ...roomPreferences,
    '',
  ].join('\n')
}

function extractCatalogueFixture(lines) {
  return [
    '// Workshop spaces, schedule, leaders, workshops, and workshop metadata extracted from prototype-dataset.kdl.',
    ...lines.filter((line) => !isFamilyEvent(line) && !isWorkshopPreference(line)),
    '',
  ].join('\n')
}

const options = parseArgs(process.argv.slice(2))
if (options.help) {
  console.log(usage())
} else {
  const lines = (await readFile(sourcePath, 'utf8')).split(/\r?\n/)
  const sourceFamilyCount = lines.filter((line) => line.startsWith('FamilyInvited ')).length
  const count = options.count ?? sourceFamilyCount
  const output = options.output ?? resolve(defaultOutputDirectory, `${count}_families.kdl`)
  await writeFile(output, extractFamilyFixture(lines, count))
  if (options.catalogueOutput)
    await writeFile(options.catalogueOutput, extractCatalogueFixture(lines))
  console.log(`Wrote ${output}`)
  if (options.catalogueOutput) console.log(`Wrote ${options.catalogueOutput}`)
}
