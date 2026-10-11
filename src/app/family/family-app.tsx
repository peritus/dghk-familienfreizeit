import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { FamilyDetail } from '../components/family-detail/family-detail.js'
import { familyTopics, type FamilyTopic, type FamilyChange } from '../../family-detail/model.js'
import { loadFamily, changeFamily, FamilyApiError, type FamilyRepresentation } from './api.js'
import { logout } from '../auth/session.js'
import { ApplicationFrame } from '../components/application/application-frame.js'
import { OccasionBrand, familyIdentityLabel } from '../components/application/occasion-brand.js'
import { profileEventTitle, profileOrganisation } from '../lib/profile-presentation.js'
import { RouteLoading } from '../components/application/route-states.js'
import { Button } from '../components/shared/ui/button.js'
import type { ProfilePresentation } from '../../config/presentation.js'

export default function FamilyApp({ profile }: { profile?: ProfilePresentation }) {
  const [location, navigate] = useLocation()
  const [representation, setRepresentation] = useState<FamilyRepresentation | null>(null),
    [error, setError] = useState<string | null>(null)
  const current = useRef<FamilyRepresentation | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void loadFamily(controller.signal)
      .then((result) => {
        current.current = result
        setRepresentation(result)
      })
      .catch((failure) => {
        if (controller.signal.aborted) return
        if (failure instanceof FamilyApiError && failure.status === 401) void navigate('~/login')
        else setError('Die Familiendaten konnten nicht geladen werden.')
      })
    return () => controller.abort()
  }, [navigate])
  async function change(change: FamilyChange) {
    if (!current.current) return
    try {
      await changeFamily(change, current.current)
    } catch (failure) {
      if (failure instanceof FamilyApiError && failure.status === 401) void navigate('~/login')
      if (failure instanceof FamilyApiError && failure.status === 412) {
        const result = await loadFamily()
        current.current = result
        setRepresentation(result)
      }
      throw failure
    }
    const result = await loadFamily()
    current.current = result
    setRepresentation(result)
  }
  let parts: string[] = []
  try {
    parts = location.split('/').filter(Boolean).map(decodeURIComponent)
  } catch {
    /* invalid route is shown below */
  }
  const topic = familyTopics.includes(parts[0] as FamilyTopic)
    ? (parts[0] as FamilyTopic)
    : parts.length === 0
      ? 'zimmer'
      : null
  const personId = parts[1]
  const selected =
    representation?.data.people.find((person) => person.id === personId) ??
    representation?.data.people[0]
  const path = (next: FamilyTopic, id = selected?.id) =>
    `/${next}${next !== 'zimmer' && id ? '/' + encodeURIComponent(id) : ''}`
  return (
    <ApplicationFrame
      print_title={profileEventTitle(profile)}
      brand={<OccasionBrand profile={profile} link={<Link href="~/" />} />}
      role={familyIdentityLabel(representation?.data.family.display_name, profile?.meta.locale)}
      brand_subtitle={[
        profileOrganisation(profile),
        familyIdentityLabel(representation?.data.family.display_name, profile?.meta.locale),
      ]
        .filter(Boolean)
        .join(' · ')}
      controls={
        <>
          <Button
            variant="neutral"
            type="button"
            onClick={() =>
              void logout()
                .then(() => navigate('~/login'))
                .catch(() => setError('Die Abmeldung konnte nicht abgeschlossen werden.'))
            }
          >
            Abmelden
          </Button>
        </>
      }
    >
      {error ? (
        <div role="alert" className="grid gap-3">
          <p>{error}</p>
          <Button type="button" onClick={() => window.location.reload()}>
            Neu laden
          </Button>
        </div>
      ) : !representation ? (
        <RouteLoading />
      ) : !topic ? (
        <p>Diese Familienansicht gibt es nicht.</p>
      ) : (
        <FamilyDetail
          data={representation.data}
          actions={{ change }}
          topic={topic}
          person_id={personId}
          on_select={(id) => void navigate(path(topic === 'zimmer' ? 'personen' : topic, id))}
          on_topic={(next) => void navigate(path(next))}
          topic_link={(next) => <Link href={path(next)} />}
        />
      )}
    </ApplicationFrame>
  )
}
