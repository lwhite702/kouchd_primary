# Meta Pixel and Conversions API

**Issue:** [WRE-252](https://linear.app/wrelik/issue/WRE-252/kouchd-analytics-feature-flags-and-conversion-tracking-phased-plan), phase 5
**State (2026-10-31):** Policy text approved (Lee) and added to `lib/legal.ts` and the marketing `src/lib/legal.ts`, dated October 31, 2026. Pixel ID `1163132673323923` is set in Vercel once those changes are deployed. The Conversions API destination in PostHog is not set up yet.

Internal setup note. Excluded from Mintlify navigation.

## How it works

| Piece | Where | Behaviour |
| --- | --- | --- |
| Ads choice in the cookie banner | `kouchd_marketing` `src/components/common/CookieConsent.astro` | Third button, "Allow analytics and ads", appears only when `PUBLIC_META_PIXEL_ID` is set. Stored as `kouchd_ads_consent` in localStorage. |
| Shared consent cookie | `kouchd_marketing` `src/lib/consent.ts`, `ConsentBridge.astro` | `kouchd_consent` on `.kouchd.com`: `{analytics, ads, gpc}`. Global Privacy Control forces `ads: false`. |
| Pixel on kouchd.com | `kouchd_marketing` `src/components/common/MetaPixel.astro` | Only when the ID is set and the cookie says `ads: true`. `PageView` on every page, `ViewContent` on `/pricing`, `Lead` on app sign-up links. |
| Pixel in the web app | `components/meta-pixel.tsx`, `lib/analytics/consent.ts` | Only when `NEXT_PUBLIC_META_PIXEL_ID` is set and the same cookie says `ads: true` (and no GPC). `PageView` per route, and `CompleteRegistration` once for an account created in the last 30 minutes, with `eventID = signup_<Clerk ID>`. |
| Server copy of sign-ups | `convex/users.ts` | `user_signed_up` carries `meta_event_id = signup_<Clerk ID>`, the same ID as the browser event, so Meta can deduplicate. |
| Consent for server events | `components/posthog-provider.tsx` | `identify` sets the person property `ads_consent`. The Conversions API destination must filter on it. |
| CSP | `lib/security/csp.ts` | Allows `connect.facebook.net` and `www.facebook.com`. The marketing site has no CSP. |

iOS has no Meta code: it would need Apple's tracking permission prompt and the Meta SDK.

People who never visit kouchd.com, or who arrive straight at app.kouchd.com, have no ads choice, so the app Pixel stays off for them. An in-app consent prompt would be needed to change that.

## Turning it on (needs approval at each step)

1. **Approve and publish the policy text below** in both `lib/legal.ts` (app) and `src/lib/legal.ts` (marketing), with new document dates. Until then, keep the Pixel ID unset: the current policies promise no ad networks and no cross-context behavioural advertising.
2. In Meta Events Manager, create a Pixel (dataset) for kouchd.com and note the ID.
3. In Vercel, set `PUBLIC_META_PIXEL_ID` on the marketing project and `NEXT_PUBLIC_META_PIXEL_ID` on the app project. Redeploy both.
4. In PostHog → Data pipeline → Destinations, create **Meta Ads Conversions** (marked experimental in PostHog's docs). Use the same Pixel ID and a Conversions API access token from Events Manager. Configure it as follows:
   - **Events:** `user_signed_up`, plus RevenueCat's trial-start and initial-purchase events once that integration is on (see `REVENUECAT_POSTHOG.md`). Use the RevenueCat integration's own Meta option or this destination, not both.
   - **Filter:** person property `ads_consent` equals `true`.
   - **Event ID:** map `event_id` to `properties.meta_event_id` for `user_signed_up`.
   - **User data:** send hashed email from the person's `email` property.
5. Test with an Events Manager **test event code**. Browser and server copies of a sign-up should show as deduplicated. If nothing arrives (a known issue with the experimental destination), send the events from a Convex action to the Graph API instead.

## Draft policy text (for approval)

**App and marketing Privacy Policy: "How we disclose information"**, add:
> To advertising partners, only with your permission. If you choose "Allow analytics and ads" on kouchd.com, we use the Meta Pixel on kouchd.com and in the Kouchd web app, and send sign-up and subscription events to Meta's Conversions API, to measure and improve our ads. This may include a hashed email address, an advertising cookie identifier, and the event (for example, that you created an account). We never share SMS opt-in data, household details, agreements, or contribution records with advertising partners.

**Replace** the statements that Kouchd does not share personal information for cross-context behavioural advertising (marketing `src/lib/legal.ts` around lines 179, 191 and 257, and the matching app sections) with:
> We do not sell personal information. If you allow advertising cookies, we share limited information with Meta for ad measurement, which some U.S. state laws treat as "sharing" for cross-context behavioural advertising. You can opt out at any time with Cookie settings, and we treat a Global Privacy Control signal as an opt-out.

**Cookie Policy**, replace "We do not allow third-party advertising networks to place tracking cookies…" with:
> With your permission ("Allow analytics and ads"), the Meta Pixel sets cookies on kouchd.com and in the Kouchd web app to measure our ads. Without that choice, or when your browser sends Global Privacy Control, no advertising cookies are set.

**Also add:**
- A "Your Privacy Choices" link in the footers that opens Cookie settings.
- In the banner copy, a sentence naming Meta. The banner already does this when the Pixel ID is set.

Keep every SMS exclusion as it is.

## Verification once live

- Choose "Allow analytics": no requests to `facebook.com` or `facebook.net`.
- Choose "Allow analytics and ads": `fbevents.js` loads, and `PageView` shows in Events Manager.
- Browser with GPC on: no Meta requests, even after "Allow analytics and ads".
- New sign-up: the browser `CompleteRegistration` and the server `user_signed_up` appear in Events Manager with the same event ID.

Evidence so far: the marketing build with a test Pixel ID was checked in Chromium against `astro preview`:

| Choice | Meta requests | Consent cookie |
| --- | --- | --- |
| "Allow analytics" | 0 | `ads: false` |
| "Allow analytics and ads" | 1 (`fbevents.js`) | `ads: true` |
| "Allow analytics and ads" with GPC on | 0 | `ads: false`, `gpc: true` |

A build without an ID shows no ads button. The app Pixel is covered by unit tests of `adsConsented` only. Delivery to Meta is unverified.
