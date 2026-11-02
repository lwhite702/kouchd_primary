# Access Code Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the server from returning door codes and Wi-Fi passwords to guests who have not accepted an agreement or whose stay has ended.

**Architecture:** One pure helper decides what a member may see. The only two public queries that return a stay document, `stays.listMine` and `stays.getBundle`, pass through it. Clients keep reading the same fields and add a short explanation when codes are hidden.

**Tech Stack:** Convex, TypeScript, Vitest with `convex-test`, Next.js web client, SwiftUI iOS client.

**Spec:** `docs/superpowers/specs/2026-10-30-subleases-and-bill-splitting-design.md` (section 4, rollout step 1)

## Roadmap

The spec has six separately released steps. Each gets its own plan, written after the previous step ships, because each one changes the code the next one builds on.

| Step | Plan | Status |
| --- | --- | --- |
| 1 | Access code protection | This document |
| 2 | Bill splitting on Plus | Not written |
| 3 | Monthly rent | Not written |
| 4 | Sublease type, setup, consent, and lock | Not written |
| 5 | Checklists and deposit record | Not written |
| 6 | Blog post, sublease page, and help articles | Not written |

## Global Constraints

- Applies to all stays. No feature flag, no plan check.
- Fields hidden: `houseInfo.doorCode` and `houseInfo.wifiPassword` only. Every other `houseInfo` field stays visible.
- Hosts always see their own stay's codes, including after it ends.
- Copy uses "host", "guest", and "agreement", in a plain and respectful voice.
- This changes product behavior: it needs a Linear issue, a unique version, a substantive `[Unreleased]` changelog entry, and `npm run release:check` before promotion (`AGENTS.md`).
- Do not push, merge, or deploy without action-time approval.

## Review Focus

1. A guest who already accepted receives a new agreement version: they keep the codes while they decide. Pinned in Task 1.
2. A guest has accepted, but another guest has not, so the stay is still `pending`: the guest who accepted sees the codes. Pinned in Task 1.
3. A former guest rejoins through a referral code: no codes until they accept again. Pinned in Task 2.
4. An invited guest opens the app before accepting, on web or iOS: the other house details show with a clear explanation, not an error or an empty screen. Covered in Tasks 3 and 4.
5. A stay with no `houseInfo`: the response stays valid and the host's edit form still works. Pinned in Task 1.

Not fixable here: a host can type a code into `otherNotes` or `houseNotes`. Those stay visible, and Task 3 adds a hint on the host form.

---

### Task 1: Redaction helper and query changes

**Files:**
- Create: `convex/lib/houseInfoAccess.ts`
- Modify: `convex/stays.ts` (`listMine` near line 229, `getBundle` near line 243)
- Modify: `tests/backend.test.ts:586-590` (this test currently expects a guest who has not accepted to see the codes)
- Create: `tests/house-info-access.test.ts`

**Interfaces:**
- Produces: `canViewAccessCodes(stay: Pick<Doc<"stays">, "status">, membership: Pick<Doc<"memberships">, "role" | "acceptedTermsId">): boolean`
- Produces: `redactStayForMember<T extends Pick<Doc<"stays">, "status" | "houseInfo">>(stay: T, membership: Pick<Doc<"memberships">, "role" | "acceptedTermsId">): T`

- [x] **Step 1: Write the failing tests in `tests/house-info-access.test.ts`**

Use the `convexTest`, `import.meta.glob`, and identity setup from `tests/shopping-privacy.test.ts`, and `grantPlus` from `tests/helpers/plans.ts` for two-guest fixtures. Set `houseInfo` to `{ wifiNetwork: "TestNet", wifiPassword: "test-pass", doorCode: "0000", trashDay: "Tuesday" }`. Run every assertion against both `getBundle` and `listMine`.

```ts
it("hides codes from a guest who has not accepted", ...);
// stay.houseInfo.doorCode and wifiPassword are undefined; wifiNetwork === "TestNet"; trashDay === "Tuesday"
it("shows codes after the guest accepts", ...);
// doorCode === "0000"; wifiPassword === "test-pass"
it("keeps codes when a new agreement version is waiting", ...);
// accept, host issues a new version, doorCode === "0000" before the guest accepts it
it("shows codes to an accepted guest while another guest has not accepted", ...);
// grantPlus, two guests, one accepts, stay.status === "pending", accepted guest sees "0000", other sees undefined
it("hides codes from an accepted guest after the stay ends", ...);
// accept, host calls stays.end, doorCode undefined, trashDay === "Tuesday"
it("always shows codes to the host, including after the stay ends", ...);
it("returns a valid response when the stay has no houseInfo", ...);
// guest query resolves and stay.houseInfo is undefined
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/house-info-access.test.ts`
Expected: FAIL on the "hides codes" tests, because the codes are returned.

- [x] **Step 3: Implement the helper and apply it in both queries**

`canViewAccessCodes` is true for `role === "host"`, otherwise `stay.status !== "ended" && Boolean(membership.acceptedTermsId)`. `redactStayForMember` returns the stay unchanged when allowed or when `houseInfo` is absent, and otherwise returns a copy with both keys removed, not set to empty strings. In `listMine` and `getBundle`, return `redactStayForMember(stay, membership)`. Inside `getBundle`, keep using the unredacted stay for term lookups.

- [x] **Step 4: Update `tests/backend.test.ts`**

Replace the final guest assertion with: before accepting, `doorCode` and `wifiPassword` are undefined and `wifiNetwork` is `"Kouchd-5G"`. Then call `api.terms.acceptCurrent` as in other tests in that file and assert `houseInfo` matches in full.

