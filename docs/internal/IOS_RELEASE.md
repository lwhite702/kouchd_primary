# Native iOS release handoff

Issue: WRE-162
State: Implemented only after source and required checks pass; released only after distribution is verified.

Current branch evidence: the native iOS simulator build and signed-out launch
have been verified. The available local Clerk key and Convex deployment both
point to production, so development and staging account journeys remain
unverified pending separate environment settings and test accounts. App Store
Connect app creation, distribution signing, build-number selection, upload,
processing, real-device installation, and TestFlight availability are pending.

| State | Evidence |
| --- | --- |
| Planned | Version 0.4.0 from current 0.3.0 baseline; Figma v2.1 is the visual revision; TestFlight handoff under the Wrelik team. |
| Implemented in branch | SwiftUI sources, Clerk–Convex integration, stay screens, guarded admin access, universal-link route, version tooling, and CI checks. |
| Verified | Web release checks and unsigned iPhone 16 simulator build; signed-out simulator launch. |
| Released | None. No production merge, release tag, backend deployment, App Store Connect build, or TestFlight distribution is claimed. |

## Version and evidence

- `VERSION` is the release SemVer source. `npm run version:prepare -- X.Y.Z` synchronizes the web package, lockfile, and iOS marketing version. `npm run version:check` verifies them.
- Every product release PR changes the version, the leading `[Unreleased]` entry in `CHANGELOG.md`, and affected guides. `npm run release:check` is required before the release PR is merged.
- Native build numbers increase independently. Check the highest processed App Store Connect build for the selected marketing version immediately before archiving; use the next integer. Never assume a local project number is free.
- Record the exact Git SHA, version, iOS build, deployment IDs, validation results, and App Store Connect processing state. A source commit, archive, upload, processed build, and tester availability are distinct facts.

## Promotion

1. Validate Clerk sign-in and Convex data against the development deployment with synthetic host, guest, and admin accounts.
2. Repeat role-boundary, invite, contribution, and real-device smoke checks against staging. Confirm the staging deployment and secrets are separate from production.
3. Review the release PR and its version diff. Merge only after required checks pass and release approval is given. Kouchd's main branch may trigger a production web deployment, so verify the deployed SHA and version before claiming release.
4. Tag that exact SHA `vX.Y.Z` after merge. Confirm the tag and deployment match. Prepare the production iOS archive with bundle ID `com.wrelikbrands.kouchd` and team `LG7W94ZD3B`.
5. Upload to App Store Connect after approval. Confirm processing, install the build on a real device, and validate sign-in, invitation links, live data, and outside-payment wording. Add the verified build to the intended TestFlight group after approval.
6. Move verified release notes into a dated changelog section. Update public help and roadmap only for behavior actually available to testers or customers; TestFlight access does not imply App Store availability.

## Rollback

Retain the previous verified TestFlight build and release tag. For an iOS regression, stop distributing the affected build and upload a corrected build with a higher build number. For a web or backend regression, restore the previous verified deployment and document the data compatibility impact before applying a correction. Record incident cause and recovery evidence in the internal handoff.

No account credentials, household records, invitation tokens, or guest financial data belong in release artifacts.
