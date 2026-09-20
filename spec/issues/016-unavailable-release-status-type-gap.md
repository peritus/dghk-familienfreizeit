---
id: "016"
title: Unavailable release status is not a first-class state
status: needs-decision
severity: gap
category: module:release-control
source: issue-2-unavailable-release-status (pre-existing)
related_decisions: [D16]
related_files:
  - ../application/release-control.md
  - ../ui/screens/release-control.md
  - ../ui/screens/family-assignment.md
  - ../application/family-view.md
  - ../application/reports.md
  - ../modules/change-notifications.md
  - ../ui/frontend.md
  - ../engineering/deployment.md
  - ../ui/german-translation-guidelines.md
opened: 2026-09-19
---

# Unavailable release status is not a first-class state

## Executive summary

The unavailable state exists to prevent the application from lying about an
arrangement that it can no longer reproduce reliably.

For example, a family may have been told that it has room 12. A later deployment
can change the profile, resolver, or implementation identified by the historical
communication. If the application cannot replay the historical event-log prefix
with the recorded build and compatibility identity, it must not silently derive a
new result and present it as the communicated result. It also must not fabricate a
before/after diff or send a misleading change email.

This is primarily an operational safety and recovery behavior, not a new everyday
family feature. The family-facing feature is deliberately small:

    “This arrangement is temporarily unavailable. Please contact the organisation
    team.”

Independent scopes and permitted live information remain usable. Organisers can
restore the matching deployment or explicitly review and publish a new current
arrangement.

## Problem

The specifications describe unavailable history in prose across release control,
family UI, organiser UI, reports, notifications, deployment guidance, and tests.
The shared type contract, however, defines only:

    type CommunicationScopeStatus =
      | 'communicated'
      | 'changed'
      | 'never-communicated'

CommunicationScopeView has an auxiliary unavailable field, but unavailable is
not a member of the status union. This permits contradictory values such as
status: 'communicated' together with unavailable: { ... }, and leaves every
consumer to decide independently which field wins.

The same gap appears in the diff, report, UI, notification, and recovery
contracts. The prose knows what to do, but the API boundary does not provide one
canonical state machine for doing it.

## What the user-facing behavior is meant to achieve

The behavior protects users from incorrect historical information:

1. A communicated arrangement stays tied to its reviewed event-log prefix and
   deployment identity.
2. If that historical content can be reproduced, the application may show it and
   calculate a trustworthy matching or changed diff.
3. If it cannot be reproduced, the application shows an unavailable warning
   rather than substituting current draft content.
4. Affected family controls that depend on the unavailable communicated programme
   are disabled, while own saved answers and independent live information remain
   available.
5. Organisers receive a recovery path rather than an uncommunicate toggle:
   restore the matching deployment, or deliberately communicate a new current
   result.
6. Notification delivery never turns an unavailable historical comparison into a
   normal change email.

The application is not trying to preserve a hidden snapshot or reconstruct the old
result from a content hash. The event log remains the domain source of truth. The
unavailable state is the safe answer when deterministic replay is no longer
possible.

## Findings

### 1. The core status model is incomplete

The shared status union omits unavailable, despite release-control derivation
explicitly requiring it for an unreproducible historical reference.

The current optional field is too weak:

    unavailable: { reason: string } | null

It does not state which reasons are valid, whether the historical communication
still exists, whether a diff is allowed, or whether the current content is safe to
show to the audience.

The prose also says that unavailable “retains the last known status” while saying
that it “sets unavailable.” These are different concepts. The public status should
be unavailable; a last-known status, if needed for organiser display, should be
separate metadata.

### 2. The diff model cannot represent recovery safely

ScopeDiff.kind supports only initial, changed, and matching. That is fine if the
contract makes diff: null mandatory for unavailable history. It is not fine if
consumers are expected to express a mismatch by inventing an after value.

The organiser recovery screen needs to show current proposed content while stating
that no reliable before-image exists. That current proposal is not a valid
ScopeDiff.after value. It should be carried by a separate organiser-only recovery
preview, not by the historical diff type.

