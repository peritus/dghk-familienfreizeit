# Specification review for implementation

Scope: active architecture, data/events, labels/resolver, solver, release control,
family/organiser views, authentication, frontend, deployment, testing, roadmap,
profiles, decisions, reports, all active module contracts, and the UI catalogue.
Deferred ideas are not implementation requirements. This review records findings;
it does not amend an architectural decision or authorize a rejected alternative.

## Findings requiring a decision before dependent milestones

### High: family diffs may expose an uncommunicated candidate

[Family assignment UI](../ui/04-family-assignment.md#states-and-privacy) asks
families to expand a pending badge into a before/after result at a reviewed
`input_seq`. [D16](../17-decisions.md#d16--release-control-determines-which-arrangements-families-see)
and [release control](../06-release-control.md) require communicated arrangements
to remain authoritative. An organiser's review is not itself a communication.

Recommendation: explicitly restrict family before/after values to communicated
content; pending organiser changes may have a non-content indication only.
The alternative is a separately authorized preview-sharing capability, which
would require reviewing D16 and its privacy consequences. Before M8/M12, add a
test proving a family's response cannot disclose an uncommunicated room or
workshop through a diff. No such projection is implemented in M0.

### High: reviewed-prefix confirmation needs a concurrent-live-state contract

[Release control §7](../06-release-control.md#7-detailed-preview-and-confirmation) permits
confirmation of an older reviewed prefix despite newer events, while §5 requires
the prospective family composition to satisfy mode, capacity and participation
invariants. Example: a mode-change review clears incompatible sign-ups, then a
family adds a sign-up under the still-communicated old mode before confirmation.
Validation only at the reviewed prefix misses the new incompatible live label.

Recommendation: preserve the reviewed held content, but atomically revalidate its
composition with current live participation at append time and reject new
conflicts. Alternatives are invalidating every review on any head change, or
blocking relevant live writes during review. Select and document the concurrency
rule before M9/M12; include a race fixture and notification-recipient semantics.
This requires release-contract review, not an implicit implementation choice.

### High: active workshop profile has unsupported contributions

[`familienfreizeit-2027.ts`](../profiles/familienfreizeit-2027.ts) declares
`workshop-with`, passes `co_assignment_tag` and `cancel_under_subscribed`, and
includes the relation in family-facing controls. The active
[workshop-assignment](../20.6-workshop-assignment.md) and
[workshops](../20.4-workshops.md) contracts do not define those parameters or their
complete behavior. A permissive builder would conceal this mismatch.

Recommendation: before M2, choose whether to remove those contributions or define
their module semantics, diagnostics and tests. Do not reintroduce automatic
cancellation or co-assignment implicitly. Profile composition must reject
unknown parameters, and the real profile must typecheck once its builders exist.

### High: solver procedures do not fully realize the stability decision

[D4](../17-decisions.md#d4--stable-sorted-greedy-with-bounded-repair-not-integer-programming)
requires retaining feasible assignments unless coverage or repair justifies a
move. The room-placement phases and workshop passes do not fully specify how to
retain the previous result, or repair a flexible incumbent's placement to admit
an otherwise unassigned person. Stable sorting alone does not guarantee stability
when a new participant sorts before an existing one.

Recommendation: define the deterministic event-prefix anchor for “previous”,
retention phases, bounded repair limits and trace reasons in the solver and both
assignment contracts before M5/M6/M10. A mutable previous-plan cache is not an
acceptable shortcut: `derive(events, config)` remains authoritative. If stability
is to be weakened instead, explicitly revisit D4. Add fixtures for a harmless
arrival and a constrained arrival requiring a flexible incumbent to move.

### Medium: pure module composition needs separate runtime entry points

[Module contributions](../20-modules.md) combine domain registration, validation,
Worker routes and application components. [Architecture](../01-architecture.md)
requires a pure shared derive/solver boundary; eagerly importing a single registry
could pull browser components into the Worker or Worker libraries into the client.

Recommendation: specify separate pure, Worker and app contribution entry points
and type-only cross-boundary references in M2. Clarify whether “zero dependencies”
for the pure layer permits a schema library. Retain emitted transitive-import
tests when real modules land; current M0 checks cover only the implemented shell.

### Medium: milestone ordering has release-control prerequisites

[M8/M9](../15-roadmap.md) require family projections and communicated workshop
participation, while the release-control mechanism is delivered in M12. These
milestones cannot safely expose draft state in the meantime.

Recommendation: move the minimal release-aware read/write prerequisites earlier,
or explicitly split M8/M9 into private development surfaces and post-M12 acceptance.
Review the ordering before M8; do not bypass D16 to satisfy an earlier screen gate.

## M0 implementation checks

- Package examples are not a verified compatibility matrix. M0 commits a lockfile
  and runs the Vite/React/Cloudflare/Workers test combination locally. The installed
  test plugin uses Cloudflare's current package name; this changes no D9 boundary.
- The design-system composition recipe mentions `asChild`, while the selected
  Base UI components use the `render` composition API. M0 copies registry source
  using the supported API; later interactive controls must follow that API and
  retain accessible semantics. See [Base UI composition](https://base-ui.com/react/handbook/composition).
- API/auth routing includes both bare prefixes and descendant paths. Built-runtime
  tests verify they cannot fall through to HTML on navigation.
- The real inventory totals reconcile: 38 rooms, 162 beds, 100 lower-price beds,
  62 higher-price beds and total room-inventory cost 15,236. Runtime inventory
  fixtures and event-derived counts remain M4 work.
- As requested for M0, local CI verification and definitions for GitHub CI and the
  dev-preview task are sufficient. No hosted CI run, cloud deployment or running
  preview server is claimed. No sibling-repository house rule was adopted without
  the requested individual Plan-mode approval.

## Verification record

Local Node 22 verification passes strict typechecking, lint, 16 Vitest cases and
12 built-output/boundary cases. Tests use real local D1; error behavior, route
recovery, direct nested navigation, assets, lazy chunk separation and compressed
size budgets are exercised. Real-browser visual/accessibility inspection and the
first GitHub workflow execution remain unperformed, not implied by those results.
