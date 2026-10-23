# WRE-224 dependency security patch

Prepared independently from the launch refactor, from main `e89c561`.
Candidate version: 0.6.9. No push, merge, deployment, or store distribution.

Next.js 16.4.3 and DOMPurify 3.4.17 address the advisories observed on October 23.
The framework lint configuration matches Next.js. Compatible dependency updates
from PR #59 are included; do not remerge the overlapping dependency patch.

References:
- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://github.com/cure53/DOMPurify/security/advisories/GHSA-cg2g-xh64-v4q7

Validation results and exact commit are recorded at handoff. These checks prove
source readiness only. Production remains unchanged until separately approved.
Rollback: restore the previous verified deployment only after evaluating the
security exposure; prefer a forward patch. No schema or data migration is needed.

Validation (October 23): clean install; full release check including lint (zero
errors, 15 existing warnings), typecheck, 114 tests, production build and release
artifacts passed. Full audit: zero advisories.

CodeRabbit raised one release-classification issue. Verified as inapplicable:
`CHANGELOG.md` already contained those feature entries at base `e89c561`; this
diff adds only the dependency note. `scripts/release-gate.mjs` compares changed
paths and version with the base and requires a substantive unreleased note; it
does not classify unchanged historical entries. The exact 0.6.9 patch gate passed.
No historical release or availability claims were rewritten to silence review.
