import { OrganiserLink } from '../../components/application/organiser-link.js'
import { organiserPaths } from '../../../organiser/routes.js'
import { TertiaryNavigation } from '../../components/shared/ui/tertiary-navigation.js'
import { familyTopics, type FamilyTopic } from '../../../organiser/routes.js'

const topicLabels: Record<FamilyTopic, string> = {
  zimmer: 'Zimmer',
  personen: 'Personen',
  essen: 'Essen',
  workshops: 'Workshops',
}

export function FamilyTopicNavigation({
  value,
  onChange,
  family_id: familyId,
}: {
  family_id?: string
  value: FamilyTopic
  onChange: (value: FamilyTopic) => void
}) {
  return (
    <TertiaryNavigation
      aria_label="Familienbereiche"
      value={value}
      items={familyTopics.map((topic) => ({ value: topic, label: topicLabels[topic], link: familyId ? <OrganiserLink href={organiserPaths.family_topic(familyId, topic)} /> : undefined }))}
      onChange={(next) => {
        if (familyTopics.includes(next as FamilyTopic)) onChange(next as FamilyTopic)
      }}
    />
  )
}

export function familyTopicLabel(topic: FamilyTopic): string {
  return topicLabels[topic]
}
