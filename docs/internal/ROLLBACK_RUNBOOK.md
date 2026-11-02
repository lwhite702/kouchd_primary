# Kouchd Production Rollback & Smoke Test Runbook

This document outlines the standard operating procedures for post-deployment smoke testing, incident triage, and immediate rollback for Kouchd web and backend deployments.

---

## 1. Post-Deploy Smoke Test Checklist

After any production deployment to `app.kouchd.com`, complete the following automated or manual smoke tests:

1. **Document Responses & Headers**:
   - Verify `GET https://app.kouchd.com/` returns HTTP 200 with hardened security headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
   - Verify canonical link points to `https://app.kouchd.com/`.
   - Verify Content Security Policy (CSP) header is present and valid without console evaluation errors.

2. **Authentication Flow Smoke Test**:
   - Navigate to `/sign-in`.
   - Confirm Clerk authentication components render cleanly.
   - Confirm browser developer console shows 0 CSP violations or unhandled script rejections.
   - Test empty submission behavior: ensure email validation behaves properly.

3. **Backend & Telemetry Checks**:
   - Check Sentry error stream for new spikes or unhandled exceptions within the first 10 minutes.
   - Verify Convex deployment dashboard indicates healthy mutation and query throughput.

---

## 2. Emergency Rollback Procedures

### A. Vercel Instant Web Rollback (Fastest: < 1 minute)
If the web application experiences runtime crashes, unhandled errors, or visual regressions:
1. Open the [Vercel Dashboard](https://vercel.com/) -> Select `kouchd`.
2. Go to the **Deployments** tab.
3. Locate the previous known-healthy production deployment.
4. Click the three dots `...` on that deployment and select **Instant Rollback** (or **Promote to Production**).
5. Verify that traffic redirects to the previous build immediately.

*CLI Alternative:*
```bash
vercel rollback [deployment-url-or-id]
```

### B. Git & Code Revert (Source of Truth)
To ensure the repository history matches production:
1. Revert the problematic merge or commit on a hotfix branch:
   ```bash
   git checkout -b codex/hotfix-rollback-<issue>
   git revert -m 1 <merge-commit-hash> # If a merge commit
   # or: git revert <commit-hash>
   ```
2. Verify versions and release gate:
   ```bash
   npm run verify
   npm run release:check
   ```
3. Push branch and open emergency PR to `main`.

### C. Convex Backend & Schema Rollback Considerations
- **Schema Evolution Sequence**: Convex schema migrations must follow an expand-and-contract sequence. Fields to be modified or deprecated should first be made optional in schema validators. Data backfills or migrations run next. Deprecated fields and tables are only removed in a subsequent release after all active client versions stop reading and writing them.
- **Backend Deployment Scope**: In this repository, the `vercel-build` script (`convex deploy --cmd 'npm run verify && npm run build'`) deploys Convex schema and backend functions with every web build. An instant Vercel rollback (Step A) only rolls back the Next.js frontend/edge deployment; it does **not** roll back deployed Convex backend functions or mutations.
- If a new Convex mutation or schema introduces a runtime fault:
  - Rolling back the web app (Step A) stops new web clients from calling changed interfaces.
  - However, because Convex backend code remains at the latest deploy, backend functions require their own hotfix or a code revert deployed via `git revert` and `git push` so `convex deploy` pushes the corrected backend code.
- **Subscription Environment**: Ensure `SUBSCRIPTION_EXPECTED_ENVIRONMENT` is set to `production` in Convex deployment environment variables as well as Vercel.

---

## 3. Escalation and Verification
- **Incident Lead**: Notify engineering team on Linear / Discord.
- **Log Resolution**: Record the incident cause, duration, and rollback commit in `docs/internal/CHANGELOG.md`.
