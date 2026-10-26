<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent operating policy

## Scope and precedence

This file governs agent activity in the Kouchd repository. Read it before planning or changing files. A nested `AGENTS.md` may add stricter rules for its directory, but may not weaken this policy. Follow direct user instructions within their scope; do not infer approval to push, merge, deploy, publish, contact customers, expose secrets, or alter unrelated work.

## Project and source of truth

- Product: Kouchd, operated by Wrelik Brands LLC.
- Canonical repository: `https://github.com/lwhite702/kouchd_primary`.
- Source code and tests establish what is implemented. GitHub branch and release state establish what is integrated. Verified production behavior is a separate claim and must have direct evidence.
- Public help, roadmap, and customer changelog live in `help/` as Mintlify MDX. The canonical Mintlify configuration is the repository-root `docs.json`; the root `.mintignore` excludes application and internal `docs/` content.
- Internal setup notes, change history, and handoffs belong under `docs/` and must not be added to public Mintlify navigation.
- The Wrelik Linear workspace is used for scoped engineering work. Keep Kouchd issues clearly named for Kouchd; do not file them under another product's project. If an appropriate team/project cannot be identified, report that instead of misclassifying work.
- Figma holds design exploration. A Figma or feature branch is not proof that a design or capability has shipped.

## Required work protocol

1. Inspect the current directory, branch, remote, commit graph, staged/unstaged/untracked files, and worktrees before editing or pulling.
2. Preserve unrelated changes. When the shared checkout is dirty, use a separate worktree for task changes. Never reset, clean, overwrite, or stage broadly to make a checkout appear clean.
3. For material implementation, policy, help-center, roadmap, or changelog work, create or select a task-specific Linear issue before treating the change as in progress. Keep status aligned with actual verification and release state.
4. Use a short-lived `codex/` branch and include the Linear identifier in the branch and commit when one exists. Make small, task-scoped changes and stage only owned files.
5. Run checks appropriate to the change. Record which checks passed and keep source, test, provider, deployment, and recipient evidence distinct.
6. Review the exact diff before committing. Do not push, merge to the default branch, deploy, submit to an app store, publish the Mintlify site, or contact users without explicit action-time approval.

## Documentation and public claims

- Match help steps to current Kouchd labels and behavior. Use plain language, direct steps, and a warm, matter-of-fact voice.
- In the current web app, call the financial screen **Ledger**, the action **Add contribution**, and each saved entry a “contribution.”
- Update the relevant user guides when a released change affects a workflow, settings, permissions, or visible product behavior. Keep the public roadmap, changelog, and internal changelog/handoff in sync.
- Public changelog entries describe verified releases only. Mark branch-only capabilities as in development on the roadmap; do not imply availability or announce an ETA without approval.
- Do not claim Kouchd collects, holds, transfers, enforces, or processes payments. Contribution records do not prove that money moved.
- SMS is optional and requires explicit consent. Preserve the message-rate, frequency, STOP/HELP, privacy, and opt-out language. Do not claim delivery, carrier suppression, or provider configuration is verified without evidence.
- Do not invent pricing, testimonials, availability, legal interpretations, integrations, or product guarantees. If code, tests, legal copy, or approved direction conflict, state the conflict instead of choosing silently.

## Brand and product design

- Kouchd should feel warm, homey, calm, and capable: private shared living made easier to coordinate. Favor rounded organic shapes, soft curves, welcoming illustration, cream surfaces, forest-green anchors, and restrained lime accents. Keep product explanations as clear as the visual tone is inviting.
- Use Manrope for Kouchd brand and web product typography. For future native concepts, Manrope may carry the brand while navigation, sheets, and controls follow the platform conventions.
- Write in a plainspoken, respectful voice. Prefer everyday words, short active sentences, and practical reassurance. Avoid corporate jargon, hype, pressure, shame, or treating a guest like a debtor.
- Use “host”, “guest”, “stay”, and “contribution” consistently. Explain that a contribution is a shared record; never imply the record itself moves money.
- Keep visual examples inclusive, lived-in, and privacy-conscious. Use synthetic names and amounts. Avoid staged luxury imagery, public listing cues, fabricated social proof, or claims of guaranteed outcomes.

