# Internal change log

Internal engineering record. This file is excluded from Mintlify navigation and is not a public product changelog.

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
