# 06 — Release control

Release control is the kernel mechanism for holding back prepared arrangements
until an organiser chooses **An Familien kommunizieren**. The arrangements then
become visible in authenticated family views. Email is a separate, optional
notification; communicating does not imply that an email was sent (D16).

This document owns release scopes, communication events, visibility composition,
release dependencies, outstanding-change reporting, review, concurrency, history,
and notification selection. Domain rules belong to their modules; screen layouts
belong to [UI-11](ui/11-release-control.md). Other specifications refer here rather
than define independent release mechanisms.

## 1. Release scopes

```ts
type CommunicationScope =
  | { kind: 'accommodation' }
  | { kind: 'workshop-programme', workshop_id: string }
  | { kind: 'workshop-allocation', slot_id: string }
```

| Scope | Held content | Unit |
|---|---|---|
| `accommodation` | Family/person room, bed and place assignments, unplaced results, and the room/building/place descriptors necessary to understand them | The whole accommodation allocation |
| `workshop-programme` | Title, description, slot identity and label, start/end time, room and location descriptors, participation mode, capacity, age/audience eligibility, leaders, manual cancellation and its family-safe explanation | One workshop |
| `workshop-allocation` | Solver participant assignments and unassigned outcomes for the slot | All assigned-mode workshops in one slot |

Scope identity is stable. Several scopes can be communicated atomically in one
action. Accommodation is indivisible because releasing individual families could
promise the same bed twice. Workshop allocation is per slot because moving a person
between individually released workshops could show them in both or neither.
Programme scopes are independent: a workshop can collect rankings before its slot
allocation is communicated.

Only selected modules contribute scopes. `room-assignment` contributes accommodation;
`workshops` contributes programme scopes; `workshop-assignment` contributes slot
allocations. A slot allocation may be empty, including when clearing an existing
allocation after a mode or slot change. A programme without assignment is valid.

Slot and room facts in programme content are resolved at that scope's basis. A
shared slot-time edit creates outstanding changes for every affected communicated
workshop; it must not change their family-visible times before their scopes are
communicated. Different scopes can intentionally retain different historical bases.
Cross-scope consistency is checked under §5, not inferred from equal basis numbers.

## 2. Live information and family composition

These facts are current immediately after a successful append:

- the family's own people, preferences, rankings, food information and free text;
- permitted requests between families, with existing mutuality/disclosure rules;
- material requests, commitments and fulfilment;
- sign-ups and interest responses for communicated workshops.

Self-organised workshop **details** use their programme scope. Their participation
is live. No release is required for a saved answer to appear in its own family's
response. Deadlines and editing authorisation are separate from visibility.

The Worker composes the family response from the current world and reproducible content
selected by the latest communication reference for each scope. No accommodation or
allocation is shown before its first communication. Workshops without a programme
communication are absent from family catalogues and cannot receive family rankings,
sign-ups or interest. Before any communication, own information and permitted
materials coordination remain available.

This is a response projection, not another Plan or a stored World. The family browser
receives neither the event log nor hidden organiser content. Shared and family
reports use the same composition. They identify the current-data sequence and the
scope communication references they use, rather than one global family cut.

Privacy is a separate server-side filter, applied before content leaves the Worker:

- organiser-only tags, notes, traces, scores and keep-apart relations never appear;
- other families' preferences and restricted values never appear in shared views;
- a family may read its own allergy text and other permitted own-family values;
- current session ownership controls access, including to historical arrangements;
- live materials and other references cannot reveal uncommunicated workshop details:
  use a neutral reference description until a safe communicated title is available.

Do not join communicated assignments to current programme/location labels to render
them. Their descriptors come from the appropriate release content. Current own-person
names and withdrawal status may annotate historical assignments without reallocating
places; other-family identities remain subject to current privacy rules.

## 3. Communication event and append

`Communicated` is organiser-only. Its normal event envelope supplies `seq`, actor
and time. It stores references and `build_revision`/`compatibility_revision`, never arrangement payloads.

```ts
type CommunicatedPayload = {
  input_seq: number              // reviewed event-log cut for this communication
  scopes: readonly CommunicationScope[]
  build_revision: string
  compatibility_revision: number
  notify: boolean
  note: string | null                 // organiser-only
}
```

`input_seq` is the event-log cut reviewed by the organiser. It may be older than the
head immediately before append (`Communicated.seq - 1`); this permits communication
of exactly the content the organiser reviewed despite concurrent events. Scopes are
non-empty, unique, supported by selected modules, and sorted by kind then referenced
id. Module references resolve
through the configured resolver. `notify`
requires `change-notifications` to be selected.

