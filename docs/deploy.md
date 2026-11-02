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

2. **Git Revert**:
   ```bash
   git revert HEAD
   git push origin main
   ```
   This will trigger a clean pipeline run and re-deploy the prior stable commit.
