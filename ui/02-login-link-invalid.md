# UI-02 — Invalid or expired login link

## Audience, purpose, and route

An attendee who followed an unusable link needs a calm recovery path. Route:
`/login/invalid`. Governing spec: [authentication](../11-authentication.md).

```text
┌─────────────────────────────────────┐
│ Familienfreizeit                    │
│                                     │
│ This link is no longer available    │
│ It may have expired or already been │
│ used. Request a new one to continue.│
│                                     │
│ [ Request a new login link ]        │
│                                     │
│ Need help? Contact the organisers.  │
└─────────────────────────────────────┘
```

Never expose whether the token was malformed, expired, or already consumed.
The recovery button returns to UI-01 with the email field empty.

## Mobile, states, and accessibility

Use the same full-width mobile card as UI-01. The page has one primary action,
an informative status heading, and a logical focus target on the recovery
button. A network failure while requesting a new link returns to UI-01 with a
generic retry message.

## Neobrutalist redesign and components

Use one `Card` with the expired state in an `Alert`, followed by one primary
`Button`. Do not style the failure as red-only: pair its `Badge` or border
treatment with the plain-language heading and recovery action.
