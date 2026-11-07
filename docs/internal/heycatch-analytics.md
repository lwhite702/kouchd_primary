# HeyCatch Analytics Integration

HeyCatch analytics SDK is integrated into the Kouchd web app for funnel tracking, campaign attribution, and product telemetry.

## Setup Details
- **SDK**: `@heycatch/sdk`
- **Project Key**: `hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI`
- **Client Entry**: Initialized in `instrumentation-client.ts` at module scope with Next.js 16 metadata.
- **CSP**: Permitted `https://in.heycatch.ai` in `script-src` and `connect-src` directives in `lib/security/csp.ts`.
- **Short Links**: Single-character attribution redirect `/:l([a-z0-9])` -> `/?utm_source=heycatch&utm_campaign=:l` configured in `next.config.ts`.
- **Identity Lifecycle**:
  - `components/heycatch-sync.tsx` synchronizes Clerk authenticated identity with `analytics.setIdentity` (including email, name, and set-once `signup_date`).
  - Sign-out triggers `analytics.resetIdentity()`.
- **Product Events**: `lib/analytics/track.ts` dispatches tracked business events to `analytics.trackEvent(...)`.

## Web app reconciliation — 2026-11-07 (local, unreleased)

- Verified npm's `latest` tag and installed lockfile both resolve to stable `0.8.5`; no dependency update was needed.
- Corrected install agent to `codex`. This project is the web app: omit `site: "landing"`.
- The existing post-commit Convex funnel action now awaits HeyCatch delivery with the Clerk ID, independently of PostHog configuration. Existing sign-up and business event names are preserved.
- Accepted production RevenueCat webhook changes schedule a separate HeyCatch action, update the public `plan` property, and emit `subscription_<lowercase provider event type>`. Duplicate, stale, ignored, and sandbox events are excluded. RevenueCat's direct PostHog integration is not duplicated.
- These scheduled actions have no browser request; identity joins by Clerk ID. Cross-origin tracing is intentionally disabled because no tracing headers/CORS changes were introduced.
- Test setup mocks the SDK so the inlined publishable key cannot send synthetic events during tests.
- Live read-only check: `https://app.kouchd.com/x` returned 307 to `/?utm_source=heycatch&utm_campaign=x`, matching Next.js's guide-provided `permanent: false` redirect. Both live CSP directives allow the HeyCatch host.
- Linear issue creation was attempted but rejected because the workspace exceeded its free issue limit.
- Changes are isolated on `codex/heycatch-web-reconcile`; concurrent shared-checkout changes were preserved. These new server changes have not been deployed. No dashboard ingestion or real-browser activation is claimed.

### Release handoff

Deploy both the Next.js app and Convex backend after reviewing these changes. Repository policy requires action-time approval before pushing/deploying. Prepare the next unique release version and run the release gate before promotion.

Once live, open the app in an ordinary browser, click around for a few seconds, then open the HeyCatch dashboard Install page and press **I've installed**. Automated test traffic does not verify activation.

### Local verification

- `npm run typecheck`: passed.
- ESLint on all changed TypeScript files: passed.
- Full `npm test`: 59 files, 394 tests passed, including awaited SDK delivery, PostHog independence, webhook retry/sandbox exclusion, CSP and short-link coverage.
- `git diff --check`: passed.
- Production build/release gate and new backend deployment remain unverified.
