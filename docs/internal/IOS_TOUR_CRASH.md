# Initial tour crash — WRE-182

## Report and evidence

The connected iPhone supplied a Kouchd crash report dated 2026-10-09 01:12:37
for version 0.4.0 (4), running iPhone OS 27.0 (24A435).
The system terminated the app with FRONTBOARD 0x8BADF00D after a scene update
exceeded its 10-second watchdog allowance. The main thread was in SwiftUI
ObservationCenter.invalidate and DynamicBody.updateValue. This is evidence of
an unresponsive UI update path, not a Face ID privacy termination.
The raw device report is kept outside Git because it contains device details.

## Implemented candidate

RootView no longer uses AppStorage for the tour revision. It reads the persisted
revision once into State and writes it explicitly, once, when completed or
skipped by an invitation/authenticated session. ClerkKitUI 1.5.8 constructs an
AuthState in AuthView.init; that initialization writes identifier preferences
to UserDefaults. Removing the root AppStorage subscription breaks the potential
feedback path between those unrelated preference writes and sheet reconstruction.
The presentation host is now a stable ZStack while its content changes from
the tour to welcome/sign-in. Host/guest entry intent and invitation handling
are retained.

Separately, Info.plist and the XcodeGen source now declare the Face ID purpose
string needed by Clerk's optional biometric sign-in. This does not establish
Face ID as the cause of the reported crash.

## Acceptance and release

The tour-to-authentication render-loop correction is already present on the
current main branch. This PR preserves that correction while adding the Face ID
purpose string. Planned source version: 0.4.4. The implemented source is separate
from uploaded TestFlight build 0.4.0 (4); no 0.4.4 build has been uploaded.
Verify on a real device: complete all tour steps and choose host/guest; skip
to sign-in; dismiss/reopen authentication; restart after completion; open an
invitation while signed out; replay the tour from About; check Reduce Motion.
Confirm the auth sheet remains responsive past 10 seconds and after backgrounding.
The watchdog report supports this investigation but does not by itself prove
the candidate fixes every runtime cause. Record device results before release.