### 3. Organiser UI recognizes the state but does not define it

The organiser UI asks for revision-mismatch rows, text, glyphs, and history views,
but defines badges only for communicated, changed, and never communicated. It also
requires mismatch rows to remain visible even when the outstanding-change report
would otherwise be empty.

The missing contract is the exact status badge, row action, selection behavior,
review behavior, and relationship between the old communication and a recovery
communication.

### 4. Family UI recognizes the state but does not define its presentation

The family assignment screen explicitly requires revision-mismatch unavailable
states, but its shared badge vocabulary has only the three ordinary states.

The family contract must explicitly say that an affected historical arrangement is
not shown as current and that current draft content is not exposed as a substitute.
The safe presentation is a neutral unavailable/contact card. Other matching scopes,
own saved responses, and permitted live information continue to render.

Admissions and ranking controls that require an unavailable communicated programme
must be disabled. Own responses remain readable, and the permitted self-service
clear operation remains available.

### 5. Reports consume unavailable state without rendering rules

Reports correctly consume the shared scope view and the organiser readiness report
must list unavailable scopes. The missing rules are:

- organiser reports show the mismatch and recovery-needed state;
- family and shared reports show a neutral warning and omit unavailable held
  content;
- independent scopes remain visible;
- current draft content is never leaked through a family/shared report;
- a change notice does not invent a before/after comparison.

The report itself should remain available when only one scope is unavailable.

### 6. Notification previews do not define unavailable handling

Notification rendering correctly consumes the family-projected scope view and does
not reconstruct diffs itself. The retry contract pauses reconstruction after build
or compatibility mismatch, but the preview contract does not say that a normal
change email requires a reliable before-image.

The missing rules are:

- no ordinary change email for an unavailable scope;
- no empty diff substituted for a missing before-image;
- retry waits for the matching deployment or a new reviewed communication;
- recovery communication is an explicit full-content case;
- if the old recipient set cannot be reconstructed, recovery uses the conservative
  currently-active-family set described by release control.

### 7. Recovery is described operationally but not typed

The prose gives two valid recovery choices:

1. restore the deployment that can reproduce the old communication; or
2. review and communicate current content as a new release.

The API contracts do not distinguish these choices, do not model a recovery/full
content preview, and do not define how notification preview data identifies the
absence of a reliable before-image.

## Canonical state machine

Unavailable should be a first-class status:

    type CommunicationScopeStatus =
      | 'never-communicated'
      | 'communicated'
      | 'changed'
      | 'unavailable'

Derivation should use this precedence:

| Condition | Status | Diff |
|---|---|---|
| No prior communication exists | never-communicated | initial |
| Prior communication is reproducible and content is equal | communicated | matching or consistently null |
| Prior communication is reproducible and content differs | changed | changed |
| Prior communication exists but historical content is not reproducible | unavailable | null |

newer_events is orthogonal. It indicates that events occurred after the
candidate input sequence; it must not replace an already-opened diff and must not
turn unavailable into changed.

The minimum invariant should be:

    status === 'unavailable'
    communication !== null
    diff === null
    unavailable !== null

The unavailable reason should be a closed type, for example:

    type UnavailableReason =
      | 'input-sequence-unavailable'
      | 'build-revision-mismatch'
      | 'compatibility-revision-mismatch'
      | 'historical-content-unreproducible'

The communication reference remains populated so history can identify what was
previously released. If organisers need the old status for explanation, expose it
as last_known_status; do not encode two statuses in one view.

Current candidate content for recovery must be a separate organiser-only preview.
It must not be inserted into ScopeDiff.after, because that would imply a
trustworthy historical before-image.

## Audience behavior

### Organisers

Organisers should see:

- a clearly labelled unavailable/revision-mismatch row;
- the scope and last communication reference;
- the typed mismatch reason and relevant deployment identities;
- no fabricated before/after diff;
- current candidate content in a separately labelled recovery preview;
- affected families when the historical set is reproducible;
- the conservative currently-active-family recipient set when it is not;
- actions to restore the matching deployment or start a new communication review.

