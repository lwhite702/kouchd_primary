# WRE-239 iOS compile handoff

## Summary

The iOS Simulator build failed while Swift type-checked the large `RootView` expression in `ios/Kouchd/KouchdApp.swift`. The root screen branches and authenticated tab composition are now split into focused view properties. Lifecycle side effects are extracted into named callbacks, with analytics identification kept separate from authenticated-session connection changes.

The analytics name property uses Clerk's public `firstName` and `lastName` properties.

## Verification

- `xcodebuild -project ios/Kouchd.xcodeproj -scheme Kouchd -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build` — passed locally.
- Release gate — pending.
- GitHub CI — pending push.

## Release metadata

Prepared `1.0.0-rc.9`; no deployment or store submission was performed.
