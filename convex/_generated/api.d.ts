/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as admin from "../admin.js";
import type * as announcements from "../announcements.js";
import type * as checkIns from "../checkIns.js";
import type * as chores from "../chores.js";
import type * as contributions from "../contributions.js";
import type * as crons from "../crons.js";
import type * as flags from "../flags.js";
import type * as invites from "../invites.js";
import type * as householdMigrations from "../householdMigrations.js";
import type * as householdOwnership from "../householdOwnership.js";
import type * as knock from "../knock.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_obligations from "../lib/obligations.js";
import type * as lib_stayTerms from "../lib/stayTerms.js";
import type * as lib_subscriptionAccess from "../lib/subscriptionAccess.js";
import type * as lib_validation from "../lib/validation.js";
import type * as notifications from "../notifications.js";
import type * as obligations from "../obligations.js";
import type * as occupancy from "../occupancy.js";
import type * as paymentSchedule from "../paymentSchedule.js";
import type * as referral from "../referral.js";
import type * as reminders from "../reminders.js";
import type * as rewards from "../rewards.js";
import type * as shopping from "../shopping.js";
import type * as stays from "../stays.js";
import type * as subscriptions from "../subscriptions.js";
import type * as subscriptionShadow from "../subscriptionShadow.js";
import type * as terms from "../terms.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  admin: typeof admin;
  announcements: typeof announcements;
  checkIns: typeof checkIns;
  chores: typeof chores;
  contributions: typeof contributions;
  crons: typeof crons;
  flags: typeof flags;
  invites: typeof invites;
  householdMigrations: typeof householdMigrations;
  householdOwnership: typeof householdOwnership;
  knock: typeof knock;
  "lib/activity": typeof lib_activity;
  "lib/auth": typeof lib_auth;
  "lib/names": typeof lib_names;
  "lib/obligations": typeof lib_obligations;
  "lib/stayTerms": typeof lib_stayTerms;
  "lib/subscriptionAccess": typeof lib_subscriptionAccess;
  "lib/validation": typeof lib_validation;
  notifications: typeof notifications;
  obligations: typeof obligations;
  occupancy: typeof occupancy;
  paymentSchedule: typeof paymentSchedule;
  referral: typeof referral;
  reminders: typeof reminders;
  rewards: typeof rewards;
  shopping: typeof shopping;
  stays: typeof stays;
  subscriptions: typeof subscriptions;
  subscriptionShadow: typeof subscriptionShadow;
  terms: typeof terms;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
