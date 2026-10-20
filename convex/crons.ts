import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("advance overdue recurring chores", { hourUTC: 12, minuteUTC: 45 }, internal.chores.advanceOverdueRecurring, {});
crons.daily("queue next-day reminders", { hourUTC: 13, minuteUTC: 0 }, internal.reminders.queueDailyReminders, {});
crons.daily("queue agreement pending morning", { hourUTC: 13, minuteUTC: 30 }, internal.reminders.queueAgreementPendingReminders, { slot: "am" });

export default crons;