- [x] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/house-info-access.test.ts tests/backend.test.ts`
Expected: PASS. If `api.terms.acceptCurrent` has required arguments, copy the existing usage in `tests/backend.test.ts`.

- [x] **Step 6: Commit**

```bash
git add convex/lib/houseInfoAccess.ts convex/stays.ts tests/house-info-access.test.ts tests/backend.test.ts
git commit -m "fix: hide access codes from guests without an accepted agreement"
```

### Task 2: Require a new acceptance after rejoining

**Files:**
- Modify: `convex/referral.ts:93`
- Test: `tests/house-info-access.test.ts`

**Interfaces:**
- Consumes: `redactStayForMember` through `stays.getBundle`.

- [x] **Step 1: Write the failing test**

```ts
it("hides codes from a former guest who rejoins until they accept again", ...);
// accept; t.run patches the membership to status "left"; referral.joinWithCode;
// getBundle doorCode undefined; terms.acceptCurrent; doorCode === "0000"
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/house-info-access.test.ts -t "rejoins"`
Expected: FAIL, because the old `acceptedTermsId` survives the rejoin.

- [x] **Step 3: Clear acceptance on rejoin**

In the reactivation patch at `convex/referral.ts:93`, add `acceptedTermsId: undefined`.

- [x] **Step 4: Run the full suite to verify nothing regressed**

Run: `npx vitest run`
Expected: PASS. `convex/lib/stayTerms.ts:172-181` reads `acceptedTermsId`, so check rejoin ledger behavior if a test fails here, and report it rather than weakening the test.

- [x] **Step 5: Commit**

```bash
git add convex/referral.ts tests/house-info-access.test.ts
git commit -m "fix: require a new agreement acceptance after a guest rejoins"
```

### Task 3: Web explanation

**Files:**
- Modify: `components/household/household-logistics.tsx`
- Modify: the host house details form rendered from `components/workspace/use-live-stay.ts` (the form with the `doorCode` field)
- Test: the existing component test location for household components. If there is none, cover this with `npm run typecheck` and a manual check.

**Interfaces:**
- Consumes: `canViewAccessCodes` semantics, computed in the client from `bundle.stay.status` and `bundle.membership`. Do not import from `convex/lib` into components.

- [x] **Step 1: Add the guest explanation**

Add the prop `accessCodesHidden: "needs_acceptance" | "ended" | null` and show this exact copy in place of the codes:
- `needs_acceptance`: "Door and Wi-Fi codes appear after you accept your agreement."
- `ended`: "This stay has ended, so door and Wi-Fi codes are no longer shown."

The card must still render when the only `houseInfo` values are hidden.

- [x] **Step 2: Add the host form hint**

Exact copy: "Guests see door and Wi-Fi codes after they accept their agreement. Keep codes in these fields, not in notes."

- [x] **Step 3: Verify**

Run: `npm run lint && npm run typecheck`
Expected: PASS. Then check a guest before acceptance, an accepted guest, and an ended stay in the local app, using synthetic data.

- [x] **Step 4: Commit**

```bash
git add components/household/household-logistics.tsx components/workspace/use-live-stay.ts
git commit -m "feat(web): explain when access codes are hidden"
```

### Task 4: iOS explanation

**Files:**
- Modify: `ios/Kouchd/StayScreens.swift:50-58`
- Modify: `ios/Kouchd/HostExtras.swift` (`HouseInfoScreen`)
- Modify: `ios/Kouchd/StayLayoutTestHost.swift` only if the fixture needs a hidden-code state

**Interfaces:**
- Consumes: `store.bundle["stay"]["status"]` and `store.bundle["membership"]["acceptedTermsId"]`.

- [x] **Step 1: Add the guest explanation**

In "Around the home", use the same two messages as Task 3, chosen from those two bundle values. The existing "Your host hasn't added house details yet." message must not appear when the reason is hidden codes alone.

- [x] **Step 2: Add the host form hint**

Add the same hint copy from Task 3 to `HouseInfoScreen`.

- [x] **Step 3: Build and check in the simulator**

Build through the project's iOS workflow in `ios/README.md`, then check the same three states as Task 3.
Expected: the build succeeds and all three states read correctly.

- [x] **Step 4: Commit**

```bash
git add ios/Kouchd/StayScreens.swift ios/Kouchd/HostExtras.swift
git commit -m "feat(ios): explain when access codes are hidden"
```

### Task 5: Release records

**Files:**
- Modify: `CHANGELOG.md`, `docs/internal/CHANGELOG.md`
- Modify: the host and guest help pages under `help/` that describe house details
- Modify: `VERSION` and the version files listed in `AGENTS.md`, using the repository's release script

**Interfaces:**
- Consumes: the Linear issue created before Task 1.

- [x] **Step 1: Update the records**

Add the `[Unreleased]` entry and internal entry, and say in the relevant help pages that guests see door and Wi-Fi codes after accepting and no longer see them after a stay ends. The public changelog waits for a verified release.

- [x] **Step 2: Verify**

Run: `npm run verify && npm run build && npm run release:check && git diff --check`
Expected: all pass. `mintlify validate` and `mintlify broken-links` also pass where available.

- [x] **Step 3: Commit**

```bash
git add CHANGELOG.md docs/internal/CHANGELOG.md help VERSION package.json package-lock.json ios
git commit -m "docs: record access code protection"
```

## Done means

- All Task 1 and Task 2 tests pass, and `grep -n "stayDocument" convex/stays.ts` shows no public query returning a stay outside the helper.
- Web and iOS show the correct message in all three states.
- Passing tests are code evidence only. Production behavior is verified separately after an approved release.
