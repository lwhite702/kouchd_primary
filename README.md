# Kouchd

Kouchd helps a host and temporary house guests keep dates, expectations, contributions, chores, announcements, and check-ins in one private shared record.

## Current production foundation

- Next.js App Router and strict TypeScript
- Clerk authentication with signed-in and signed-out product states
- Convex schema and real-time functions for users, stays, memberships, invitations, terms, guest-scoped contributions, chores, announcements, reminders, and immutable activity
- Single-use, expiring guest invitation links stored only as SHA-256 hashes
- Mutual acceptance of versioned stay terms
- Per-period daily or weekly obligations with prorated final weeks
- Optional full-payment early discounts, recurring weekly rollover late fees, one-off charges, FIFO credit allocation, and audited host fee waivers/voids
- Server-enforced financial privacy: a guest cannot query another guest's rates, obligations, fees, balance, or payments
- Knock workflow triggers for invitations, check-ins, payment due dates, chores, and one-off charges, with email/SMS preferences
- Two-party contribution confirmation with pending, confirmed, disputed, and voided states
- Daily and weekly pricing represented in integer cents
- Responsive, installable PWA metadata and the original Kouchd visual direction
- No automated money movement

The interface uses preview data when Clerk or Convex browser variables are absent. Preview changes are temporary and are not stored in the browser. When both services are configured, authenticated users get the shared Convex workspace.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev -- --hostname 127.0.0.1
```

Connect a Convex deployment and Clerk application, then fill in the environment values described in `.env.example`.

## Verification

```bash
npm run verify
npm run build
```

`npm run verify` checks deployment environment requirements when running in CI or Vercel, then runs lint, strict TypeScript, and unit and backend integration tests.

## Product boundary

Kouchd records agreements and contributions. It does not collect, hold, transfer, or enforce payment, and it does not replace local housing law, tenancy rights, or legal advice. Public space listings, identity verification, reviews, and dispute resolution remain outside this MVP.

## Deployment

The intended targets are:

- GitHub: private repository `lwhite702/Kouchd_Primary`
- Vercel: project `kouchd` on the Wrelik Apps team
- Build command: `npx convex deploy --cmd 'npm run verify && npm run build'`

Production and Preview must use different Convex deployments and deploy keys. Never commit `.env.local`, Clerk secrets, or Convex deploy keys.

Set `KNOCK_API_KEY` in each Convex deployment (not in browser or Vercel client variables), then create these Knock workflow keys: `guest-invitation`, `check-in-reminder`, `payment-due-reminder`, `chore-reminder`, and `adhoc-fee-posted`. Without the key, notification actions intentionally return `skipped` and do not mark a notification as sent.
