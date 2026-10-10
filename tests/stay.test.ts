import { describe, expect, it } from "vitest";

import { endStay } from "../lib/domain/stay";

describe("ending a stay", () => {
  it("retains the agreement, contributions, and chores", () => {
    const original = {
      status: "active" as const,
      agreement: { hostName: "Lee", guestName: "Marcus" },
      contributions: [{ id: "payment-1", amountCents: 20_000 }],
      chores: [{ id: "chore-1", title: "Trash" }],
    };

    const ended = endStay(original, "2026-09-04");
    expect(ended.status).toBe("ended");
    expect(ended.endedAt).toBe("2026-09-04");
    expect(ended.contributions).toEqual(original.contributions);
    expect(ended.chores).toEqual(original.chores);
    expect(original).not.toHaveProperty("endedAt");
  });

  it("is idempotent once ended", () => {
    const ended = {
      status: "ended" as const,
      agreement: { hostName: "Lee" },
      contributions: [],
      chores: [],
      endedAt: "2026-09-04",
    };
    expect(endStay(ended, "2026-09-05")).toBe(ended);
  });
});
