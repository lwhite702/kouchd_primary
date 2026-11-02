# Replay QA Security Verification Nonce

**File location:** `public/.well-known/replay-qa-security-nonce` and `app/.well-known/replay-qa-security-nonce/route.ts`

## Purpose
The `.well-known/replay-qa-security-nonce` file contains a public site-ownership verification token (`loopqa-sec-...`) utilized by the Replay QA automated testing infrastructure (`qa.replay.io`).

## Security Assessment
- **Nature of Token**: Public domain-ownership verification challenge response (analogous to ACME Let's Encrypt challenges or Google site verification HTML/DNS tokens).
- **Permissions**: This token does **not** authenticate users, authorize administrative actions, grant Convex/database access, or expose private keys or customer data.
- **Exposure**: Serving this file over HTTPS is intentional and required by Replay QA for cryptographic handshake and active security probes.
- **Scanning Exemption**: Static analysis tools flagging this file as a secret leak can safely mark it as an intended public verification asset.
