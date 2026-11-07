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

## Native iOS Integration (`ios/Kouchd/HeyCatch.swift`)

Implemented per [https://heycatch.ai/agents-native.md](https://heycatch.ai/agents-native.md):
- **Direct HTTP Ingestion**: `https://in.heycatch.ai/capture/` using HeyCatch API key `phc_oiDt6uXiBiEA2aT43SMzMAFE9D4gMVkRP3BtvYRsmHqe` and project key `hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI`.
- **Coexistence with PostHog SDK**: Preserves the existing `PostHogSDK.shared` configuration for Kouchd's own analytics without conflict.
- **Payload Attributes**:
  - `heycatch_project_key`: `hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI`
  - `$groups`: `{ "project": "hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI" }`
  - `$lib`: `"heycatch-native"`
  - `$session_id`: RFC 9562 UUIDv7, refreshed on launch and after 30 minutes of inactivity.
  - `heycatch_custom_user_event`: `true` on custom business events, omitted on `$screen` and `$identify`.
- **Identity & Lifecycle**:
  - `$screen` sent with `$screen_name` on screen transitions.
  - `$identify` sent with `$anon_distinct_id` on user sign-in.
  - Fresh anonymous UUID generated and persisted on sign-out.
