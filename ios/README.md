# Kouchd for iOS

The SwiftUI project targets iOS 17 or later. Generate its Xcode project with
`xcodegen generate --spec ios/project.yml`, then open `ios/Kouchd.xcodeproj`.
The project includes ClerkKit, ClerkKitUI, ClerkConvex, and ConvexMobile.
Brand headings use Manrope from Google Fonts under the bundled SIL Open Font
License in `Kouchd/Fonts/OFL.txt`; controls retain native iOS type.

## Service settings

Development and production configurations each need their own Clerk publishable
key and Convex deployment URL. Create ignored `ios/Config/Local.xcconfig` for
development and `ios/Config/Production.local.xcconfig` for release archives:

```xcconfig
CLERK_PUBLISHABLE_KEY = pk_test_or_live_value
CONVEX_URL = https:/$()/your-deployment.convex.cloud
```

Do not commit either local file. The tracked configs contain nonworking
placeholders, and the app shows a setup message until valid settings are
present. Confirm each pair belongs to the same environment. A publishable key
is an app identifier, but these local files also prevent accidental environment
mixups.

In Clerk, enable the Native API and register
`LG7W94ZD3B.com.wrelikbrands.kouchd` as a native application in each
environment. Confirm the production Frontend API host is
`clerk.kouchd.com`; the app entitlement also includes the existing
development Clerk host. Configure the production and development Convex
deployments to trust the matching Clerk issuer. Check Apple sign-in availability
in each Clerk environment and configure its Apple credentials if it is enabled.
The project declares associated domains and Sign in with Apple entitlements;
these still require corresponding provider and signing setup.

The web app serves the invitation universal-link association at
`/.well-known/apple-app-site-association`. Deploy and verify it on
`https://kouchd.com` before testing an invitation return from a device.

## Verification

Build locally with:

```sh
xcodegen generate --spec ios/project.yml
xcodebuild -project ios/Kouchd.xcodeproj -scheme Kouchd -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16' CODE_SIGNING_ALLOWED=NO build
```

Use development accounts for a host, two guests, and a platform admin.
Exercise a new stay, one-time invitation return after sign-in, agreement
acceptance and changed terms, outside contributions and two-party
confirmation/disputes, guest-scoped ledger, chores, occupied nights, schedule
requests, rewards, reminders, and an ended stay. Then repeat the release
journey in staging and on a signed real-device build.

The root `VERSION` controls the app's marketing version. The separate
`CURRENT_PROJECT_VERSION` is a local starting value only. Read App Store
Connect for the next build number immediately before a release archive.
See `docs/internal/IOS_RELEASE.md` for promotion and rollback evidence.


## Build preparation

The Convex binary supports Apple silicon simulators; the project excludes the
Intel simulator architecture. Physical-device archives still target arm64.

From `ios/`, run `fastlane ios next_build` to read the highest App Store Connect
build across all versions, including processing or failed builds, and propose
the next integer. Configure `ASC_KEY_ID`, `ASC_ISSUER_ID`, and `ASC_KEY_FILE`
with the approved Wrelik App Store Connect key; never track the private key.
`fastlane ios archive` builds a clean reviewed commit with production settings
and records version, build, and commit in ignored `ios/artifacts/archive.json`.
The archive lane does not upload. After action-time approval and recorded release
gates, `KOUCHD_UPLOAD_APPROVED=yes fastlane ios upload` resolves a fresh number,
archives, checks that no concurrent uploader reserved it, uploads, waits for
processing, and records `upload.json`. Group distribution and real-device
installation remain separate verification steps. These lanes have been syntax
checked locally; Apple access and actual upload remain unverified.

Release PRs classify their changes in `release/change.json` as major, minor,
patch, or none with a factual reason. The gate validates the declared increment
and rejects a version already tagged as released. Documentation changes alone
retain the current version.
