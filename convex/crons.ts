import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("advance overdue recurring chores", { hourUTC: 12, minuteUTC: 45 }, internal.chores.advanceOverdueRecurring, {});
crons.daily("queue next-day reminders", { hourUTC: 13, minuteUTC: 0 }, internal.reminders.queueDailyReminders, {});
crons.daily("queue agreement pending morning", { hourUTC: 10, minuteUTC: 0 }, internal.reminders.queueAgreementPendingReminders, { slot: "am" });
crons.daily("queue agreement pending evening", { hourUTC: 22, minuteUTC: 0 }, internal.reminders.queueAgreementPendingReminders, { slot: "pm" });

export default crons;
