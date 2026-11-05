# Deployment & Rollback Procedures

## Continuous Deployment
Kouchd is deployed by Vercel's Git integration: every commit to `main` produces a production deployment.
The GitHub Actions `Release integrity` workflow runs alongside it:

- **Web verification and build** and **iOS release integrity and simulator build** run on every pull request
  and push. They use placeholder keys, so they prove the code builds, not that production is configured.
- **Production deploy smoke test** runs on pushes to `main` after the web job. It waits (up to 25 minutes)
  for Vercel's production deployment of that commit, using the deployment statuses Vercel reports to GitHub,
  then runs the smoke test below against `https://app.kouchd.com`. A failed smoke test fails the run and, when
  the `DEPLOY_ALERT_WEBHOOK_URL` repository secret is set (Slack-compatible incoming webhook), posts an alert.

### Required checks
Protect `main` so a red run blocks the merge: require the **Web verification and build** and
**iOS release integrity and simulator build** checks, require a pull-request review, and disallow force pushes.
`.github/CODEOWNERS` assigns review of CI, deploy and backend files.

### Build order: Vercel and Convex
`npm run vercel-build` runs `convex deploy --cmd 'npm run verify && npm run build'`. Convex runs the web build
first and pushes functions, indexes and schema only if that build succeeds, so a failed web build never leaves
the backend migrated. The new backend does go live a moment before Vercel promotes the new frontend, and a
frontend rollback leaves Convex on the newer code. So every schema and function change must work with both the
previous and the new frontend (expand, then contract):

1. Add new fields and tables as optional; keep old ones and old function signatures working.
2. Ship the frontend that uses them.
3. Remove what is no longer used in a later release.

## Verification & Smoke Test
Post-deployment verification checks liveness and readiness:

```bash
./scripts/smoke.sh https://app.kouchd.com
```

- `/api/health` is liveness only: the process answers, no external calls.
- `/api/health/ready` checks that the deployment reaches Convex (`<NEXT_PUBLIC_CONVEX_URL>/version`) and Clerk
  (the issuer's JWKS), each bounded by a 2.5 second timeout. It returns 503 with a per-service `checks` body
  when one fails.

The script exits non-zero if either endpoint does not return HTTP 200.

## Rollback Procedure
If a production incident occurs:

1. **Instant Rollback via Vercel CLI**:
   ```bash
   vercel rollback
   ```
   Or select and promote the prior deployment in the Vercel Dashboard under **Deployments** > **Instant Rollback**.

   This rolls back only the Vercel frontend. Each production build also runs `convex deploy`, so the Convex backend stays on the newer functions and schema. If the incident is in Convex code, also revert it (step 2); check that the older frontend works against the current backend before relying on the rollback alone.

2. **Git Revert**:
   Find the commit the bad deployment was built from (shown on the deployment in the Vercel Dashboard) and revert that commit or range, not simply `HEAD`, since `main` may have moved on:
   ```bash
   git revert <bad-commit-sha>
   git push origin main
   ```
   After an Instant Rollback, Vercel stops assigning new production deployments to the production domain. Choose **Undo Rollback** in the Dashboard, or run `vercel promote <deployment-url>` on the new build, so the revert actually serves production.
