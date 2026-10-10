import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("queue next-day reminders", { hourUTC: 13, minuteUTC: 0 }, internal.reminders.queueDailyReminders, {});

export default crons;
