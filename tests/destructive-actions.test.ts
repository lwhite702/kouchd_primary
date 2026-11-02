import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { destructiveActionCopy } from "../components/workspace/types";

describe("destructive action confirmations", () => {
  it("explain that voided records keep their history", () => {
    for (const action of [
      { type: "voidContribution" as const, contributionId: "c" as Id<"contributions">, title: "$20.00 cash" },
      { type: "voidChore" as const, choreId: "h" as Id<"chores">, title: "Take out trash" },
      { type: "voidClaim" as const, claimId: "p" as Id<"pointClaims">, title: "Deep clean" },
    ]) {
      const copy = destructiveActionCopy(action);
      expect(copy.title).toBe(`Void “${action.title}”?`);
      expect(copy.confirmLabel).toBe("Void record");
      expect(copy.description).toContain("stays in the history");
    }
  });

  it("warn that a new join code stops the old one", () => {
    const copy = destructiveActionCopy({ type: "regenerateCode" });
    expect(copy.confirmLabel).toBe("Create new code");
    expect(copy.description).toContain("stops working");
  });

  it("keep the existing end-stay and cancel-charge wording", () => {
    expect(destructiveActionCopy({ type: "end" }).confirmLabel).toBe("End stay");
    expect(
      destructiveActionCopy({ type: "cancelCharge", obligationId: "o" as Id<"obligations">, title: "Utilities" }),
    ).toMatchObject({ title: "Cancel “Utilities”?", confirmLabel: "Cancel charge" });
  });
});
