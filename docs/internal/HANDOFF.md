# Kouchd help center and repository-policy handoff

**Issue:** [WRE-238](https://linear.app/wrelik/issue/WRE-238/kouchd-update-help-docs-and-tooltips-for-10-rc-status-app-support)
**Task branch:** `codex/wre-238-1-0-rc-help-and-tooltips`
**Canonical repository:** `https://github.com/lwhite702/kouchd_primary`
**Task worktree:** `/Volumes/Projects/CodexWorktrees/kouchd-wre-238-help-tooltips`
**State:** Local task branch ready for review.

## Summary of changes

- Created dedicated app support guide `help/support/app-support.mdx` detailing support boundaries: `help@kouchd.com` provides technical app assistance, while Kouchd explicitly does not mediate roommate conflicts, stay disputes, or outside financial disagreements.
- Registered `"help/support/app-support"` in `docs.json` navigation under `"Support"` and added `"App support"` to footer navigation.
- Updated `help/product/roadmap.mdx` and `help/product/changelog.mdx` to reflect Version 1.0 Release Candidate (`1.0.0-rc.*`) state:
  - Documented merged capabilities: delayed guest agreement auto-acceptance, synced profile names, Loops newsletter, Liquid Glass motion polish, and streamlined entry.
  - Documented remaining pre-lock launch merges (dependency hardening, package maintenance, release readiness).
  - Outlined post-1.0 exploration (shared grocery receipt scanning, App Store distribution, recurring chore rotation) without promised ETAs.
- Updated plain-language guidance across `help/index.mdx`, `index.mdx`, `help/legal-trust/stay-agreements.mdx`, `help/legal-trust/terms-of-service.mdx`, `help/hosts/getting-started.mdx`, `help/guests/joining-a-stay.mdx`, `help/hosts/ledger-management.mdx`, and `help/guests/logging-contributions.mdx`.
- Refined all in-app tooltips and help tips across `components/authenticated-home.tsx`, `components/marketing/marketing-header.tsx`, and `components/household/payment-options.tsx` to use friendly, plainspoken, non-technical terminology.
- Added `appSupport` URL to `lib/help-links.ts`.
- Validation: `mintlify validate` and `mintlify broken-links` passed with zero errors.

---

# Previous handoff (WRE-226)
**Task branch:** `codex/wre-226-modular-ios-help`
**Pull request:** [PR #63](https://github.com/lwhite702/kouchd_primary/pull/63)
**Canonical repository:** `https://github.com/lwhite702/kouchd_primary`
**Task worktree:** `/Volumes/Projects/CodexWorktrees/kouchd-wre-226-modular-ios-help`
**State:** Open PR #63 under review; CI passing; merge, deployment, and live publication remain unverified action gates.

## Summary of changes

- Partitioned single 120-line iOS guide into 3 modular topic pages matching Kouchd's help pacing:
  - `help/ios/using-kouchd-on-ios.mdx`: Overview, 4 tabs, joining a stay, reminders.
  - `help/ios/ledger-and-contributions.mdx`: Outside payments, recording, confirming/disputing, voiding.
  - `help/ios/chores-and-stay.mdx`: Household chores, occupied nights, stay guidelines, house notes.
- Corrected payment handle examples to strictly supported providers (`PayPal`, `Cash App`, `Apple Pay`, `Zelle`).
- Preserved financial disclosure: contribution records are shared records and do not prove money moved.
- Updated root `docs.json` navigation under "iPhone app".
- Updated cross-links across web guides to point directly to specific iOS topic pages.
- Validation: `mintlify validate` and `mintlify broken-links` passed with zero errors.

---

# Previous handoff (WRE-145)
**Task branch:** `codex/wre-145-kouchd-help-center-refresh`
**Canonical repository:** `/Volumes/Projects/Projects/kouchd_primary`
**Task worktree:** `/Volumes/Projects/CodexWorktrees/kouchd-help-center-refresh`
**State:** Local task branch; not pushed, merged, deployed, or published.

## Source state reviewed

- Task branch includes current `origin/main` through `cbb34a3` and the Kouchd feature branch through `36d136d` (`feat: support individual guest agreements and payments`) for current source review.
- Feature-branch behavior is not represented as released. Public current help and public changelog are kept distinct from roadmap items.
- The canonical checkout already had unrelated uncommitted/untracked work. It was left untouched; all task edits are isolated in the worktree above.
- Kouchd package version observed: `0.3.0` in `package.json`. No checked-in automated version bump, tag, or release workflow was found in the inspected repository state. Do not claim DRX's automatic version/deployment policy applies.

## Files and outcomes

- Root `AGENTS.md`: adapted repository management rules, Kouchd brand/voice guidance, conservative versioning/release integrity, and Mintlify workflow.
- `help/AGENTS.md`: public-content conventions and source/preview/validation/publish handoff guidance.
- Root `docs.json`: roadmap/changelog/notifications navigation and footer links.
- `help/`: refreshed overview, quickstart, guest invitation/contribution, host contribution review, privacy, and notification guides; added roadmap and public changelog.
- Root `index.mdx`: replaced the starter Introduction template with the actual help-center landing content and direct links to key guides.
- `docs/internal/CHANGELOG.md`: internal task change record.

## Validation and remaining gates

- No push, PR, merge, deployment, live Mintlify edit, or publication has occurred. Those are separate approval/action gates.
- Before publishing, review the Mintlify preview, exact public copy, links, and navigation; confirm public changelog claims against the released commit. Keep the WRE-145 issue open until review/publish disposition is known.

### Validation result (2026-09-25)

- `mintlify validate` — passed.
- `mintlify broken-links` — passed; no broken links found.
- Root `docs.json` parsed successfully; `git diff --check` passed.
- `npm run lint` and `npm test -- --run` could not start because npm dependencies are not installed in this worktree (`eslint` and `vitest` missing). `npm run typecheck` ran without dependencies and reported missing project modules/types across the application, so it is not a meaningful code check. No application source was changed.
- No Mintlify preview or live publish was performed. The browser’s currently open help page is the production help domain and was not edited through the dashboard.

### Commit

- Documentation and policy content commit: `ca75c56` (`docs(WRE-145): align Kouchd help and repository policies`).
- The handoff record is updated immediately afterward to capture that content commit and the verified gates.

### Follow-up: root route

- The root route fix is part of the follow-up task commit; re-run Mintlify checks before handoff.

### Publish preparation (2026-09-28)

- Rebased only the three task documentation commits onto current `origin/main`, which includes the previously separate feature changes. The task branch now contains only the documentation/policy commits plus the follow-up updates; no application code is included in this PR.
- Vercel reports the Kouchd production deployment for main commit `3b6ae85` as `READY`. Therefore individual guest agreements and host-shared external payment options are described as available. Kouchd still does not process payments.
- Current main advanced to `df5e214`, also deployed `READY`, adding progressive payment reminders. Public notification help, roadmap, and changelog now describe reminder timing in relation to due dates, accepted grace periods, late-fee terms, ledger state, channel preferences, and provider availability.
- Updated the roadmap, public changelog, and host setup/pricing guides to match deployed behavior. The app source includes legal/consequence statements in some reminder templates that are not substantiated by corresponding terms or enforcement behavior inspected; public help deliberately omits those statements pending separate product/legal review.
- User explicitly requested publication on 2026-09-28. PR/merge and Mintlify live verification remain to be completed.
- Follow-up route verification: `mintlify validate` passed; `mintlify broken-links` found no broken links; root `docs.json` parsed and `git diff --check` passed.
- Fixed all overview links to use the `/help/...` prefix that Mintlify requires for nested pages. The root-level `quickstart.mdx` starter was also replaced with useful setup guidance.
- Latest checks passed: `mintlify validate`, `mintlify broken-links`, root `docs.json` parsing, and `git diff --check`. Lint/typecheck/tests remain unavailable because dependencies are absent in this worktree; this PR changes no application code.


### Publication completed (2026-09-28)

- PR [#7](https://github.com/lwhite702/kouchd_primary/pull/7) merged to `main` as `d2f74f33bef7729398ea14bbf960326849bf05e2`. This supersedes the earlier pending-publication notes above.
- Live `https://help.kouchd.com/help` returned HTTP 200. Mintlify-rendered page metadata reports `dateModified` 2026-09-28T04:53:09.306Z and shows the Kouchd Help Center content.
- PR Vercel and CodeRabbit checks passed. Mintlify marks the PR-level deployment check skipped; main-source sync was verified against the live page after merge.
- WRE-145 documentation, repository policy, and help-center publication are complete. A separate product/legal review remains advisable for unsupported legal/consequence language in reminder templates; public help omits those claims.

### Guest payment schedule work (2026-09-28)

- Worktree: `/Volumes/Projects/CodexWorktrees/kouchd-guest-payment-schedule`, branch `codex/guest-payment-schedule`, implementation commit `2cc47a3`, rebased onto latest `origin/main`.
- Added daily/weekly choice at initial guest acceptance, weekly weekday selection, per-guest pending schedule requests, host approval/rejection, a $0 due-balance gate, a 14-day approved-change cooldown, and prorated obligation changes.
- Fixed single-guest legacy obligation and contribution handling in schedule approval and its due-balance gate. Host-edited weekly agreements now require and save a payment weekday.
- Added per-guest host-recorded overnight billing for nonconsecutive nights, with daily amounts or prorated weekly amounts grouped into ledger periods. The guest agreement and onboarding explain that only host-recorded completed overnights are billed.
- Updated the product roadmap to identify the schedule and occupancy workflows as in progress. The work is not merged, deployed, or published; public guides and changelog do not claim availability.
- `tsc --noEmit`, targeted ESLint, and `git diff --check` passed after final edits. No tests were added or run.
- Linear issue association remains unresolved because only the Wrelik team is available in the connected workspace; do not create a Kouchd issue under Wrelik.

### Mintlify Help Center color and visual refresh (2026-10-05)

- Task branch: `codex/mintlify-color-refresh`.
- User request: "Add more color to the kouchd mintlify app" followed by explicit approval to "merge".
- Configuration: Added `background.decoration: "gradient"` to `docs.json` for warm brand green ambient gradient styling.
- Content styling: Upgraded guides across `index.mdx` and `help/` with `<Tip>`, `<Info>`, `<Note>`, `<Warning>`, `<Check>`, `<Steps>`/`<Step>`, and cross-linking `<CardGroup>` components.
- Verification: `mintlify validate` passed, `mintlify broken-links` passed (zero broken links), `docs.json` parsed successfully, and `git diff --check` passed cleanly.
### Landing-page review fixes (2026-10-09)

- Branch: `codex/WRE-177-landing-claims`; source PR: [#26](https://github.com/lwhite702/kouchd_primary/pull/26). The earlier PR #25 was based on a pre-merge snapshot and conflicted with current `main`; it should be closed after this replacement PR is verified and merged.
- Changes: corrected unsupported Ledger creator attribution and guest arrival-window claims; added an expandable tablet navigation menu; prepared version `0.4.1` patch metadata and internal release notes to satisfy the repository release gate.
- Evidence: `npm run release:check` passed against the last complete baseline `3a0c559`; version sync, typecheck, all 61 tests, Next.js production build, and release gate passed. Lint reports 15 existing warnings and no errors. Release-gate fallback now finds the nearest versioned first-parent ancestor when the base snapshot has no version file, with a regression test.
- Release state: no production deployment, tag, public changelog entry, or customer availability is verified. Public Mintlify content was not changed.

### Help Center documentation overhaul and screenshot refresh (2026-10-19)

- Branch: `codex/help-documentation-refresh`; source PR: [#47](https://github.com/lwhite702/kouchd_primary/pull/47).
- Commits: `83c59da` (initial comprehensive overhaul and screenshot refresh), `4bf327c` (remediation of 4 PR code review findings).
- Changes:
  - Overhauled 10 core Help Center guides in `help/` for brand voice consistency (warm, homey, calm, capable), sentence-case typography, and structured Mintlify components (`<Steps>`, `<Tip>`, `<Info>`, `<Note>`, `<Warning>`, `<Check>`).
  - Captured and checked in 7 privacy-safe UI screenshots in `help/images/` adhering to the Brand Building / V2.1 design system with synthetic names and amounts (`Jordan Taylor`, `Alex Rivera`, `Maple Cottage Stay`, `KCH-OAK-4821`).
  - Removed orphaned and redundant file `help/using-notifications.mdx`.
  - Synchronized `help/product/changelog.mdx` with verified October 2026 product capabilities.
  - Resolved 4 PR code review findings: aligned pre-join referral preview steps with actual fields; clarified membership creation vs. post-join terms acceptance button (`Accept Terms & Enter Household`); removed unenforced periodic reward cap claims; and documented the web-supported ledger recovery flow without unsupported dispute controls.
- Evidence:
  - `mintlify validate` passed with zero errors.
  - `mintlify broken-links` passed with zero broken links found.
  - `git diff --check` passed cleanly.
  - All GitHub Actions and Vercel preview CI checks on PR #47 passed successfully.
- Release state: PR #47 was squash-merged to `main` as commit `20667da` on 2026-10-19. Live Mintlify Help Center returned HTTP 200 at `https://help.kouchd.com/help`.

### iOS Help Guidance and UI Screenshots (2026-10-24)

- Linear issue: [WRE-209](https://linear.app/wrelik/issue/WRE-209/kouchd-add-ios-help-guidance-and-brand-aligned-mobile-images-to-help)
- Branch: `codex/wre-209-ios-help-guidance` in isolated worktree `/Volumes/Projects/CodexWorktrees/kouchd-wre-209-ios-help`.
- Changes:
  - Added dedicated guide `help/ios/using-kouchd-on-ios.mdx` covering native iPhone app workflows (Home, Ledger, Chores, Stay, outside contributions, late fees, Apple Sign-In, and reminders).
  - Added "iPhone app" navigation group to `docs.json`.
  - Added "On iPhone" accordion walkthroughs to `help/quickstart.mdx`, `help/guests/logging-contributions.mdx`, `help/hosts/ledger-management.mdx`, `help/hosts/house-rules-and-chores.mdx`, and `help/guests/joining-a-stay.mdx`.
  - Generated and verified 5 high-resolution Retina mobile device mockups in `help/images/` (`ios-home-overview.png`, `ios-ledger-screen.png`, `ios-record-contribution.png`, `ios-chores-screen.png`, `ios-stay-guidelines.png`) matching the Brand Building design system and native SwiftUI source.
  - Preserved release policy: documentation-only changes do not bump SemVer; public guides note that the native iOS app is in active development and not yet available on the App Store.
  - Addressed PR #62 review findings: clarified that dispute and void controls are native-only while core workflows are shared; corrected credit application to cover the oldest outstanding charge (including upcoming charges); and aligned the post-sign-in onboarding label to "Join with a code".
- Validation:
  - `mintlify validate` passed cleanly (`success build validation passed`).
  - `mintlify broken-links` passed cleanly (`success no broken links found`).
  - `git diff --check` passed with zero formatting errors.
- Release state: Ready for pull request review and merge approval.

### Delayed agreement acceptance and guest profile controls (2026-10-20)

- Linear issue: WRE-216.
- Scope: host-configurable 1–720 hour delay (24-hour default) or off; guest manual acceptance; system approval labels/timestamps; agreement activity audit; host-only preferred-name editing and guest contact details.
- Current task branch: `codex/WRE-216-guest-agreement-profile-pr`.
- Source commit: `908c040` (`feat(WRE-216): add delayed guest agreement auto-accept`).
- Pull request: [#57](https://github.com/lwhite702/kouchd_primary/pull/57), open against `main`; release-integrity, Vercel, and AI review checks are pending.
- Verification on current `main`: TypeScript syntax parsing, `git diff --check`, and `node scripts/release-version.mjs check` passed. Full typecheck ran for more than three minutes without output and was interrupted; tests were not run.
- Release state: branch-only; not merged, deployed, or publicly available.

## WRE-224 — launch candidate, October 22, 2026

Continue on `codex/WRE-224-launch-readiness` in the isolated WRE-224 checkout,
with the matching marketing branch. Preserve existing dirty worktrees. Candidate
version 0.7.0; production/store availability remains unverified. Read
`docs/internal/LAUNCH_READINESS.md` for the original PR dispositions, approved
account-wide limits, validation and promotion gates. Never promote the local
anonymous Convex configuration to production.

### WRE-224 launch candidate — October 23, 2026

See [the launch checklist](LAUNCH_READINESS.md) for the current candidate, PR
dispositions, source checks, production host test, rollout/rollback and remaining
provider/device/account gates. Candidate 0.7.0 is local and unreleased; a separate
0.6.9 branch contains the urgent dependency patch. Shared dirty worktrees remain
untouched. No push, merge, production deployment or publication is authorized.
