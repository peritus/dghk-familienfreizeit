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
}: {
  value: FamilyTopic
  onChange: (value: FamilyTopic) => void
}) {
  return (
    <TertiaryNavigation
      aria_label="Familienbereiche"
      value={value}
      items={familyTopics.map((topic) => ({ value: topic, label: topicLabels[topic] }))}
      onChange={(next) => {
        if (familyTopics.includes(next as FamilyTopic)) onChange(next as FamilyTopic)
      }}
    />
  )
}

export function familyTopicLabel(topic: FamilyTopic): string {
  return topicLabels[topic]
}
