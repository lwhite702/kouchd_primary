# Kouchd launch candidate — WRE-224

Status: in development; **not approved for public launch**. No push, merge,
production deployment, public documentation publication, or store upload is
included in this task without separate action-time approval.

## Approved decisions (October 22, 2026)

- Prepare web, iOS, marketing, and help for public launch; fix blockers first.
- Starter: one active stay and one active guest membership. Plus: three active
  stays and three active guest memberships total across the host billing account.
  Pending stays reserve capacity, including when agreements are updated.
- Guests remain free. Existing over-limit records and access survive downgrade
  and expiry. Only additional usage is blocked. Preserve verified legacy Pro
  access; Pro is unavailable for new purchases.
- Purchases offered by this candidate are monthly/yearly Plus. The newly
  configured lifetime product needs separate entitlement and release validation.
- Keep contributions as records; Kouchd does not move household money.
- Canonical shared context: [Kouchd Notion project](https://app.notion.com/p/3fe11f2a539081a2b2acd73ce496ef3c).

## PR disposition and integration

The source fixes are prepared together on `codex/WRE-224-launch-readiness`,
with the marketing changes on `codex/WRE-224-marketing-launch`. These candidates
supersede overlapping source patches for integration review; the existing PRs
remain open and unchanged remotely. Do not merge those PRs again after promoting
these candidates. If the original PRs are retained instead, transplant their
corrections and rerun each release gate against its predecessor before promotion.

| Existing PR  | Candidate disposition                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App #59      | Dependency patch incorporated; Vitest patched and ESLint config matched to Next. Release artifacts prepared with candidate.                                                          |
| Marketing #3 | Dependency patch incorporated. Removed redundant compression plugin and patched selector parser; audit rerun.                                                                        |
| App #54      | Retained one Next route; removed conflicting public file and changed regression. Optimized candidate GET and HEAD returned 200; GET matched the exact 54-byte nonce. |
| App #55      | Navigation patch incorporated; corrected shopping/check-in/schedule destinations and ended-stay updates.                                                                             |
| App #57      | Shared acceptance transaction; stable bounded schedule snapshot; reminder cancellation; system actor; guest propagation.                                                             |
| App #58      | Motion incorporated with reduced-motion and pre-iOS-26 fallbacks; release artifacts prepared.                                                                                        |
| App #56      | Superseded by the marketing Loops form endpoint. Its unreachable UI and unauthenticated contact-upsert API are excluded.                                                             |

WRE-221 working changes were copied from the existing worktree without modifying
it and reconciled with navigation. WRE-222's imported simulator implementation
contains a test-only code hint and a different authentication surface; it was
not copied into production. The candidate retains Clerk's authentication UI and
adds keyboard dismissal. Field focus, password submit, Apple login and native
account deletion need authenticated verification.

## Implementation boundaries

- Web: account shell, lazy feature screens and forms, shared types and state hook.
  `obligations:summary` supplies guest-scoped full totals and a small dashboard
  preview. Full ledger subscriptions mount only while Ledger is visible.
- Native: on-screen schedule, occupancy, reward-rule, shopping and check-in
  subscriptions, with account/stay/guest and feature-generation guards. Existing
  endpoints remain available to older clients. Typed ledger/agreement/subscription decoders
  ignore additional server fields.
- Backend: parallel member joins and explicit return contracts. Manual and
  automatic acceptance share the same financial replacement transaction. The
  4,096-row replacement safeguard fails atomically with retained records rather
  than truncating history. Standard stay terms permit at most 730 days.
- Privacy: host-only guest contacts, owner/host personal-shopping activity,
  scrubbed telemetry URLs and request contents, session recording disabled.
- Optional integrations remain disabled without verified configuration.

## Rollout and compatibility gates

1. Run all candidate checks and fresh code reviews. Record exact commits below.
2. Audit and backfill household ownership in bounded, resumable batches using
   `householdMigrations:backfillHouseholdAccounts`; audit all returned pages.
3. Deploy additive backend fields/indexes and new endpoints first. Verify old
   native clients, then promote the candidate clients. Do not deploy from a
   checkout containing the anonymous local validation deployment.
4. Verify production RevenueCat app identity, webhook authentication and expected
   environment, monthly/yearly prices, purchase/restore, cancellation, expiry,
   refund, duplicate and out-of-order events, and account switching.
5. Enable `SUBSCRIPTION_LIMITS_ENFORCED=true` in the intended Convex deployment
   only after ownership and billing checks. It defaults off in this candidate.
6. Newsletter: verify the confirmed, subscribed website-source segment, double opt-in, existing opt-out
   behavior and provider rate limiting before setting `PUBLIC_NEWSLETTER_ENABLED`.
   No server API key is used by the public marketing form.
7. Run authenticated host/two-guest/unrelated-household/admin browser and native
   journeys. Include invitation return, relaunch, network loss, fast switching,
   ended stays, VoiceOver, Dynamic Type, dark appearance and reduced motion.
8. Verify Apple sign-in, account deletion, entitlements, associated domains,
   privacy disclosures, store products and metadata. Choose a fresh build number
   from App Store Connect; install a signed build on a physical device.
9. Obtain separate promotion approvals, then verify actual deployments and store
   processing. Publish customer changelog/help only after released behavior is
   verified. Record deployment/build IDs and rollback owners.

## Evidence

- Isolated checkouts preserve the dirty canonical and WRE-221 worktrees. The
  canonical Git fetch failed because of a duplicate/damaged ref; no refs were
  deleted to repair it. The app's local main baseline is `e89c561`.
- Local anonymous Convex backend compiled and accepted the additive schema and
  functions. This proves local deployment only; production is unchanged.
- Automated backend tests include 730-day replacement, idempotence, stale and
  disabled offers, manual/system attribution, guest privacy, capacity and expiry.
- Synthetic 730-row financial payload: full ledger 240,111 bytes; dashboard
  summary 2,009 bytes (about 99% smaller). The fixture includes 150 contribution
  records; totals include all records rather than only the latest 100.
- RevenueCat read-only catalog verified October 22: web monthly 6.99 USD and
  yearly 69.99 USD, with a one-week trial configured on yearly only. Catalog
  state does not establish successful checkout or store availability.
- Full and runtime app dependency audits: zero advisories after Next.js 16.4.3,
  matching lint configuration and DOMPurify 3.4.17. A separate 0.6.9 security
  branch is prepared to avoid waiting for the wider 0.7.0 refactor.
- Marketing audit after dependency cleanup: zero advisories.
- App: typecheck, 142 tests across 28 suites, production build and release-artifact
  gate passed on October 23. Lint has zero errors and 15 existing warnings.
- Native: simulator build and 10 financial/agreement/subscription unit tests
  passed; two introduction UI tests passed in light and dark appearance. Fixed
  the primary button label contrast seen in the introduction screenshots.
- Help: Mintlify validation and broken-link checks passed. Public changelog
  remains unchanged because this candidate has not been released.
- Production host browser: user approved a synthetic $0 stay. Created and
  completed a chore, created/edited/checked a shopping item, saved synthetic
  guide information, confirmed empty guest-dependent controls, ended the stay,
  reopened retained read-only history, and verified its old invitation is
  unavailable. No invitations were sent, purchases made, or real guest data used.
  This exercised the deployed app, not the unpromoted candidate source.
- Signed physical build attempted with existing credentials and cached profiles.
  Blocked: the installed provisioning profile lacks Sign in with Apple and
  `com.apple.developer.applesignin`. No Apple capability/profile changes were
  made. Refresh the approved profile after the capability is enabled, then
  repeat signed installation and authenticated device journeys.
- Fresh CodeRabbit reviews and exact local commits are recorded at handoff.
  Earlier issues corrected duplicate-submit guards, mixed RevenueCat offerings,
  legacy agreement replacement, telemetry scrubbing, due counts, and provider
  configuration validation. The confirmation-dialog warning was checked against
  its owning component, which catches errors, retains input and dismisses only
  on success; the responsibility is documented in source.
- Only payload size was benchmarked quantitatively. Native subscription lifetime
  and web screen scoping have source/tests evidence; screen latency, rendering,
  backend-read counts and interrupted-network behavior still need before/after
  runs against identical production-like datasets.

## Release record and rollback

| Layer       | Candidate                                                  | Verified released version | Rollback                                                                                                                                   |
| ----------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Web/backend | 0.7.0, local branch; exact commit pending                  | Not verified in this task | Restore previous verified deployment; disable new enforcement before reverting clients. Keep additive fields/indexes and retained records. |
| Marketing   | Local WRE-224 branch; exact commit pending                 | Not verified in this task | Restore previous verified static deployment; leave newsletter disabled.                                                                    |
| iOS         | Existing bundle `com.wrelikbrands.kouchd`; candidate 0.7.0 | Not verified in this task | Halt distribution, restore previous verified build if available; preserve compatible backend endpoints.                                    |

Public launch remains blocked until every required layer has evidence and no
critical/high product defects remain. Unavailable authenticated or physical-device
verification must be recorded as unverified, never inferred from unit tests.

## Review dispositions — October 23

Final source review iteration found two app issues: retained all optional guest
overrides and validated the merged terms, with a weekly-day regression; clarified
that the financial summary includes future scheduled periods rather than an
amount due today. The Ledger and native labels now say “Remaining scheduled”.
Initial and subsequent valid review issues are corrected. The confirmation-dialog
warning was disproved by its existing owning component; no errors are swallowed.

The security-only review raised one conditional classification issue. The source
diff is dependency-only and its 0.6.9 patch gate passed; existing baseline
Unreleased entries were preserved. See SECURITY_PATCH.md on that branch.

Marketing reviews also corrected Starter naming, recurring chore availability,
provider-priced copy/metadata, newsletter confirmation boundaries and policy dates.
All reviews apply to the prepared candidate diffs; original remote PR diffs were
not rewritten or reviewed again by CodeRabbit. Their replacement/closure awaits
the integration decision and explicit remote-action approval.
