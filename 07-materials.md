# 07 — Materials coordination

Materials coordination is a small reusable module for events where families,
people, or workshops need items brought from outside the event inventory. It
coordinates requests and commitments; it does not manage purchasing, stock,
menus, or physical delivery.

## 1. Module boundary

The module contributes two durable entity kinds:

- `material_request`: an item someone says is needed;
- `material_commitment`: an item someone pledges to bring.

Requests and commitments are separate records. A commitment can be withdrawn
without changing the request it was intended to satisfy. A request therefore
continues to need attention until it is fulfilled or explicitly cancelled.

The core entity and label model supplies identity and properties. Material
names, categories, quantities, notes, requester/contributor identities, and
workshop references are labels. Domain relationships are resolved by the
configured resolver and are not foreign keys.

## 2. Records and relationships

Both record types may carry:

| Label | Meaning |
|---|---|
| `category` | Profile-defined material category |
| `name` | Item name |
| `quantity_text` | Quantity preserved as entered |
| `description` | Additional instructions or notes |

A request has a requester label that may identify a family, person, or
workshop. A commitment has a contributor label that may identify a family or
person. Either record may be linked to a workshop. A workshop-linked request
may additionally identify the person it concerns.

The `fulfills` relation explicitly connects a commitment to a request. Matching
is never inferred from similar names. Multiple commitments may fulfill one
request, and one commitment may be allocated across requests only if the event
profile explicitly permits that.

## 3. Simple resolver

The module exposes a deterministic, side-effect-free resolver:

```ts
resolveMaterials(solverInput: SolverInput, config: MaterialsConfig): MaterialsPlan
```

It validates configured categories and record labels, resolves requester and
contributor identities, checks `fulfills` references, ignores withdrawn
commitments, and derives:

- active commitments;
- open requests;
- fulfilled and partially fulfilled requests;
- commitments that satisfy no active request;
- invalid or conflicting fulfillment relations.

The resolver does not silently close a request when a commitment is withdrawn.
It also does not calculate numeric outstanding quantities from free text such as
`2-3 Packs`, `5 Liter`, or `4x`. Numeric quantity accounting is an optional
future extension with an explicit unit model.

## 4. Profile configuration

An event profile selects the module and supplies:

- the category vocabulary and localized labels;
- allowed requester and contributor kinds;
- whether workshop links and person-specific links are enabled;
- whether one commitment may fulfill multiple requests;
- lifecycle and visibility copy.

Profiles may add pure validation or derivation functions within this contract,
but may not replace the module's record identity, independent lifecycles, or
explicit fulfillment relation.

## 5. Output and UI

The module produces a traceable coordination view rather than an assignment
plan. The generic UI may show:

- open requests needing a commitment;
- requested items with active commitments;
- fulfilled requests;
- withdrawn commitments and the requests they leave open;
- workshop-specific material coordination.

Admin actions append request, commitment, withdrawal, cancellation, and
fulfillment events. The event log remains authoritative; the resolver output is
derived.
