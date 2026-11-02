# Deployment & Rollback Procedures

## Continuous Deployment
Kouchd is deployed via Vercel. Every commit to `main` generates a production build, verified by GitHub Actions release-integrity workflow.

## Verification & Smoke Test
Post-deployment verification checks the service health endpoint:

```bash
./scripts/smoke.sh https://app.kouchd.com
```

The script exits non-zero if `/api/health` does not return HTTP 200.

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