Organisers apply pending events before confirming communication. Preview requests
are read-only. The confirmation submits the reviewed `input_seq`, scopes,
`build_revision`, `compatibility_revision` and notification choice. The server:

1. authenticates and authorises the organiser;
2. verifies that `input_seq` is a reachable event-log prefix and the deployed
   identities equal those reviewed;
3. derives the world at `input_seq`, checks §5 and
   all selected-scope findings, and verifies the affected-family/email preview;
4. appends one `Communicated` using the atomic append, recording the reviewed
   `input_seq` even when the live head has advanced;
5. returns the resulting authoritative views, then attempts optional notifications.

A changed deployment or dependency conflict prevents confirmation because the
reviewed content cannot be reproduced or validated. A concurrent append does not
invalidate confirmation: publish the reviewed `input_seq` content. Blocking solver
findings relevant to a selected scope, including unscoped kernel errors on which it depends, prevent
communication until resolved. Unrelated scope findings do not block a programme
release. Privacy, reference validity, admission invariants and cross-scope
consistency are hard gates. No release action can bypass a blocking finding.

### Review identity and semantic comparison

The reviewed `input_seq`, scope selection, `build_revision`, `compatibility_revision` and
notification choice identify the action. The preview response returns those fields;
the client invalidates confirmation whenever any selection/option changes and asks
for a new preview. Confirmation repeats exactly that reviewed tuple. The server
recomputes it from trusted events rather than accepting client content. No stored
preview token or additional content hash is needed: identical inputs produce the
same result under the determinism contract.

Scope accessors return canonical content for semantic comparison: arrays have explicit
total orders ending in ids. Include all held fields in §1, including empty/removed
allocation results and cancellation status. Exclude plan metadata such as `input_seq`,
traces, internal explanations, current answers, materials, live participation,
actor/time, notes and delivery state. Privacy filtering follows selection.

Solver output hashes remain an internal regression-test technique, not release
identity or outstanding-work state. The solver and its seven determinism rules are
unchanged. Do not use solver-output-hash inequality or event counts as outstanding-
work tests.

## 4. Derivation and history

`derive(events, config)` folds communication events into an in-memory index:
`scope identity → latest Communicated reference`. It never queries event payloads
outside the event source to reconstruct domain state. Selected content comes from
ordinary derivation at the reviewed `input_seq`, using the same Plan type.

Historical references strictly decrease in sequence. Derivation can process these
prefixes in increasing order and reuse results within the request; there is no
recursive lookup into a future/current prefix and no persisted cache. Resolve shared
bases once. Solver construction never consumes a composed family response. Workshop
modules consume the resolver's effective communicated programme where their live
admission rules require it, and the draft programme where planning requires it (§5).

Later communication supersedes only the scopes it names. Earlier events remain
history; a combined family view can contain several communication bases. History
views explicitly distinguish content communicated by that event from current live
facts. They must not claim that today's live participation was part of an old release.

A historical scope is reproducible by the current deployment only when its recorded
`build_revision` and `compatibility_revision` match. A different identity flags it for organiser review;
without the matching implementation/configuration there is no trustworthy historical
before-image. Do not run current code and silently present its result as the old
communicated truth. Affected family scopes show a temporary unavailable/contact
message; independent matching scopes and permitted live information remain usable.
Disable admissions and ranking changes that require an unavailable programme; own
saved responses remain readable and participants may still clear their own labels.
Current organiser planning can derive candidate content under the deployed code, but
must label a historical replay under that code as an approximation, never a verified
before-image. This permits recovery without inventing stored historical results.

Organisers can restore the matching deployment or review a new communication. Recovery
without the old implementation shows current content in full and states that a reliable
before/after comparison is unavailable. If the old affected-family set cannot be reproduced, the recovery preview explicitly
uses all currently active families as the conservative recipient set, with each
family's permitted current content. The organiser can leave email unselected;
no old assignments are guessed or disclosed. No hash can reconstruct an old result, and release control stores no content
hash or snapshot. Deploy guidance requires reviewing this impact before changing code.

No general uncommunicate toggle exists. Communicate a correction or cancellation.
Repeating reproducibly identical content creates no semantic change and sends no
change email. Recovery after a revision mismatch is a full-content review; it must
not claim an empty diff when the old content cannot be reproduced.

