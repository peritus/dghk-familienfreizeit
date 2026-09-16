# 15 — Event profiles

An event profile composes generic modules for one deployment. It is the
authoritative source for that deployment's module selection, vocabulary, policy,
copy, and pure evaluators. The first deployed profile is documented separately
in [events/familienfreizeit-2027](events/familienfreizeit-2027.md).

## 1. Profile shape

The implementation profile is a typed TypeScript value at
`events/familienfreizeit-2027.ts`. The profile builder validates the composition
at build time and exposes one active profile to the application.

```ts
export default defineEvent({
  meta: {
    name: '...',
    date: 'YYYY-MM-DD',
    preferenceDeadline: 'YYYY-MM-DDTHH:mm:ssZ',
    locale: 'de',
    description: '...',
  },

  modules: [
    rooms({ ... }),
    sleepingParties({ ... }),
    workshops({ ... }),
    materials({ ... }),
  ],

  tags: {
    // concrete vocabulary and pure evaluators
  },
})
```

The module list is explicit. There are no hidden presets and no runtime feature
flags that can change solver semantics after deployment. A profile may select
rooms without workshops, workshops without rooms, or both.

## 2. Module contract

A generic module declares its stable id, version, dependencies, and contributed
contracts. Contributions may include event schemas, entity kinds, tags,
validation, solver stages, traces, routes, views, and test contracts.

Dependencies are strict: a missing or incompatible dependency fails profile
validation. A disabled module contributes no required data, solver stage, trace
section, route, view, or fixture.

Module implementations own mechanisms. Profiles supply parameters, concrete tag
definitions, user-facing copy, weights, phase limits, and deterministic
evaluators. Profile evaluators may derive capabilities, check eligibility, or
score candidates within a module contract. They may not perform I/O, read a
clock, use randomness, dynamically evaluate code, or change module control flow.

## 3. Tags and labels

Labels are the generic stored fact. Tags are the profile's typed vocabulary over
those labels. A profile may define:

- property tags such as `room_type=tent`;
- references such as `member_of=fam_27`;
- capabilities derived from properties, such as `indoor` or `ensuite`;
- requirements, relations, descriptive notes, scopes, cardinality, aliases,
  strengths, and family-facing controls.

The generic materials module contributes durable material-request and
material-commitment records, validation, and fulfillment projections. Profiles
choose category values, labels, and whether records are general event material
or linked to a workshop. Material names, quantities, and notes remain labels
rather than new domain columns.

The resolver operators remain generic and fixed. A profile maps its tags to those
operators but cannot add executable runtime operators.

## 4. Module policy and weights

Profiles supply module parameters, phase switches, and integer scoring weights.
Generic modules own the scoring mechanisms; the profile chooses the policy values
used by the selected modules. Changes to those values are deployments, not event
log entries.

## 5. Hashing and history

The configuration hash includes profile metadata, selected module ids and
versions, module parameters, tags, phases, weights, and the source of profile
functions. This makes configuration changes visible in plan metadata.

Historical plan bodies remain authoritative. The currently deployed profile is
used for new solves; retaining a plan body does not promise that a later profile
can reproduce the historical solve exactly.

## 6. UI and copy

Generic UI modules render the surfaces contributed by selected modules. Profile
metadata and tag definitions supply labels, help text, controls, privacy rules,
and locale-specific copy. A disabled module has no corresponding UI surface.

## 7. Deployment boundary

One event profile and one database belong to one deployment. Supporting another
event means composing another profile and deploying it separately; this design
does not introduce runtime multi-event tenancy.

The profile is not an example configuration. It is the source of truth for the
first deployed event, while this document defines the reusable profile contract.
