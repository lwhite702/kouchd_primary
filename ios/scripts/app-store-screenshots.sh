#!/usr/bin/env bash
# Captures App Store screenshots on iPhone 6.9" and iPad 13" simulators from the
# synthetic-data test hosts. Requires macOS with Xcode and xcodegen.
#
# Usage: ios/scripts/app-store-screenshots.sh [iphone|ipad|all]
# Optional env:
#   IPHONE_DEVICE   simulator name (default: newest available "iPhone * Pro Max")
#   IPAD_DEVICE     simulator name (default: newest available "iPad Pro 13-inch*")
#   DARK=1          also capture dark appearance
#   IPAD_PORTRAIT=1 capture iPad in portrait (default landscape)
#   ONLY=03-ledger,06-shopping   capture a subset
#   OUT_DIR         output root (default ios/artifacts/screenshots/<timestamp>)
set -euo pipefail

[[ "$(uname)" == "Darwin" ]] || { echo "Run this on macOS with Xcode installed." >&2; exit 1; }
for tool in xcodebuild xcrun xcodegen sips; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 1; }
done

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET="${1:-all}"
OUT_ROOT="${OUT_DIR:-$ROOT/ios/artifacts/screenshots/$(date +%Y%m%d-%H%M%S)}"
DERIVED="$ROOT/ios/artifacts/screenshots-derived-data"
mkdir -p "$OUT_ROOT"

find_device() {
  local pattern="$1"
  xcrun simctl list devices available \
    | grep -E "^ +${pattern} \(" \
    | tail -n 1 \
    | sed -E 's/^ +(.+) \(([0-9A-F-]{36})\).*/\1|\2/'
}

resolve() {
  local name="$1" pattern="$2" match
  if [[ -n "$name" ]]; then
    match="$(xcrun simctl list devices available | grep -F "    $name (" | tail -n 1 \
      | sed -E 's/^ +(.+) \(([0-9A-F-]{36})\).*/\1|\2/')"
  else
    match="$(find_device "$pattern")"
  fi
  [[ -n "$match" ]] || { echo "No simulator matches '${name:-$pattern}'. Install one in Xcode > Settings > Components." >&2; exit 1; }
  echo "$match"
}

prepare_simulator() {
  local udid="$1"
  xcrun simctl boot "$udid" 2>/dev/null || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  xcrun simctl ui "$udid" appearance light
  xcrun simctl status_bar "$udid" override \
    --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --operatorName "" \
    --batteryState charged --batteryLevel 100
}

capture() {
  local label="$1" device="$2" udid dir
  udid="${device#*|}"
  dir="$OUT_ROOT/$label"
  mkdir -p "$dir"
  echo "==> $label: ${device%|*} ($udid)"
  prepare_simulator "$udid"
  run_tests "$udid" "$dir" 0
  if [[ "${DARK:-0}" == "1" ]]; then
    xcrun simctl ui "$udid" appearance dark
    run_tests "$udid" "$dir" 1
  fi
  xcrun simctl status_bar "$udid" clear || true
  report "$dir"
}

run_tests() {
  local udid="$1" dir="$2" dark="$3"
  TEST_RUNNER_KOUCHD_SCREENSHOT_DIR="$dir" \
  TEST_RUNNER_KOUCHD_SCREENSHOT_DARK="$dark" \
  TEST_RUNNER_KOUCHD_SCREENSHOT_IPAD_PORTRAIT="${IPAD_PORTRAIT:-0}" \
  TEST_RUNNER_KOUCHD_SCREENSHOT_ONLY="${ONLY:-}" \
  xcodebuild test \
    -project "$ROOT/ios/Kouchd.xcodeproj" -scheme Kouchd -configuration Debug \
    -destination "id=$udid" -derivedDataPath "$DERIVED" \
    -only-testing:KouchdUITests/AppStoreScreenshotTests \
    CODE_SIGNING_ALLOWED=NO -quiet
}

report() {
  local dir="$1" file w h
  for file in "$dir"/*.png; do
    [[ -e "$file" ]] || { echo "No screenshots written to $dir" >&2; exit 1; }
    w="$(sips -g pixelWidth "$file" | awk '/pixelWidth/ {print $2}')"
    h="$(sips -g pixelHeight "$file" | awk '/pixelHeight/ {print $2}')"
    printf '  %-28s %sx%s\n' "$(basename "$file")" "$w" "$h"
  done
}

xcodegen generate --spec "$ROOT/ios/project.yml" >/dev/null

if [[ "$TARGET" == "iphone" || "$TARGET" == "all" ]]; then
  capture "iphone-6.9" "$(resolve "${IPHONE_DEVICE:-}" 'iPhone [0-9]+ Pro Max')"
fi
if [[ "$TARGET" == "ipad" || "$TARGET" == "all" ]]; then
  capture "ipad-13" "$(resolve "${IPAD_DEVICE:-}" 'iPad Pro 13-inch[^(]*')"
fi

echo
echo "Screenshots: $OUT_ROOT"
echo "App Store Connect accepts iPhone 6.9\" at 1320x2868 (or 1290x2796) and iPad 13\" at 2064x2752 or 2048x2732, portrait or landscape."
