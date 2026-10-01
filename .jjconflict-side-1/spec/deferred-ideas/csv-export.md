# CSV export

This is an accepted deferred idea. It is not part of the active application
contract and must not be implemented until the reports catalogue and browser-print
work have landed. The current application has no CSV import or CSV export.

## 1. Purpose and ordering

CSV export may provide a practical, tabular copy of selected report data for
organiser workflows that genuinely need a spreadsheet. It is a report-output
capability, not a family-management workflow and not a replacement for manual
invitation.

Promotion is blocked until the reports work has delivered the report host, active
report catalogue, audience projections, communication-scope handling, privacy
rules, responsive layouts, and print acceptance. The browser report remains the
authoritative human-readable surface before and after any future export.

CSV export must not be added to an active roadmap milestone, route catalogue,
report contract, or UI screen while it remains deferred.

## 2. Boundaries

- Export is organiser-authorized and read-only.
- Export starts from a named report or report table, never from raw event rows,
  the event log, database tables, or an ad-hoc family lookup.
- The same derived world, audience projection, communication scope, data cut,
  sensitivity, and field-level privacy rules used by the report determine the
  exported rows and columns.
- Export creates no events, operational records, stored snapshots, cache entries,
  or other domain state.
- There is no import counterpart. CSV data cannot be uploaded to create or change
  families, people, labels, assignments, or communications.

## 3. Promotion design questions

Before promotion, each exporting report must define:

- its permitted audience and exact columns, including whether any sensitive field
  is excluded rather than merely marked;
- the data cut and communication references shown with the export;
- deterministic row ordering and column ordering;
- UTF-8 encoding, header spelling, delimiter, quoting, line endings, and formula-
  injection handling;
- filename and generation-time conventions;
- empty, incomplete, changed, unavailable-history, and restricted-data behavior;
- whether the export represents the complete report or only a selected filtered
  table;
- browser behavior, including download naming and failure feedback.

No report may inherit an export automatically. A report contribution must opt in
with an explicit export contract, and the export must remain subject to the
report's audience and privacy tests.

## 4. Acceptance criteria for future promotion

A promoted export is ready only when:

1. its report source, audience, data cut, and sensitivity are explicit;
2. its columns and ordering are deterministic and documented;
3. values containing delimiters, quotes, newlines, Unicode, and spreadsheet
   formulas are serialized safely;
4. restricted, unavailable, incomplete, and empty states do not leak data or
   produce misleading rows;
5. generating the file performs no domain or operational writes;
6. browser tests cover authorization, download metadata, content, and failure
   behavior; and
7. the report view and CSV output agree for the same derived world and scope.

Promotion requires explicit scope approval, review of affected binding decisions,
and reinsertion into the active roadmap before implementation.
