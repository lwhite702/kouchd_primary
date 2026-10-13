# Native self-check — WRE-194

This task adds an XCTest UI target and a Debug-only host for the existing introduction. Release entry behavior, service settings, billing, and user data are unchanged. The patch version advances to 0.4.1 for the native visual fixes and regression coverage.

## Scope

The introduction host skips Clerk configuration, does not instantiate KouchdStore, and does not write onboarding preferences. Tests exercise the real IntroductionScreen and observe its completion callback. That proves view navigation and callback output, not production authentication or first-launch routing.

Light/dark screenshots cover Welcome, Stay, Contributions, Chores, and Role selection. Synthetic preview data is already part of the introduction. No household data or service credentials are used.

Visual review found that dark appearance previously changed only the status bar because Kouchd's palette used fixed light colors. The shared palette and card/button surfaces now provide explicit dark values while preserving fixed forest backgrounds where white foreground text depends on them.

The same screenshots showed the taller Stay and Chores pages expanding the root stack beyond the device, clipping the status area and placing preview cards behind the footer. The introduction now installs the footer as an opaque bottom safe-area inset, leaving the scroll view as the flexible region. Primary buttons keep their intrinsic height when vertical space is tight.

## Remaining acceptance

- Native development settings are absent. Doppler project kouchd configs dev, dev_personal, stg and prd were previously checked; dev was checked again for this run. No Clerk publishable key or Convex URL was found.
- Native purchase and restore integration is absent (WRE-190). This work does not fabricate purchase behavior or enable billing.
- Host/guest authentication, invitations, real household screens, offline service failure handling, and purchase flows still need verification.
- The primary checkout had unrelated documentation edits. Changes are isolated on codex/wre-194-native-self-check and are not merged, pushed, or deployed.

## Evidence

Simulator: iPhone 18 Pro Max, iOS 27.0, UDID 507BB2E9-DA19-4515-BAE1-5884A24B20C3. Xcode 27.0.

Final build and test results are recorded in the Appto self-check artifact for October 12, 2026. Do not interpret the test harness as a functioning authenticated app or an offline household mode.