## Versioning and release integrity

- The root `VERSION` file is the canonical SemVer source for the Wrelik release workflow. Synchronize `package.json`, its lockfile, and every iOS marketing version with it. Keep the iOS build number independent and strictly increasing.
- **Version 1.0 Launch Feature Lock (`release/feature-lock.json`)**:
  - Kouchd is in the **Version 1.0 Release Candidate (`1.0.0-rc.*` / `1.0.x`)** phase. Once currently open pre-lock merges (listed in `release/feature-lock.json`) are completed, the Version 1.0 feature lock is strictly enforced on `main` and all launch branches.
  - **Only bug fixes, security patches, regression fixes, accessibility/stability patches, and documentation/release polish (`patch`, `rc`, or `none`) are permitted for the 1.0 launch version.**
  - **No new features may be added to the launch branch.** When a new feature is requested or proposed:
    1. Invoke the `v1-feature-lock` skill (`.agents/skills/v1-feature-lock/SKILL.md`).
    2. Record the capability on the public roadmap (`help/product/roadmap.mdx` under **In progress** or **Being explored**, without promised ETAs) and track it in Linear.
    3. Create and develop the feature exclusively in a **separate isolated git worktree** under `/Volumes/Projects/CodexWorktrees/` on a `codex/post-v1-*` branch so the launch checkout remains restricted to 1.0 RC stabilization.
- Every product-behavior release PR needs a unique version, a substantive `[Unreleased]` technical changelog entry, and affected documentation updates. Run `npm run release:check` before promotion; documentation-only changes do not need a version bump.
- Do not copy DRX-specific automation claims into Kouchd. Kouchd's release-integrity workflow checks source and version consistency; it does not automatically bump, tag, deploy, or distribute a release.
- Documentation-only changes do not bump the product version. Version changes, tags, release notes, deployment, and public availability are distinct steps and require evidence appropriate to each.
- Before a product release, verify the exact commit, required checks, version consistency, and release pipeline. Never infer deployment or customer availability from a local build, branch, tag, or dashboard setting.

## Mintlify management workflow

- Edit checked-in public pages under `help/`; `docs.json` at the repository root is the canonical Mintlify configuration. `help/docs.json` is legacy and ignored. Keep private process material under `docs/internal/`, outside public navigation.
- The Mintlify root route is supplied by the repository-root `index.mdx`; keep it a useful Kouchd help landing page rather than starter boilerplate. `help/index.mdx` is a separate page and does not replace the root route.
- Before editing, inspect the current page, navigation, links, and product source/commit state. For new or renamed pages, update root `docs.json` navigation and confirm each configured page path exists.
- Keep each public page frontmatter valid (`title` and a useful `description`), links relative and accurate, and Markdown/MDX compatible with Mintlify. Do not place issue IDs, internal commit notes, secrets, customer data, or provider setup in public pages.
- For customer-visible behavior, update the relevant guide and public changelog only after release verification. Put approved unreleased work on the roadmap without ETA; keep internal changelog and handoff current with source commits, changes, evidence, unresolved items, and release gate.
- Validate changed pages with `mintlify validate` and `mintlify broken-links` when available; also run JSON parsing and `git diff --check`. Fix validation errors before handoff. Do not use a live Mintlify edit or publish action as a substitute for repository review.
- A publish-ready handoff identifies the exact branch/commit, validation evidence, preview link if one exists, intended public pages, and outstanding caveats. Publishing or changing live Mintlify configuration still requires explicit action-time approval.

## Privacy, security, and verification

- Never commit credentials, tokens, private keys, environment values, or personal/customer data.
- Use synthetic data in screenshots, fixtures, examples, and documentation. Avoid exposing personal household details.
- Verify authorization and role-based data boundaries before claiming that records are private or visible to a particular role.
- Treat tests and source inspection as code evidence only. They do not prove production configuration, successful provider delivery, persistence for real accounts, or end-to-end customer behavior.
- Use the Mintlify CLI and repository scripts where available. If a Mintlify content-editing MCP is unavailable, make changes in the repository source; do not substitute a live dashboard edit or publish operation.
