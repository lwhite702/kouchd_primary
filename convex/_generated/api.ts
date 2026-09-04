/* eslint-disable */
/**
 * Generated API utility.
 * Regenerate with `npx convex dev` after a deployment is linked.
 */
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import { anyApi } from "convex/server";
import type * as activity from "../activity.js";
import type * as chores from "../chores.js";
import type * as contributions from "../contributions.js";
import type * as invites from "../invites.js";
import type * as obligations from "../obligations.js";
import type * as stays from "../stays.js";
import type * as terms from "../terms.js";
import type * as users from "../users.js";

const fullApi: ApiFromModules<{
  activity: typeof activity;
  chores: typeof chores;
  contributions: typeof contributions;
  invites: typeof invites;
  obligations: typeof obligations;
  stays: typeof stays;
  terms: typeof terms;
  users: typeof users;
}> = anyApi as never;

export const api: FilterApi<typeof fullApi, FunctionReference<"query" | "mutation" | "action", "public">> = anyApi as never;
export const internal: FilterApi<typeof fullApi, FunctionReference<"query" | "mutation" | "action", "internal">> = anyApi as never;
