# Kouchd review demo

The review demo must show the real native flow: first launch → introduction → host role → Create a stay → Home → Ledger/Chores/Stay, with the contribution boundary visible. The native app does not currently expose an active purchase screen, so the demo must not claim a completed subscription purchase.

## Current evidence

- Simulator: iPhone 18 Pro Max, UDID `507BB2E9-DA19-4515-BAE1-5884A24B20C3`.
- The app was previously built and installed as a Debug build for authenticated checks.
- A new local H.264 portrait preview was rendered at `_design/video-sources/demo.mp4` (18 seconds, 886×1920, 30 fps, 17 MB). It presents the complete ten-frame Kouchd story with gentle zooms, crossfades, angled phones, and the updated forest/cream/lime treatment.
- Three live-app App Preview cuts are available in `_store/previews/`: host features (23.83 seconds), guest features (24.17 seconds), and a brand-led promo (27.53 seconds). All three use built-in demo data and are H.264, 886×1920, 30 fps.
- `ffmpeg` is not installed in the current environment. The preview was encoded locally with AVFoundation from the reviewed Variant E frames; verify playback and final framing in Appto before attaching it to review.
- The App Store page metadata points to `https://kouchd.com` and `https://help.kouchd.com`; both returned HTTP 200 during this preparation pass.

## Recording recipe

1. Launch the installed Kouchd build and start `xcrun simctl io 507BB2E9-DA19-4515-BAE1-5884A24B20C3 recordVideo --codec h264 /tmp/kouchd-review-raw.mp4`.
2. Walk through the introduction, choose “Create a stay”, save the stay, and show Home, Ledger, Chores, and Stay.
3. Stop at 30–60 seconds, transcode to a review-sized H.264 MP4, and verify it is below 50 MB before attaching it to review and placing its URL in review notes.
