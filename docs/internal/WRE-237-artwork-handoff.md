# WRE-237 artwork handoff

**Repository:** `https://github.com/lwhite702/kouchd_primary`
**Target:** `main`
**Implementation commit:** `140ce93` (`feat(WRE-237): add brand artwork to onboarding`)

## Change

- Added four Kouchd artwork assets to the host and guest welcome steps, host/join start screen, and no-active-stays state.
- No workflow behavior or financial handling changed.

## Verification and release metadata

- `npm run lint` completed with zero errors and 15 existing warnings.
- `npm run typecheck` and `npm run build` passed on the implementation commit.
- The first GitHub release-integrity run required a unique RC version after `0.7.6` (recorded as `1.0.0-rc.7`); this handoff accompanies the `0.7.7` (recorded as `1.0.0-rc.8`) metadata, changelog, and documentation update.
- The first release-integrity run rejected the code-only commit because it still used `0.7.6` (recorded as `1.0.0-rc.7`); this follow-up adds the required RC metadata and documentation.
