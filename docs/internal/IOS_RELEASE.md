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
- Native build numbers increase independently. The fastlane preparation lane queries every App Store Connect build across all versions, including processing and failed builds, and uses the next integer. The upload lane queries again immediately before upload and stops if another uploader reserved that number. Never assume a local project number is free.
- Record the exact Git SHA, version, iOS build, deployment IDs, validation results, and App Store Connect processing state. A source commit, archive, upload, processed build, and tester availability are distinct facts.

## Promotion

1. Validate Clerk sign-in and Convex data against the development deployment with synthetic host, guest, and admin accounts.
2. Repeat role-boundary, invite, contribution, and real-device smoke checks against staging. Confirm the staging deployment and secrets are separate from production.
3. Review the release PR and its version diff. Merge only after required checks pass and release approval is given. Kouchd's main branch may trigger a production web deployment, so verify the deployed SHA and version before claiming release.
4. Tag that exact SHA `vX.Y.Z` after merge. Confirm the tag and deployment match. Prepare the production iOS archive with bundle ID `com.wrelikbrands.kouchd` and team `L8R42BJ54K`.
5. Upload to App Store Connect after approval. Confirm processing, install the build on a real device, and validate sign-in, invitation links, live data, and outside-payment wording. Add the verified build to the intended TestFlight group after approval.
6. Move verified release notes into a dated changelog section. Update public help and roadmap only for behavior actually available to testers or customers; TestFlight access does not imply App Store availability.

## Rollback

Retain the previous verified TestFlight build and release tag. For an iOS regression, stop distributing the affected build and upload a corrected build with a higher build number. For a web or backend regression, restore the previous verified deployment and document the data compatibility impact before applying a correction. Record incident cause and recovery evidence in the internal handoff.

No account credentials, household records, invitation tokens, or guest financial data belong in release artifacts.


## Local verification record

- Full web release checks passed after rebasing on main `2b20aef`: lint,
  TypeScript, all 57 backend/domain/release tests, and production web build.
  The generic Apple silicon simulator build passed with the updated parity
  screens; the fastlane lanes loaded and Ruby syntax validation passed.
- Native iPhone 16 signed-out launch passed; accessibility-large text wrapped
  and scrolled in the signed-out welcome. This does not verify VoiceOver or
  authenticated screen behavior.
- Subsequent parity review added household access details for guests, full
  house-detail editing, shared expectation and reward-setting edits, audited
  void actions, admin record details and role changes, resumable household
  guides, additional-stay creation/joining, and complete SMS consent disclosures.
- Release gate fixtures verify minor classification, released-version reuse
  rejection, unchanged runtime-version rejection, incorrect-classification
  rejection, and documentation-only changes retaining a released version.
- No development or staging account credentials have been supplied. Real
  invitation return, multiple-guest isolation, failed network requests, changed
  agreements, contribution disputes, ended stays, and native administration
  still need authenticated journey evidence. Native profile updates now use
  Clerk and the current Convex `clerkName` contract. Mutations decode all result
  shapes, including boolean and object responses; successful invitation and
  referral joins select the returned stay.
- Figma frame structure and typography informed implementation; visual
  acceptance of each authenticated screen, small widths, larger text, and
  VoiceOver remains an open gate.

## Rollback record template

| Field | Current record |
| --- | --- |
| Previous verified web/backend deployment | Pending provider verification |
| Previous verified native build | None; first native release |
| Candidate version | 0.4.0, minor, unreleased |
| Candidate build | Resolve from App Store Connect at upload time |
| Exact released commit/tag | None |
| Deployment and TestFlight evidence | None |
| Recovery owner and verification | Record with the approved release |


## Production TestFlight direction — 2026-10-04

The owner explicitly authorized use of the current production Clerk, Convex
and Knock services and a TestFlight upload. The owner also confirmed team
`L8R42BJ54K`, matching the existing Kouchd Apple bundle and App Store Connect
record (Apple ID `6818980215`), replacing the original planned team. Native
production settings are in ignored local xcconfig files. Apple’s TestFlight
page and the authenticated API currently report no builds (next number 1).
Distribution certificate `68TZFH3J25` and the Kouchd TestFlight provisioning
profile were created and installed for the confirmed team. Production Clerk’s
native environment responds successfully and exposes Google social sign-in.
Production Convex and its Knock configuration were verified by read-only
provider checks. The new native admin-access and stay-name functions are not
currently deployed; action-time backend deployment approval is pending.
