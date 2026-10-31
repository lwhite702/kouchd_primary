# RevenueCat → PostHog integration

**Issue:** [WRE-251](https://linear.app/wrelik/issue/WRE-251/kouchd-connect-revenuecat-subscription-events-to-posthog-and-align)
**Reference:** [RevenueCat: PostHog integration](https://www.revenuecat.com/docs/integrations/third-party-integrations/posthog)
**State (2026-10-30):** Documentation and identity test only; no new events are sent. The integration is **not turned on**: the PostHog project `Kouchd` (595950) has no RevenueCat, purchase, trial, paywall or checkout events in the last 60 days.

Internal setup note. Excluded from Mintlify navigation.

## What it does

RevenueCat sends its subscription lifecycle events (trial started, first purchase, renewal, cancellation, expiration, billing issue, product change, and so on) straight to PostHog from its servers. Kouchd does not capture these itself, so web Billing and App Store purchases show up the same way, including renewals and cancellations that happen when nobody has the app open.

This is separate from Kouchd's own RevenueCat webhook (`convex/http.ts` → `subscriptions.ingestRevenueCatEvent`). That webhook keeps plan limits and entitlements correct and does **not** send anything to PostHog. Keep it that way, or every purchase is counted twice.

There is also a PostHog-side **RevenueCat data warehouse source** (Data pipeline → Sources → RevenueCat). It syncs customers, products, entitlements, offerings and apps into warehouse tables using a RevenueCat v2 secret key. It answers different questions (catalogue and revenue tables, not person-level events) and is not needed for this integration. PostHog's revenue analytics lists RevenueCat as "coming soon".

## Identity: no extra code needed

RevenueCat attributes each event to the RevenueCat app user ID, unless the customer has a `$posthogUserId` attribute. Kouchd gives both SDKs the same Clerk user ID, so the attribute is not set and not needed.

| Surface | PostHog `distinct_id` | RevenueCat app user ID |
| --- | --- | --- |
| Web | `posthog.identify(userId)` in `components/posthog-provider.tsx` (Clerk `userId`) | `presentRevenueCatPaywall({ appUserId: userId })` in `components/billing/paywall-modal.tsx`; `lib/revenuecat.ts` refuses to start without it |
| iOS | `KouchdAnalytics.identify` on `clerk.user?.id` in `ios/Kouchd/KouchdApp.swift` | `Purchases.shared.logIn(userID)` via `billing.updateIdentity` on the same `clerk.user?.id` |

Billing never runs signed out, so there are no anonymous RevenueCat IDs to merge. `tests/revenuecat-posthog.test.ts` fails if either side stops using the Clerk ID. If they ever diverge, set the `$posthogUserId` subscriber attribute to the PostHog distinct ID instead.

## Events

| Event | Source | Notes |
| --- | --- | --- |
| `paywall_viewed` | Web client, **not sent yet** | Defined, never sent. Blocked on the privacy copy below. When added, send it only after the paywall has rendered: `presentPaywall` resolves only when the paywall closes, and `purchases-js` offers no render callback. Either send it on the first `listener.onInteraction` (proves it rendered, misses views with no interaction) or send it after `getRevenueCatClient` succeeds and treat it as an open attempt. |
| `customer_center_opened` | Web client, **not sent yet** | Defined, never sent. `openCustomerCenter` calls `window.open(..., "noopener")`, which returns `null` even on success, so a blocked pop-up can't be told apart. Treat it as "management link opened by the host", not a confirmed visit. |
| RevenueCat lifecycle events | RevenueCat servers | Names and properties are set in the RevenueCat integration settings. Record the exact names here once the first events arrive. |
| `checkout_started`, `subscription_activated` | — | Defined in `lib/analytics/events.ts` but never sent. Leave them unsent: RevenueCat's purchase events replace them. `tests/revenuecat-posthog.test.ts` stops the paywall from sending them. |

iOS sends only the curated `screen_viewed` event (WRE-249). iOS purchases still reach PostHog through RevenueCat.

The two web events were in the first commit of this branch and were removed after review: the in-app policy (`lib/legal.ts`, section 6) says optional telemetry is limited to page and screen categories, so a paywall or Customer Center event needs the privacy copy approved first.

## Setup checklist

Changing the RevenueCat or PostHog dashboards needs action-time approval.

1. **Decide on sandbox events.** Kouchd has one PostHog project for everything. Either leave sandbox events off in RevenueCat, or turn them on and filter by RevenueCat's environment property in every insight. Off is simpler.
2. **Privacy copy first.** Approve and ship the wording in [Privacy copy](#privacy-copy) before turning it on.
3. In RevenueCat, open the Kouchd project → **Integrations** → **PostHog**.
4. Paste the PostHog **project API key** (the public `phc_…` token from PostHog → Project settings). Do not commit it here. Set the host to US (`https://us.i.posthog.com`) if RevenueCat asks.
5. Keep RevenueCat's default event names unless there is a reason to change them, then record the names in the table above.
6. Confirm the integration covers both the Web Billing app and the App Store app.
7. Make a sandbox purchase on web and on iPhone, then run the check below.

## Verification

Run in PostHog SQL after the first test purchase:

```sql
SELECT event, distinct_id, person_id, timestamp
FROM events
WHERE timestamp > now() - INTERVAL 1 DAY
  AND event NOT LIKE '$%'
  AND event NOT LIKE 'Application %'
  AND event NOT IN ('screen_viewed')
ORDER BY timestamp DESC
LIMIT 50
```

Pass when the RevenueCat events appear, `distinct_id` is a Clerk ID (`user_…`), and `person_id` is that host's existing PostHog person. A RevenueCat ID (`$RCAnonymousID:…`) means the identity mapping broke.

Evidence so far: source and tests only. RevenueCat delivery and person matching are unverified.

## Privacy copy

Items 1 and 3 are done. Item 2 waits until the integration is turned on.

1. **RevenueCat named: resolved 2026-10-30.** Both privacy policies (`lib/legal.ts` here, `src/lib/legal.ts` in `kouchd_marketing`) list RevenueCat as a service provider for Kouchd Plus subscriptions; the in-app Cookie Policy's third-party list names it too.
2. **Plan data would reach PostHog.** Once the integration is on, PostHog receives plan, store, price and renewal details tied to the account ID. The updated policies describe web analytics but do not yet say RevenueCat shares this with PostHog. Add the sentence below before turning it on.
3. **Web autocapture and replay: resolved 2026-10-30.** Decision (Lee): keep web autocapture and session replay on, and make the policy match. `lib/legal.ts` Privacy Policy section 6 and the Cookie Policy "Performance and diagnostics" item now say the web app records page views and interactions, makes session replays with typed input hidden (other on-screen text such as names, household details and contribution amounts can appear), and links signed-in web sessions to the account ID, name and email (what `PostHogAuthSync` sends). The iPhone app wording stays as before. Effective and last-updated dates moved to October 30, 2026. Decision (Lee): no separate user notice; keep sending name and email with the web `identify`.

The marketing site's wording ("PostHog for product telemetry ... may be used") does not contradict items 2 and 3.

Wording for item 2:

- In-app Privacy and Cookie Policies, when the integration is turned on, add: "If you subscribe, RevenueCat also shares your plan, store, price, and renewal status with PostHog under your account identifier." Add the Kouchd Plus offer to the list of recorded interactions only if `paywall_viewed` is sent.