## 5. Programme, participation and dependencies

The **communicated programme** is the operational contract for family controls and
live admission. Its slot, mode, capacity and eligibility govern those operations,
checked against participation from the current log. Draft programme edits do not
change these controls. Organisers can plan against the draft programme; the resolver
exposes both perspectives explicitly, never as per-screen relationship lookups.

| Change | Release requirement |
|---|---|
| New allocation | Every target must have a compatible communicated programme, or its programme scope must be selected in the same action |
| Title/description/location/time | May be selected independently when the resulting arrangements remain coherent; show affected families and check room, leader and participant scheduling conflicts |
| Capacity below live sign-ups | Preserve everyone; warn of over-capacity and block further admission until space exists |
| Capacity below existing solver intake | Include a compatible allocation update; do not leave a communicated allocation above its effective capacity |
| Mode change | Explicitly resolve incompatible active sign-up/interest labels before release; never convert participation types or resurrect dormant lists |
| Slot change | Check both slots, active participation and allocation uniqueness; include both allocation scopes when needed to remove/reassign old entries |
| Cancellation | Communicate it explicitly, preserve identity and participation history, and clearly mark attendance/assignments as cancelled; replacement allocations may follow |
| Reinstatement | Preview restored participation and validate capacity/eligibility; never silently reinstate attendance through an unrelated scope |

Build a prospective family composition by replacing only selected scopes. Validate
it, not just the latest solver plan. An active allocation target must be `assigned`, not
manually cancelled, in the same slot, and compatible with communicated eligibility,
capacity and required decisions. A communicated manual cancellation explicitly marks
retained old assignments inactive/cancelled, so it can stand alone while replacements
are prepared; those entries reserve no attendance capacity or slot and are not active
targets for this check.

A mode transition away from `assigned` requires communicating removal of its solver
participants in the old slot. A transition to `assigned` can communicate the programme
first and allocation later. Incompatible retained sign-up/interest labels, including cancelled/inactive ones,
must be explicitly cleared through ordinary authorised events before confirming the mode transition.
They are never automatically cleared by `Communicated`. The mode-change preview names
the affected people and required work. Old rankings remain recorded but are inactive
when their workshop is no longer assigned in the relevant programme.

A person with a live sign-up is excluded from draft solver allocation in the sign-up's
**communicated slot**. If draft slot edits differ, report the transition conflict;
do not silently reinterpret the reservation using the draft slot. A live sign-up may
overlap an old communicated solver assignment while organisers prepare its removal.
Show both with a pending-adjustment explanation. A new allocation release must resolve
that overlap; live sign-up does not erase the old allocation itself.

Time/slot changes validate prospective live sign-ups across workshops. Schedule,
room and leader conflicts introduced by a release must be resolved through explicit
edits or coordinated scope selection. Lowered sign-up capacity is the explicit
non-eviction exception, reported as a world warning. Clearing participation is an
ordinary visible domain action, not a hidden side effect of releasing details.

Uncommunicated workshop references in saved own rankings use the last safe descriptor
or a neutral unavailable-choice label, never draft titles. Existing disclosure rules
for requests still apply; release control does not activate sleeping-party
functionality outside the active module set.

## 6. Outstanding changes report

**Noch nicht an Familien kommuniziert** compares each scope's current candidate
content with its last reproducible communicated content. It lists:

- never communicated, changed, matching, or revision-mismatch state;
- scope name and last communication reference;
- exact semantic differences and affected families;
- dependencies and blocking conflicts;
- selection for communication.

Never-communicated scopes show full initial content. A changed-then-restored value
has no outstanding difference. Live-only inputs and diagnostics are not backlog;
their effect on held allocations can be. Count allocation movements separately from
programme-only effects. Empty state: **Alles ist an Familien kommuniziert.** Revision
mismatches remain visible and cannot be presented as an empty diff.

Unselected changes stay listed. The organiser's pending world may be inspected as a
planning preview, clearly marked not applied; final communication review requires
committed data. The dashboard links to this report rather than using events-since-
communication as a staleness measure. Reports work on mobile and print under
[reports](19-reports.md); nothing is stored or downloaded by the application.

## 7. Detailed preview and confirmation

**An Familien kommunizieren** opens a read-only review. It does not append an event.
The review uses the same scope-content extraction and semantic comparison as §6 and
contains:

1. selected scopes and the exact reviewed `input_seq`;
2. field-level before/after values, full initial content, and participant additions,
   removals and movements;
