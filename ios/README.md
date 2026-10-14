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
`L8R42BJ54K.com.wrelikbrands.kouchd` as a native application in each
environment. Confirm the production Frontend API host is
`clerk.kouchd.com`; the app entitlement also includes the existing
development Clerk host. Configure the production and development Convex
deployments to trust the matching Clerk issuer. Check Apple sign-in availability
in each Clerk environment and configure its Apple credentials if it is enabled.
The project declares associated domains. Production Clerk currently exposes
Google as its social provider; no unused Sign in with Apple entitlement is
requested. Apple sign-in can be configured separately if that provider is added.

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

## Xcode Cloud

`ios/ci_scripts/ci_post_clone.sh` writes the ignored production override after
clone. Set `PROD_CLERK_PUBLISHABLE_KEY` (`pk_live_…`) and `PROD_CONVEX_URL`
(`https://your-deployment.convex.cloud`) in the workflow environment. The script
validates both inputs, avoids printing their values, and writes the URL in
xcconfig syntax that preserves its two slashes. Use matching production services.
Do not provide Clerk secret keys, Convex deploy keys, or Knock backend keys.

Select repository `lwhite702/kouchd_primary`, project `ios/Kouchd.xcodeproj`,
scheme `Kouchd`, and the reviewed native branch `codex/wre-162-kouchd-ios`.
Create the first workflow in Xcode (Product > Xcode Cloud > Create Workflow).
After enrollment, App Store Connect can manage additional workflows.
The current main branch must contain the native project before it can be used.
Choose an iOS Archive action with Release configuration and TestFlight internal
deployment preparation. Configure the TestFlight post-action and internal group
explicitly; preparation alone does not establish tester availability.

Cloud builds use automatic signing under team `L8R42BJ54K`; local Release builds
retain the `Kouchd TestFlight` manual profile. Xcode Cloud owns its increasing
build counter. Immediately before starting, inspect App Store Connect builds
across versions, including processing builds, and set Xcode Cloud > Settings >
Build Number > Next Build Number above the highest reserved number. Avoid
concurrent local uploads. Do not assume the next build is `1`.

The marketing version remains the root `VERSION` value, currently `0.4.4` on
this unreleased branch. Passing the script is configuration evidence only.
Complete release checks, archive and processing checks, internal group access,
and installation on a real device before recording TestFlight availability.


## Introduction and motion

First use shows the Figma v2.1 welcome and Stay, Ledger, and Chores previews,
then offers host and guest entry paths. Sign-in and Skip finish the introduction;
cancelling sign-in does not reopen it automatically. A pending role continues
after authentication and account loading when the user has no stays. An incoming
invitation takes priority over role selection. Returning users open their account.
About Kouchd is available before sign-in and in Settings and can replay the
feature previews without changing account state. Version text comes from native
bundle metadata. All preview names, amounts, and tasks are synthetic.

The launch storyboard and short in-app brand entrance lead into the current
screen. Navigation remains native. Shared pages, cards, and primary buttons use
short entrance/press animations; Reduce Motion uses fades without translation or
scaling. Live document arrays use document IDs to retain row identity. The account
query chooses the initial destination after its first response; responses from
superseded accounts, stays, and guests are ignored. Selected-stay and guest
financial loading keep navigation stacks mounted and show a loading state
instead of transient zero balances.

The App Store icon is an opaque RGB export of `Artwork/AppIcon.svg`, derived
from the existing brand vector. iOS applies its own outer mask. The original
rounded export is retained in Artwork for reference.

Regenerate the native export on macOS with:

```sh
qlmanage -t -s 1024 -o /tmp ios/Artwork/AppIcon.svg
swift ios/scripts/export-app-icon.swift /tmp/AppIcon.svg.png \
  ios/Kouchd/Assets.xcassets/AppIcon.appiconset/AppIconOpaque.png
```