Confirmation must require a fresh preview. A recovery communication is a new
release; it does not rewrite or retract the old communication.

### Families

For an affected scope, families should see a neutral unavailable/contact message.
They should not see:

- an unreproducible historical arrangement presented as authoritative;
- current organiser draft content;
- build revisions, compatibility revisions, resolver causes, or organiser notes;
- other families' data.

Independent matching scopes and permitted live information remain visible. Own
saved answers remain readable. Controls requiring the unavailable communicated
programme, such as ranking or admission controls, are disabled with a plain reason.
Permitted self-service clearing remains possible.

### Shared and family reports

These use the family privacy projection. Unavailable held content is replaced by a
neutral warning or omitted, while independent content remains visible. The report
does not become globally unavailable just because one scope cannot be replayed.

### Notifications

A normal change notification requires a reliable before/after comparison. An
unavailable scope therefore produces no normal change email and disables ordinary
email selection in the preview. Retry pauses until the matching deployment is
restored or the organiser starts a new reviewed communication.

A recovery communication may send a full current-content message, subject to the
explicit conservative recipient policy and the same family privacy projection.

## Affected contracts and tests

The following documents and contracts need coordinated updates:

- ../application/release-control.md: status union, unavailable reason, view invariants,
  recovery preview, and notification rules;
- ../ui/screens/release-control.md: organiser badge, rows, history, and recovery actions;
- ../ui/screens/family-assignment.md and ../application/family-view.md: unavailable card, control
  behavior, and privacy boundaries;
- ../application/reports.md: organiser, family, shared, and change-notice rendering;
- ../modules/change-notifications.md: unavailable previews, recovery messages, and
  retry rules;
- ../ui/frontend.md: projected API shape and shared renderer behavior;
- ../engineering/deployment.md: deployment-impact and recovery runbook wording;
- ../ui/german-translation-guidelines.md: user-facing unavailable and recovery copy;
- workshop and ranking contracts that depend on an effective communicated
  programme;
- the profile/module contracts where unavailable programme state affects controls.

Tests should cover:

- every mismatch reason producing status: 'unavailable';
- unavailable always carrying communication metadata and no diff;
- unavailable remaining unavailable when newer events exist;
- no fabricated historical before/after values;
- organiser recovery content being separated from historical diff content;
- family privacy projection hiding current draft content;
- independent scopes remaining available;
- affected programme controls being disabled while own saved responses remain;
- reports showing warnings without leaking unavailable content;
- ordinary notification previews refusing unavailable change emails;
- retries pausing on mismatch;
- conservative recovery recipients when the historical recipient set is unknown;
- all consumers receiving equivalent status semantics after audience projection.

## Dependency-ordered implementation/documentation plan

1. **Define the kernel contract.** Add unavailable to the status union, define typed
   reasons, state the diff: null invariant, and define the separate organiser
   recovery preview.
2. **Update derivation and shared read-model tests.** Make unavailable the canonical
   result of unreproducible history and keep newer_events orthogonal.
3. **Update organiser release control.** Add the mismatch badge, explicit no-diff
   presentation, recovery review, and conservative recipient behavior.
4. **Update family projection and UI.** Render a neutral unavailable card, preserve
   independent/live information, and disable only controls that require the
   unavailable communicated programme.
5. **Update reports.** Define organiser warnings, family/shared redaction, and
   change-notice behavior.
6. **Update notifications.** Prevent ordinary unavailable change emails, pause
   retries, and define explicit recovery/full-content previews.
7. **Update module/profile contracts.** Align workshop, ranking, assignment, and
   profile-facing control behavior with the unavailable programme state.
8. **Update deployment and translation guidance.** Document recovery operations and
   provide plain-language copy.
9. **Run the complete release-control verification set.** Include mismatch,
   recovery, projection-equivalence, report, notification, and privacy scenarios.

The central design decision is simple: unavailable is a real shared status, not an
auxiliary warning. It means “the old result cannot safely be reproduced,” not “the
system has no current data.”

