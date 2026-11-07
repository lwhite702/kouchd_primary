# Launch screenshots (November 2026)

Internal asset library for marketing, the help center, and the website. Not part
of Mintlify navigation (`docs/` is excluded by `.mintignore`).

## How these were made

- Captured from source on branch `claude/loving-ptolemy-f7sjmy` with the real UI
  and the real Convex functions running in memory (`convex-test`). Clerk was
  replaced by a local stand-in, so no Clerk-hosted screens (sign-in, sign-up,
  account profile) appear here. The avatar circle is the stand-in, not Clerk's
  `UserButton`.
- Every person, address, Wi-Fi password, door code, payment handle and amount is
  synthetic. No customer data was used.
- Desktop: 1440 x 900 viewport at 2x (2880 px wide). Phone: 390 x 844 at 3x
  (1170 px wide). Files ending in `-full` are full-page captures.
- Light appearance only. Dark appearance is still in development and is not
  shown.
- These show branch behavior that is not yet released. Use them publicly only
  after the matching release is verified in production.

## Household shown

Maple House, hosted by Jordan Reyes, Oct 20 to Dec 20, 2026, $200 per week.
Guests Marcus Lee and Priya Shah joined by invitation and accepted their
agreements. The host account has Plus, which allows the second guest.

## Index

| File | Shows | Suggested use |
| --- | --- | --- |
| `01-start-page` | Signed-out start page with host and guest paths | Website hero, App Store-style feature tile |
| `10-host-overview` | Host home: household, stats, today's chores, people, announcements | Marketing hero, help "Host home" |
| `10-host-overview-alerts` | Host home with confirmation, overdue and announcement alerts | Help: notifications, confirming contributions |
| `11-host-ledger` | Host view of one guest's private ledger with totals and schedule | Marketing "clear records", help: ledger management |
| `12-chore-board` | Chore board with assignees and a completed chore | Marketing "shared chores", help: chores |
| `13-shopping-list` | Shared shopping list | Help: shopping list |
| `14-house-check-ins` | Check-in history with an open check-in | Help: house check-ins |
| `15-stay-details` | Agreement status, auto-acceptance, referral code, terms | Help: stay agreements |
| `20-dialog-invite`, `21-dialog-invite-link` | Invite dialog before and after creating a private link | Help: inviting guests |
| `22-dialog-add-chore` | Add chore form | Help: chores |
| `23-dialog-announcement` | New announcement form | Help: announcements |
| `24-dialog-house-guide` | House guide editor (Wi-Fi, address, access) | Help: house guide |
| `25-stay-hub` | All stays hub | Help: switching stays |
| `30-guest-overview` | Guest home | Marketing "for guests", help: guest home |
| `30-guest-overview-alerts` | Guest home with alerts | Help: guest notifications |
| `31-guest-ledger` | Guest's private ledger, coins and contribution entries | Marketing privacy story, help: logging contributions |
| `32-dialog-add-contribution` | Add contribution form | Help: logging contributions |
| `40` to `44-setup-*` | Five-step host setup: dates, house rules, rewards, financial rules, review | Help: getting started as a host, onboarding marketing |
| `50-invite-landing` | Invitation page a guest opens | Marketing "joining is free", help: joining a stay |

Phone captures (`mobile/`) cover the start page, host and guest home, ledgers,
chores, shopping, check-ins, stay details, the add-contribution sheet, the setup
wizard and the invitation page.

## Copy guardrails

When placing these, keep the product wording: **Ledger**, **Add contribution**,
and "contribution" for each entry. Contribution records are shared records; do
not caption them as payments processed by Kouchd.
