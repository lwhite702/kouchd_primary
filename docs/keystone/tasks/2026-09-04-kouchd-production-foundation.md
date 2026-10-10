# Task Creation: Kouchd Production Foundation

## Goal

Move Kouchd from a local-only vanilla prototype into a private, production-shaped Next.js application with authenticated host and guest collaboration, durable Convex data, GitHub source control, and verified Vercel deployments. Preserve the current product direction while replacing prototype shortcuts with shared, auditable behavior.

## Context inspected

- Existing prototype: `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, and `sw.js`
- Existing domain logic: `src/pricing.mjs` and `src/stay.mjs`
- Existing tests: `tests/pricing.test.mjs` and `tests/stay.test.mjs`
- Existing project documentation: `README.md`
- Approved architecture: Next.js, TypeScript, Convex, Clerk, Vercel, and a private GitHub repository
- Approved deployment targets: GitHub `lwhite702/Kouchd_Primary` and Vercel project `kouchd`

## Requirements inventory

### Critical requirements

- Preserve the current Kouchd visual direction and mobile-first interaction model.
- Replace browser-local persistence with shared Convex state.
- Authenticate hosts and guests with Clerk.
- Enforce stay membership and role permissions in every public backend function.
- Require both parties to accept the same terms version before a stay becomes active.
- Model daily and weekly obligations independently from contribution entries.
- Apply early discounts and late fees once per obligation, not once per partial payment.
- Support cash and non-cash contributions with pending, confirmed, disputed, and voided states.
- Preserve confirmed records through immutable activity entries rather than hard deletion.
- Retain the complete record when a stay ends.
- Create a private GitHub repository and a linked Vercel project only during the authorized execution phase.
- Keep automated money movement out of this MVP.

### Non-functional requirements

- Money stored as integer minor units and rounded deterministically.
- Calendar dates stored as `YYYY-MM-DD` with a named stay timezone.
- Runtime argument and return validation on all public Convex functions.
- No secrets, deployment keys, tokens, or production identifiers committed to Git.
- Keyboard-accessible controls, visible focus, minimum 44px touch targets, and screen-reader labels.
- Responsive behavior down to 320px width.
- Development, preview, and production data remain isolated.
- Production and preview builds fail closed when required environment variables are missing.
- Confirmed financial history remains recoverable and auditable.
- Lightweight CI because the GitHub account has previously exhausted included Actions minutes.

### Good-to-haves

- JSON or CSV stay export.
- Email notifications for invitations and confirmations.
- Recurring chores.
- Optional PostHog product analytics with privacy-conscious event design.
- Sentry error reporting before public beta.
- Native Expo client after the web MVP proves usage.

### Stack and architecture context

- Stack: Next.js App Router, TypeScript, React, Convex, Clerk, Vitest, `convex-test`, Vercel, GitHub.
- Boundaries: React owns presentation and temporary form state; Convex owns durable state, authorization, transitions, and balance calculations; Clerk owns identity only.
- Integrations: Clerk JWT validation in Convex, Vercel Git deployments, Convex development/preview/production deployments.
- Repository shape: one Next.js repository initially. Do not add Turborepo until a native client creates actual workspace pressure.
- Payment boundary: contribution entries describe externally completed payments or agreed non-cash value. Kouchd does not collect, hold, transfer, or pay out funds in this MVP.

### Unknowns and assumptions

- Unknown: exact Vercel team scope available during execution.
- Unknown: exact Convex team and Clerk account available during execution.
- Unknown: whether `kouchd.com` or `kouchd.app` has been purchased since availability was checked.
- Assumption: GitHub owner remains `lwhite702`.
- Assumption: the repository and cloud projects should remain private during MVP development.
- Assumption: email code or magic-link sign-in is the initial Clerk method.
- Assumption: production authentication will wait for a verified custom domain if Clerk cannot use the default Vercel domain.
- Assumption: the existing prototype contains demo-only local data and requires no cloud migration.

## Iteration layering

### Iteration 1: Prove one authenticated shared stay

- Outcome: a host can sign in, create a stay, invite a guest, and see the guest accept the same terms from another account on a deployed preview.
- Scope: project migration, authentication, user records, stay membership, invitations, versioned terms, and one verified preview deployment.
- Deferred: obligations, contributions, chores, check-ins, notifications, and marketplace behavior.

### Iteration 2: Complete the stay-management loop

- Outcome: both members can manage obligations, contributions, chores, check-ins, and end-state history with correct permissions and calculations.
- Scope: pricing, ledger state machine, chores, activity, ending a stay, common loading/error/empty states, and automated tests.
- Deferred: real payment processing, public listings, identity verification, reviews, and messaging.

### Iteration 3: Harden and prepare for controlled beta

- Outcome: the production deployment has verified access control, recovery paths, observability, responsive QA, and documented operating procedures.
- Scope: security review, end-to-end tests, accessibility pass, backups/exports, Sentry, cost limits, deployment documentation, and production verification.
- Deferred: native apps and marketplace expansion.

## Vertical slices

### 1. Preserve the prototype and establish the typed application shell

- Value: preserves the working product concept while giving future changes a maintainable foundation.
- Work: capture the current prototype as the first commit and tag `prototype-v0.1.0`; migrate the interface to Next.js App Router and TypeScript on `feat/production-foundation`; preserve responsive layout, navigation, forms, PWA metadata, and pricing behavior; add environment validation and a production-safe `.gitignore` and `.env.example`.
- Dependencies: exact local workspace confirmed clean enough to build from; GitHub creation remains deferred until shipping authorization.
- Acceptance: the Next.js version reproduces dashboard, contributions, chores, and stay screens; existing pricing and ending-stay tests pass in the new test runner; no production secrets exist in the tree.
- Verification: install from lockfile, run lint, typecheck, unit tests, production build, and visual comparison at 320px, 768px, and desktop widths.
- Change Review focus: visual regressions, accidental loss of PWA behavior, client/server boundary mistakes, and secret handling.

### 2. Deliver authenticated host-to-guest invitation and membership

- Value: two real people can share one stay without exposing records to anyone else.
- Work: create Clerk integration, Convex user synchronization, `stays`, `memberships`, and `invites`; issue expiring single-use invite tokens; build host creation and guest acceptance UI; require membership helpers in every stay query and mutation.
- Dependencies: Slice 1; confirmed Clerk and Convex account scopes; development credentials.
- Acceptance: a host creates an invitation; a different account accepts it once; expired and reused links fail safely; a third account cannot read or mutate the stay; invite tokens are not stored in plaintext.
- Verification: `convex-test` authorization matrix, browser test with host/guest/outsider accounts, and inspection of stored invite records.
- Change Review focus: authorization, token exposure, replay, enumeration, and route protection.

### 3. Activate a stay through mutually accepted versioned terms

- Value: both people can point to the same accepted dates, pricing, boundaries, and timing rules.
- Work: add `terms` versions and acceptance records; port the agreement form; keep a stay pending until both memberships accept the current version; create a new version when accepted terms change; reset acceptance without erasing prior versions.
- Dependencies: Slice 2.
- Acceptance: both parties see identical terms; one acceptance does not activate the stay; both acceptances activate it; editing accepted terms returns it to pending; historical versions remain readable.
- Verification: transition-table unit tests, `convex-test` mutation tests, and a two-account browser flow.
- Change Review focus: stale acceptance, concurrent edits, permission boundaries, and history retention.

### 4. Generate obligations and calculate the shared balance

- Value: daily and weekly charges produce a predictable amount due without split-payment fee bugs.
- Work: add `obligations`; generate periods from accepted terms; store integer cents; prorate final weekly periods; apply an early discount only when the qualifying obligation is fully satisfied by its threshold; apply one late fee after the grace period; support fee waiver as an audited event; display charges, credits, adjustments, and overpayment credit separately.
- Dependencies: Slice 3 and finalized business-rule fixtures.
- Acceptance: inclusive daily periods, weekly periods, partial final weeks, early qualification, grace periods, one-time late fees, fee waivers, and overpayments match approved fixtures to the cent.
- Verification: table-driven pricing tests, property tests around date boundaries, and server/client total comparison.
- Change Review focus: rounding, timezone handling, idempotency, partial payments, rule snapshots, and unauthorized waivers.

### 5. Deliver the confirmed contribution ledger

- Value: cash, groceries, supplies, labor, and other agreed help become a trustworthy shared record.
- Work: add contribution state transitions `pending`, `confirmed`, `disputed`, and `voided`; allocate confirmed credits to obligations; require the other member to confirm entries created by one member; replace deletion with audited voiding; expose clear pending and dispute states in the UI.
- Dependencies: Slice 4.
- Acceptance: pending and disputed entries never change confirmed balance; a creator cannot self-confirm; confirmed entries cannot be hard-deleted; voiding creates an activity record and recalculates affected obligations atomically.
- Verification: state-machine tests, authorization tests, concurrent confirmation test, and two-account browser demonstration.
- Change Review focus: self-confirmation, race conditions, silent balance changes, destructive mutations, and audit completeness.

### 6. Deliver shared chores, check-ins, and activity

- Value: everyday household responsibilities remain visible without mixing chores into money calculations.
- Work: add chore creation, assignment, completion, reopening, and voiding; add scheduled check-ins; produce immutable activity entries for meaningful actions; preserve current friendly copy and filters.
- Dependencies: Slice 2; can begin after membership contracts stabilize, but integration waits for Slice 5 activity conventions.
- Acceptance: host and guest can see shared chores in real time; role restrictions are enforced; repeated completion commands are idempotent; chore value never affects balance unless separately entered and confirmed as a contribution.
- Verification: mutation tests, idempotency tests, real-time two-session browser check, keyboard navigation, and screen-reader label review.
- Change Review focus: role rules, duplicate activity, hidden monetary side effects, and accessibility.

### 7. End a stay without losing or rewriting history

- Value: both members retain the agreement and ledger after the temporary stay ends.
- Work: implement `active` to `ended` transition; prevent new obligations after the end date; retain terms, obligations, contributions, chores, and activity; allow post-stay settlement entries with explicit labeling; provide a basic JSON or CSV export if it fits without delaying the retention contract.
- Dependencies: Slices 3 through 6.
- Acceptance: ending is idempotent; records remain readable by both members; no history is hard-deleted; new ordinary chores and terms edits are blocked; authorized settlement corrections remain audited.
- Verification: end-state integration tests, before/after record counts, export validation if included, and recovery review.
- Change Review focus: data loss, post-end permissions, unexpected recalculation, and retention.

### 8. Create GitHub, Convex, Clerk, and Vercel production foundations

- Value: the reviewed application has an owned repository, isolated environments, preview verification, and a controlled production path.
- Work: create private GitHub repository `lwhite702/Kouchd_Primary`; push preserved history; configure main ruleset; create Convex development and production deployments plus preview key; create Clerk application; create Vercel project `kouchd` linked to GitHub; scope environment variables correctly; configure `npx convex deploy --cmd 'npm run verify && npm run build'`; deploy and verify preview; merge only after review; attach a verified custom domain before enabling production Clerk authentication.
- Dependencies: explicit execution authorization, confirmed account/team scopes, Slices 1 through 7 reviewed, and domain ownership for production auth.
- Acceptance: repository is private; `main` is protected from force-push and deletion; pull requests receive Vercel checks; preview and production use different Convex deployments and credentials; the preview passes host/guest/outsider tests; production is not exposed with incomplete authentication.
- Verification: inspect GitHub remote and ruleset, Vercel project linkage and deployment logs, Convex deployment targets, Clerk allowed origins, environment-variable scopes, preview smoke tests, and production logs after release.
- Change Review focus: account ownership, secret scope, preview-to-production data leakage, custom-domain authentication, rollback, and deployment proof.

## Verification gates

1. Foundation gate: lint, typecheck, unit tests, build, and responsive visual comparison pass before cloud services are connected.
2. Authorization gate: host, guest, outsider, expired invite, and replay cases pass before terms work continues.
3. Terms gate: every state transition and terms-version race has a deterministic test.
4. Financial gate: approved fixtures match backend and frontend results to the cent.
5. Ledger gate: no pending, disputed, or self-confirmed contribution can affect confirmed balance.
6. Retention gate: ending a stay preserves document counts and accepted terms.
7. Review gate: independent change review reports no unresolved P0 or P1 findings.
8. Shipping gate: preview evidence, environment isolation, account ownership, custom domain, and rollback path are confirmed before production.

## Risks and dependencies

- Custom domain ownership may block production Clerk authentication. Mitigation: verify or acquire the selected domain before production, while continuing development with Clerk development settings.
- Financial terminology can create false expectations about tenancy or enforcement. Mitigation: call records contributions and agreements, avoid claims that Kouchd overrides legal rights, and keep enforcement out of scope.
- Early-discount semantics are currently underspecified. Mitigation: implementation must freeze `earlyDiscountDays`, percentage, full-payment qualification, and rounding fixtures before Slice 4 mutation.
- Convex preview deployments are beta. Mitigation: keep previews free of production data, verify cleanup behavior, and retain a shared staging fallback.
- Existing GitHub Actions minute constraints could make duplicate CI expensive. Mitigation: run verification in the Vercel build and require its GitHub check instead of adding a second broad Actions workflow.
- Local prototype data has no migration path. Mitigation: treat it as demo-only and explicitly reset it when the shared backend is introduced.
- Confirmed records are sensitive housing and financial context. Mitigation: least-privilege membership checks, no public addresses, no analytics payloads containing notes, and export access limited to stay members.

## Handoff packet

- Source skill: `task-creation`
- Target skill: `implementation`
- Goal: migrate the approved Kouchd prototype into the typed local foundation in Slice 1 without making external account changes.
- Evidence: approved stack and deployment plan; current repository has no commits and contains the local vanilla MVP plus seven passing domain tests from the previous build pass.
- Files: current Kouchd project is mutable during execution; `.git` history, credentials, user Library items, and unrelated workspaces are protected.
- Risks: all current paths are untracked; cloud scopes and domain ownership remain unverified; the latest user instruction still limits work to planning.
- Next check: re-run the isolation gate, capture dirty state, and confirm that planning-only mode has been lifted before the first implementation or external mutation.
- Overrides: none.

## Checkpoint

- Current skill: `task-creation`
- Completed: approved product and technical direction converted into eight vertical slices with acceptance criteria, verification gates, dependencies, risks, and a complete implementation handoff packet.
- Blocked by: planning-only constraint remains active until the user explicitly authorizes execution.
- Next check: implementation isolation gate and exact GitHub, Vercel, Convex, and Clerk scope inspection.
- Action: ask user.
- Todo tail: Next / upcoming task: begin Slice 1 after explicit authorization to leave planning mode.
