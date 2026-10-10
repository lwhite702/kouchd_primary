import test from "node:test";
import assert from "node:assert/strict";

import { endStay } from "../src/stay.mjs";

test("ending a stay keeps its agreement, contributions, and chores", () => {
  const original = {
    agreement: { hostName: "Lee", guestName: "Marcus" },
    contributions: [{ id: "payment-1", value: 200 }],
    chores: [{ id: "chore-1", title: "Trash" }],
    activity: [],
  };

  const ended = endStay(original, "2026-09-04");

  assert.equal(ended.agreement.endedAt, "2026-09-04");
  assert.deepEqual(ended.contributions, original.contributions);
  assert.deepEqual(ended.chores, original.chores);
  assert.equal(original.agreement.endedAt, undefined);
});
