# Kouchd help center and repository-policy handoff

**Issue:** [WRE-145](https://linear.app/wrelik/issue/WRE-145/kouchd-apply-repository-agent-policy-and-sync-mintlify-help-roadmap)
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
