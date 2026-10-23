#!/bin/sh
# Xcode Cloud discovers this directory beside Kouchd.xcodeproj.
set -eu
set +x
umask 077

fail() { printf '%s\n' "$1" >&2; exit 1; }
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repository=${CI_PRIMARY_REPOSITORY_PATH:-$(CDPATH= cd -- "$script_dir/../.." && pwd)}
config_dir="$repository/ios/Config"
[ -f "$config_dir/Production.xcconfig" ] || fail "Kouchd production configuration is missing."

case "${PROD_CLERK_PUBLISHABLE_KEY:-}" in
  pk_live_?*) ;;
  *) fail "Set PROD_CLERK_PUBLISHABLE_KEY to the production Clerk publishable key." ;;
esac
case "$PROD_CLERK_PUBLISHABLE_KEY" in
  *[!A-Za-z0-9_=+-]*) fail "The Clerk publishable key contains invalid characters." ;;
esac
case "${PROD_POSTHOG_API_KEY:-}" in
  ""|phc_?*) ;;
  *) fail "PROD_POSTHOG_API_KEY must be a PostHog project token beginning with phc_." ;;
esac
case "${PROD_CONVEX_URL:-}" in
  *[!a-z0-9:/.-]*) fail "The Convex URL contains invalid characters." ;;
esac
printf '%s\n' "${PROD_CONVEX_URL:-}" | LC_ALL=C grep -Eq '^https://[a-z0-9]+(-[a-z0-9]+)*\.convex\.cloud$' \
  || fail "Set PROD_CONVEX_URL to the HTTPS production Convex deployment URL."

# In xcconfig, a literal // starts a comment. Expand an empty value between slashes.
convex_host=${PROD_CONVEX_URL#https://}
posthog_host=${PROD_POSTHOG_HOST:-https://us.i.posthog.com}
printf '%s\n' "$posthog_host" | LC_ALL=C grep -Eq '^https://[A-Za-z0-9.-]+(:[0-9]+)?$' \
  || fail "PROD_POSTHOG_HOST must be an HTTPS host without a path."
posthog_api_key=${PROD_POSTHOG_API_KEY:-missing_posthog_project_token}
posthog_host=${posthog_host#https://}
temporary=$(mktemp "$config_dir/.Production.local.XXXXXX")
trap 'rm -f "$temporary"' EXIT HUP INT TERM
{
  printf 'CLERK_PUBLISHABLE_KEY = %s\n' "$PROD_CLERK_PUBLISHABLE_KEY"
  printf 'CONVEX_URL = https:/$()/%s\n' "$convex_host"
  printf 'POSTHOG_API_KEY = %s\n' "$posthog_api_key"
  printf 'POSTHOG_HOST = https:/$()/%s\n' "$posthog_host"
  printf 'KOUCHD_CODE_SIGN_STYLE = Automatic\n'
  printf 'KOUCHD_PROVISIONING_PROFILE_SPECIFIER =\n'
} > "$temporary"
mv -f "$temporary" "$config_dir/Production.local.xcconfig"
printf '%s\n' "Kouchd production settings prepared for Xcode Cloud."
