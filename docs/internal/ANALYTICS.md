# Kouchd analytics, flags and monitoring

**Issue:** [WRE-252](https://linear.app/wrelik/issue/WRE-252/kouchd-analytics-feature-flags-and-conversion-tracking-phased-plan)
**State (2026-10-30):** Code is on the `claude/inspiring-volta-fvyy1z` branches of `kouchd_primary` and `kouchd_marketing`, and is unreleased. Production delivery is unverified.

Internal reference. Excluded from Mintlify navigation. Related notes:
- [`REVENUECAT_POSTHOG.md`](./REVENUECAT_POSTHOG.md): purchase events.
- [`META_ADS.md`](./META_ADS.md): Meta Pixel and Conversions API.

## One person across the site, the app and the server

- **PostHog project:** `Kouchd` (595950), US cloud.
- **Proxy:** browsers send events through `/ingest` on their own origin.
  - App: rewrites in `next.config.ts`.
  - Marketing: rewrites in `vercel.json`.
  - Three routes: `/ingest/static`, `/ingest/array` (to `us-assets.i.posthog.com`), everything else (to `us.i.posthog.com`).
  - The app's Clerk middleware skips `/ingest`.
  - Vercel bills this traffic as data transfer, and web session replays are the largest part. If costs grow, PostHog's managed proxy is free.
- **Visitor ID:** the `ph_<token>_posthog` cookie is shared across `kouchd.com` subdomains (`cross_subdomain_cookie`).
  - The marketing site sets it only after "Allow analytics".
  - The app resets it only after a real sign-out.
- **Signed-in ID:** the Clerk user ID everywhere.
  - Web: `posthog.identify`.
  - iOS: `KouchdAnalytics.identify`.
  - Convex: `trackServerEvent`, which uses `users.clerkUserId`.
  - RevenueCat: app user ID.
  - `tests/revenuecat-posthog.test.ts` guards web and iOS.
- **Campaigns:** the `kouchd_attr` cookie (`.kouchd.com`, 90 days) keeps the first and last visit's UTM tags, `gclid` and `fbclid` (`lib/analytics/attribution.ts`; marketing copy in `src/lib/attribution.ts`).
  - The marketing site writes it only with analytics consent. The app writes it on every campaign landing.
  - At sign-in the first touch becomes `initial_*` person properties.
  - The marketing site also appends the last touch to app sign-up links.
- **Consent:** the `kouchd_consent` cookie (`.kouchd.com`) is written by the marketing banner: `{analytics, ads, gpc}`.
  - Global Privacy Control forces `ads` off.
  - The app reads only `ads` (for Meta). App analytics is covered by the app's own policy.

## Google Tag Manager: not used

Removed from both sites on 2026-10-31 (owner decision). PostHog covers product and campaign analytics, and Meta runs without it. kouchd.com still loads GA4 directly (`src/components/common/Analytics.astro`).

Add a tag manager back only for Google Ads conversion tracking or remarketing. It would need new CSP hosts, consent handling and policy text, and it should stay off signed-in app pages.

## Events

Typed in `lib/analytics/events.ts`. Server events carry IDs and categories only: no names, free text, amounts or join codes.

| Event | Sent from | Properties |
| --- | --- | --- |
| `$pageview`, autocapture, replay | Web app (`components/posthog-provider.tsx`) | URLs reduced to route categories by `lib/telemetry-privacy.ts` |
| `$pageview`, autocapture, `cta_clicked` | kouchd.com after consent (`src/components/common/PostHog.astro`) | `cta_clicked`: `role`, `plan` (`free` or `plus_trial`), `location` |
| `screen_viewed` | iOS (`KouchdAnalytics`) | `screen` |
| `user_signed_up` | Convex `users.syncCurrent` (new user) | `meta_event_id` |
| `stay_created` | Convex `stays.create` | `stayId`, `cadence`, `rateCents` |
| `invite_created` / `invite_accepted` | Convex `invites.create` / `invites.accept` | `stayId` (`inviteId`) |
| `stay_joined` | Convex `referral.joinWithCode` | `stayId`, `via: referral_code` |
| `terms_accepted` | Convex `terms.acceptCurrent` | `stayId`, `version`, `role` |
| `contribution_recorded` | Convex `contributions.create` | `stayId`, `type`, `recordedBy` |
| `chore_created` / `chore_completed` | Convex `chores.create` / `chores.toggle` | `stayId`, `choreId` |
| `reward_claimed` | Convex `rewards.submitClaim` | `stayId`, `points` |
| `plan_limit_hit` | Convex `subscriptions.recordBlockedJoin` | `stayId`, `limit: guest` |
| `stay_switched` | Web (`authenticated-home.tsx`), only when the stay changes | `stayId`, `role` |
| `shopping_item_added` / `shopping_item_purchased` | Web, after the save succeeds | `stayId`, `itemId` |
| `check_in_submitted` | Web | `stayId`, `date` |
| Purchases, trials, renewals | RevenueCat's PostHog integration (not turned on yet) | RevenueCat's names |

**How the server sends events:**
- They are scheduled after the mutation commits (`convex/lib/posthog.ts`) and grouped by `stay`.
- They are sent with `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, which must also be set on the **Convex** deployment.
- `tests/server-analytics.test.ts` checks the shape.
- The coverage test in `tests/analytics.test.ts` fails when an event is defined but nothing sends it. Its `NOT_YET_SENT` list names the planned ones.

## Feature flags

**Resolution:** `lib/flags/resolve.ts`, tested in `tests/flag-resolve.test.ts`.
1. A development or Vercel preview override (`?flag:<key>=true` or localStorage). These are ignored in production.
2. The Convex override (`enabled` or `disabled`), set in Platform → Flags.
3. The PostHog value.
4. The registry default (`lib/flags/config.ts`).

**Loading behaviour:**
- While Convex or PostHog are still loading, a flag reads as off, so a killed feature never flashes.
- If PostHog flags don't arrive within 2.5 seconds, the defaults apply.
- Server-side bootstrapping was not added: reading the cookie in the root layout would make every page dynamic.

**Server enforcement:**
- `requireFeature` in `convex/flags.ts` runs in every shopping, check-in and rewards write.
- The server reads the Convex override only. PostHog percentage rollouts affect the UI only.
- `setOverride` refuses keys that are not in the registry.

**Flags that nothing checks.** These need a product decision; none were deleted:

| Flag | Default | Suggestion |
| --- | --- | --- |
| `feature_household_announcements` | on | Wire into the announcements UI or delete |
| `feature_flexible_payment_schedules` | off | Delete unless the feature is planned |
| `feature_recorded_overnights` | off | Delete unless the feature is planned |
| `feature_multi_stay_management` | on | Wire into the stay switcher or delete |
| `feature_kouchd_plus_trial` | off | Wire into the trial offer, or let RevenueCat offerings decide |
| `feature_sms_reminders` | on | Gate SMS reminder sends on the server |
| `feature_kouchd_plus_entitlement`, `feature_customer_center` | off, on | Only used by `useKouchdPlus`, which nothing calls |

In PostHog, 10 of the 14 flags had never been evaluated as of 2026-10-30.

## Monitoring

**Errors:**
- Sentry is the error tracker: web client, server and edge.
- PostHog `capture_exceptions` is off, which stops errors being reported twice.
- Sentry replays only sessions with an error (`replaysOnErrorSampleRate: 1`); PostHog records everyday sessions.
- `scripts/verify-env.mjs` warns when a production build has no `SENTRY_AUTH_TOKEN`, because source maps would not upload.

**Still to set up** (dashboard settings or native code, not in this branch):
- **Convex:** Settings → Integrations → Exception reporting → Sentry, using the Kouchd Sentry DSN.
- **iOS:** add `sentry-cocoa` through Swift Package Manager and start it in `KouchdApp.swift`. Not added here, because the iOS project can't be built in this environment.
- **Uptime checks:** use Vercel, Checkly or Better Stack to check `https://kouchd.com/` and `https://app.kouchd.com/sign-in` every 5 minutes.
- **Sentry alerts:** alert on a new issue in production and on a regression.
- **PostHog alerts:** see Dashboards.

## Dashboards

Built after release, once the events above arrive (see the PR for status):
1. **Acquisition funnel:** kouchd.com `$pageview` → `cta_clicked` → `user_signed_up` → `stay_created` → `invite_accepted`. Break down by `initial_utm_source`.
2. **Activation and retention:** weekly retention from `stay_created` to any stay event, plus lifecycle.
3. **Monetization:** RevenueCat trial and purchase events and `plan_limit_hit`.
4. **Flags health:** `$feature_flag_called` by flag.
5. **Alerts:**
   - `user_signed_up` falls to 0 in 24 hours.
   - A spike in `plan_limit_hit`.

## Verifying in production

1. **Proxy:** on app.kouchd.com and kouchd.com, the network tab shows PostHog requests to `/ingest/...` returning 200.
2. **One person end to end:** land on kouchd.com with `?utm_source=test`, allow analytics, click "Start as host", sign up and create a stay. The PostHog person should have:
   - `initial_utm_source = test`;
   - `cta_clicked`, `user_signed_up` and `stay_created` in order;
   - one person across both domains.
3. **Kill switch:** turn a flag off in Platform → Flags. The UI hides the feature, and the matching Convex writes are refused.
