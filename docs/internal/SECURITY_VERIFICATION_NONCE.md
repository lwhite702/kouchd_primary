# Replay QA Security Verification Nonce

**File location:** `public/.well-known/replay-qa-security-nonce` and `app/.well-known/replay-qa-security-nonce/route.ts`

## Purpose
The `.well-known/replay-qa-security-nonce` file contains a public site-ownership verification token (`loopqa-sec-...`) utilized by the Replay QA automated testing infrastructure (`qa.replay.io`).

## Security Assessment
- **Nature of Token**: Public domain-ownership verification string used exclusively by Replay QA (`qa.replay.io`) to verify domain control for automated QA probes and replays.
- **Permissions**: This token confers no privileges: it does not authenticate users, authorize administrative actions, grant Convex/database access, or expose private keys or customer data. It is assumed and verified to be a passive validation challenge.
- **Exposure**: Serving this file over HTTPS is intentional and required by Replay QA for cryptographic handshake and active security probes.
- **Scoped Secret Scanner Allowlist**:
  - **Allowed Paths**: `public/.well-known/replay-qa-security-nonce`, `app/.well-known/replay-qa-security-nonce/route.ts`
  - **Token Prefix**: `loopqa-sec-`
  - **Owner**: Wrelik Engineering Lead (`@lwhite702`)
  - **Rotation Procedure**: If the token needs rotation or the Replay QA project is replaced, the owner updates the token value in both paths, updates `EXPECTED_NONCE` in `tests/replay-qa-nonce.test.ts` to match (historical changelog entries stay unchanged), and confirms verification in the Replay QA dashboard. Broad suppression of secret scanners is prohibited; only this exact file path and prefix are allowlisted.
