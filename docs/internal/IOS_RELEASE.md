# Native iOS release handoff

## Xcode Cloud enrollment — 2026-10-08

Xcode matched `com.wrelikbrands.kouchd` to existing App Store Connect app
`6818980215` and completed enrollment. Cloud product:
`4d7b3d02-d6e8-4500-b598-bc0832fd2f09`; workflow:
`31301092-07E3-4F1F-9896-51F4003AAB13`. The shared Xcode Cloud manifest is
tracked; per-user workspace state is ignored.

The production Clerk publishable key and Convex URL are configured as redacted
workflow variables. Starts are manual and restricted to `codex/wre-162-kouchd-ios`.
Cloud build 1 succeeded at commit `44b8994390d09f0f66cd5c269499f4556576204d`;
its Build action was compile verification, not a TestFlight upload. It reported
orientation and always-run validation-script warnings.

The workflow now archives scheme Kouchd (Release) with `INTERNAL_ONLY` distribution
preparation. The supported workflow API saved the action because App Store
Connect's new-action scheme selector returned no results. The saved UI confirms
Kouchd and TestFlight (Internal Testing Only). No TestFlight group post-action is
configured. App Store Connect reported no uploaded builds; the cloud counter
reported next build 2 immediately before the manual archive start. Archive run 2
(`8175129b-ff24-4b4b-b30e-de38a047018a`) compiled, signed, and exported its archive,
but failed final preparation for App Store Connect. The UI exposes only the
generic preparation failure; the detailed archive/export logs show successful
export. Direct validation of the exported IPA identifies error 90717 (icon alpha)
and 90474 (missing orientation declarations). Source now uses an opaque square
export of the existing brand SVG and declares all iPad orientations; the original
rounded icon is retained in ios/Artwork. Cloud archive 3 then succeeded with zero errors and warnings at commit
`736b4a19f1f2cf03c074a9742c451232f771bf1d`. App Store Connect processed
version 0.4.0 (3) with state VALID. It has not been assigned to a tester group or
installed on a real device. Its App Store archive export and checksum metadata
are retained locally in ignored `ios/artifacts/cloud-build-3/` for comparison and
recovery; it is a processed candidate, not a verified release.

App Store Connect currently flags build 3 as Missing Compliance. The bundled
ConvexMobileCoreRS library contains Rustls TLS symbols, and the upstream mobile
SDK declares Rustls dependencies. The export-compliance form is therefore being
reviewed as standard encryption, not as Apple-OS-only encryption. The owner must
confirm whether distribution includes France before the form is submitted. The
existing `INFOPLIST_KEY_ITSAppUsesNonExemptEncryption` build setting does not
appear in the generated Info.plist (`GENERATE_INFOPLIST_FILE=NO`); it does not
establish compliance. No compliance answer has been saved.

The former task worktree was removed outside this turn. Its committed native
branch was restored. The first-use introduction and shared motion behavior have
now been reimplemented from the Figma v2.1 frames in source. A local generic
Apple silicon simulator build succeeds, including the launch storyboard. No
simulator runtime is currently installed, so first-use navigation, sign-in return,
small-width/large-text rendering, VoiceOver, and motion still need runtime checks.
The source release checks pass: version consistency, lint, typecheck, all 57 tests,
web production build, and release classification/changelog checks. The managed
environment-presence check also passes without printing values. These checks do
not establish deployed backend parity or real-account isolation in the native UI.
The draft release PR is #22. Prior signed-out runtime evidence below describes
older source, not this restored introduction implementation.

Issue: WRE-162
State: Implemented only after source and required checks pass; released only after distribution is verified.

Historical branch evidence: the web release checks, native simulator build,
signed-out launch, and production Clerk sign-in sheet were verified against the
earlier source recorded below. Current source has compile and source-check
evidence, but no new runtime journey verification.
The owner authorized the existing production services and Apple team. A signed
production archive was exported for version 0.4.0, build 1, from commit
`321d791fbcad68e713248bf9828bc3cdd78f7d3d`. Backend deployment approval,
authenticated account journeys, real-device installation, and tester group
availability remain pending. Cloud upload and processing are recorded above.

| State | Evidence |
| --- | --- |
| Planned | Version 0.4.0 from current 0.3.0 baseline; Figma v2.1 is the visual revision; TestFlight handoff under the Wrelik team. |
| Implemented in branch | SwiftUI sources, Clerk–Convex integration, stay screens, guarded admin access, universal-link route, version tooling, and CI checks. |
| Verified source/build | Current source release checks (57 tests), generic simulator compile, cloud archive/export and App Store processing for 0.4.0 (3), team L8R42BJ54K. Runtime evidence below is historical. |
| Released | None. App Store Connect has a processed candidate. No production merge, release tag, backend deployment, tester-group distribution, or real-device installation is claimed. |

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
- Development and staging environments remain unverified. Synthetic production
  test identities were created with owner authorization on 2026-10-04. Real
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
| Candidate build | Archive 1; recheck App Store Connect immediately before upload |
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

## Signed archive evidence — 2026-10-04

- Archive and IPA export succeeded from clean commit
  `321d791fbcad68e713248bf9828bc3cdd78f7d3d`. IPA metadata confirms version
  `0.4.0`, build `1`, minimum iOS `17.0`, and bundle
  `com.wrelikbrands.kouchd`. Embedded distribution profile confirms team
  `L8R42BJ54K` and development signing disabled.
- The archive lane queried App Store Connect before choosing build 1. The
  local `ios/artifacts/archive.json` records the exact candidate identity;
  artifacts and signing material remain ignored. The build number must still
  be rechecked immediately before upload.
- The production-configured simulator rendered Clerk’s “Continue to Kouchd”
  sheet with email and Google sign-in. No customer account was impersonated,
  no sign-in code was sent, and native UI authentication success is not claimed.
- Submission has not occurred. The compatible native backend additions and
  authenticated role/isolation checks remain open gates. The owner subsequently
  authorized creation of synthetic production test accounts, recorded below.

## Synthetic account verification — 2026-10-04

The owner authorized creation of test accounts. Four synthetic Clerk users were
created for host, two guests, and admin testing. Server-only private metadata
marks their test purpose and issue; this metadata does not grant app roles.
Credentials and identifiers are kept in an ignored, permission-restricted local
artifact and are not included in this handoff. No SMS subscription was enabled.

Password sign-in returned `needs_client_trust` under production settings.
Clerk’s documented single-use sign-in ticket flow then completed for all four
identities, with a five-minute ticket expiration. Their Clerk Convex JWTs
authenticated successfully to production Convex; profile synchronization and
viewer queries passed, and each stay list was empty. These API checks do not
prove sign-in completion in the native UI or guest isolation within a stay.
Admin overview requests were rejected with production’s generic server error;
no admin grant was added, so positive admin journeys remain unverified.
Knock identification is scheduled by profile synchronization; notification
delivery was not exercised or claimed.