3. affected families, grouped by family, with the exact family-visible result;
4. dependencies requiring explicit selection and blocking conflicts; no scope is
   added silently;
5. everything left uncommunicated;
6. optional email choice, exact recipients and message previews (§8).

**Jetzt an Familien kommunizieren** is the final confirmation. The review states:
**Diese Angaben sind anschließend in der Familienansicht sichtbar.** Separately:
**E-Mail-Benachrichtigung: nicht ausgewählt** or the selected recipient count.

A confirmation is refused only when the reviewed `input_seq` is unavailable, the
deployed identities cannot reproduce it, or the selected scopes/findings no longer
pass validation at that sequence. Newer concurrent events do not refresh the diff:
the successful response must expose exactly the reviewed held content. The family
preview applies the real privacy projection, not an organiser rendering with some
columns hidden. Pending edits must be applied or discarded before final confirmation.

## 8. Notification selection

`notify` requests email after the communication append succeeds. Delivery cannot
roll back visibility. Recipient selection compares family-visible compositions
immediately before and after the proposed release at the reviewed `input_seq`; it
does not compare two whole worlds with unrelated live changes.

- First accommodation/slot allocation communication includes families represented
  by its results, including explicitly unassigned people.
- First programme communication addresses active families with at least one eligible
  person according to the effective programme and configured eligibility policy.
- Allocation changes address families whose result changes.
- Programme changes address families with participants, leaders, interest responses
  or applicable rankings for the workshop in either side of the comparison. Mode
  and eligibility changes include families newly eligible for the communicated offer.
- Cancellation/reinstatement and movement count as changes. Internal scores do not.
- Materials and routine live edits never trigger communication emails.
- Deduplicate families across scopes, sort by family order then id, and send no
  change email for an unchanged family-visible result.

The notification module renders initial information and before/after change messages
for these recipients. It cannot widen scope visibility. Messages omit private resolver
causes. No notification module means no email option; release control still works.

Operational `email_log` records the communication event sequence, family, kind,
delivery status and retry identity. Retries use the reviewed `input_seq` and scope selection,
not a newer programme or recipient set; no second domain snapshot is stored. Reconstruct
recipients and bodies from the prefix ending at that communication. Claim delivery
atomically and use a stable provider idempotency key where supported; without provider
idempotency, an ambiguous send is marked unknown for explicit review rather than
blindly retried. Failed/unknown delivery is distinct from successful communication.
If `build_revision` or `compatibility_revision` no longer matches, pause reconstruction/retry until the
matching deployment is restored or the organiser starts a new reviewed communication.
Current authorisation still applies at send time: suppress recipients no longer
entitled to the content and record the suppression; never redirect an old message
to a newly associated address without review.

## 9. Acceptance scenarios

1. After communication, a family saves diet, allergy text, rankings, free text or
   materials and immediately sees the saved values. Shared privacy is unchanged.
2. Communicating one workshop's details reveals neither another workshop nor any
   solver allocation. Rankings can then be collected before allocation communication.
3. A combined release is atomic; accommodation and each slot retain uniqueness.
4. Different scopes retain their own reviewed input sequences. A shared slot/room edit cannot leak
   through a join to current descriptors.
5. A reverted edit has no outstanding change. Live materials do not create backlog.
6. First communication shows full content; repeated identical content sends no email.
7. Preview and resulting family-visible held content agree byte-for-byte after the
   same canonicalisation/privacy projection. Viewing previews writes no event.
8. A concurrent append does not invalidate confirmation: the reviewed `input_seq`
   is communicated. An unreproducible sequence or deployment mismatch prevents
   partial release.
9. Missing programme dependencies require explicit selection; invalid mode, slot,
   capacity or cancellation combinations block communication until resolved.
10. Sign-up admission, last-place races, capacity reductions and fairness follow the
    workshop module; historical allocation overlap is explained and resolved on release.
11. Mode transitions never convert, silently delete or revive participation. Moving
    slots checks both sides. Cancellation stays visible even before replacements exist.
12. Families cannot access private historical labels or infer draft workshop details
    from materials, rankings, reports or email.
13. Recipient preview equals sends; only selected-scope changes affect selection.
    Failure does not undo communication; retries do not duplicate known deliveries.
14. Missing notification/assignment modules remove their contributions without
    disabling independent programme communication or live coordination.
15. Build or compatibility drift is attributed; mismatched scopes are unavailable rather than
    silently recomputed as if communicated. Matching independent scopes remain usable.
