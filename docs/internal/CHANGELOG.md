# Internal change log

Internal engineering record. This file is excluded from Mintlify navigation and is not a public product changelog.

## 2026-09-28 — Guest payment schedule choice and approval

- Added guest-selected daily or weekly billing at initial agreement acceptance, including an initial weekly payment weekday and clear rate/late-fee copy.
- Added host-reviewed schedule change requests with a zero due-balance gate, one approved change per 14 days, and prorated obligation handoff at the approval date.
- Added per-period weekly weekday alignment and a roadmap entry. This work is local to `codex/guest-payment-schedule`; it has not been pushed, merged, deployed, or published.
- TypeScript check passed. No tests were added or run.
- Linear issue association is pending: the connected workspace currently exposes only the Wrelik team, and the repository policy says not to misclassify Kouchd work under another product team.

## 2026-09-25 — WRE-145 documentation and policy refresh

- Fetched `origin` and integrated the current remote `main` updates into the task branch, then fast-forwarded the branch-only Kouchd product work through `36d136d` for accurate documentation review.
- Added Kouchd-specific agent policy, brand voice/design guidance, SemVer/release-integrity guidance, and a repository-based Mintlify management workflow.
- Refreshed public help for invitations, quickstart, contributions, host review, privacy, and notifications; added roadmap and public changelog pages and linked them through root `docs.json`.
- Public changelog is limited to verified currently available behavior. Branch-only work is identified as in development; no ETA or live publish is claimed.
- Validation and resulting task commit will be appended after checks.

### Follow-up: help center entry route

- Replaced the root Mintlify starter Introduction with a content-rich Kouchd help landing page linking to primary guides, notification settings, roadmap, and privacy guidance.
- Clarified in root and help-specific agent policies that the repository-root `index.mdx` supplies the actual Mintlify root route.

### Validation

- `mintlify validate` — passed.
- `mintlify broken-links` — passed; no broken links found.
- `docs.json` JSON parse and `git diff --check` — passed.
- Repository `lint`, `typecheck`, and unit tests were attempted but unavailable because this worktree has no installed npm dependencies (`eslint`, `tsc` dependency modules, and `vitest` missing). No application code changed.
- Root route follow-up passed `mintlify validate`, `mintlify broken-links`, `docs.json` JSON parsing, and `git diff --check`.

### Publish preparation — 2026-09-28

- Rebasing task-only documentation commits onto current `origin/main` after the feature branch's application commits were merged separately.
- Verified current app production deployment at Kouchd `main` commit `3b6ae85` (Vercel state `READY`). Updated public roadmap and changelog to reflect the deployed individual guest agreements and external payment options; in-app payment processing remains unavailable.
- Current main has since advanced to `df5e214`, also deployed `READY`, with progressive payment reminder logic. Added neutral public guidance about reminder milestones, accepted terms, ledger state, channel preferences, and service availability.
- Expanded host setup and terms guides for the shipped agreement and external payment workflows.
- Publication was explicitly approved by the user; no live help-center changes have occurred yet.
- The current reminder source contains some legal/consequence language that is not substantiated by the terms or enforcement code inspected. Public documentation intentionally describes only due-date/grace/ledger behavior; a separate product/legal review is recorded in the handoff.
- Latest checks passed: `mintlify validate`, `mintlify broken-links`, root `docs.json` parsing, and `git diff --check` after correcting nested `/help/...` links.


### Publication completed — 2026-09-28

- Merged [PR #7](https://github.com/lwhite702/kouchd_primary/pull/7) to `main` (`d2f74f33bef7729398ea14bbf960326849bf05e2`) and verified the live Help Center route returns HTTP 200 with updated Mintlify page metadata.
- Vercel preview and CodeRabbit passed; Mintlify PR check was skipped, so publication was confirmed by reading the live page after merge.
