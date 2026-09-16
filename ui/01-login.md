# UI-01 — Request a login link

## Audience, purpose, and route

Families and organisers use this screen to request a one-time email link.
Route: `/login`. Governing spec: [authentication](../11-authentication.md).

```text
                 ┌──────────────────────────────┐
                 │     Familienfreizeit         │
                 │                              │
                 │ Sign in with your email      │
                 │ We will send you a secure     │
                 │ one-time link.                │
                 │                              │
                 │ Email address                 │
                 │ [ alex@example.com          ] │
                 │                              │
                 │ [ Send login link           ] │
                 │                              │
                 │ We do not reveal whether an  │
                 │ address is registered.       │
                 └──────────────────────────────┘
```

The submitted and unknown-address cases use the same confirmation:
“If this address can sign in, a link is on its way.” Validate format locally,
rate-limit feedback generically, and never enumerate families.

## Mobile variant

The card becomes full-width with 16px gutters. The input and button are full
width, at least 44px high, and the email remains visible when the keyboard opens.

## States and accessibility

Support idle, invalid email, submitting, generic sent, and rate-limited states.
Label the input explicitly, associate the error with it, focus the error after
submission, and announce the generic success message in a live region.

## Neobrutalist redesign and components

Center one `Card` on the paper background with a thick outline and offset
shadow. Use `Label` + `Input` as one field group and one full-width primary
`Button`; keep the generic response in an `Alert` or `Sonner` notification.
