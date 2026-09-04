import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function recordActivity(
  ctx: MutationCtx,
  entry: {
    stayId: Id<"stays">;
    actorUserId: Id<"users">;
    kind: "stay" | "terms" | "invite" | "contribution" | "chore" | "check_in" | "obligation";
    action: string;
    detail: string;
    entityId?: string;
  },
) {
  return await ctx.db.insert("activity", { ...entry, createdAt: Date.now() });
}
