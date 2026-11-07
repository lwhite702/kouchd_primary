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
