export interface HouseRuleItem {
  id: string;
  category: "quiet_hours" | "guests" | "cleanliness" | "clean_air" | "shared_supplies" | "remote_work" | "custom";
  title: string;
  description: string;
  required: boolean;
}

export interface RuleCategoryDefinition {
  category: HouseRuleItem["category"];
  label: string;
  description: string;
  suggestions: Omit<HouseRuleItem, "category">[];
}

export const SUGGESTED_HOUSE_RULES: RuleCategoryDefinition[] = [
  {
    category: "quiet_hours",
    label: "Quiet Hours & Rest",
    description: "Keep common areas calm during nighttime and early mornings.",
    suggestions: [
      {
        id: "quiet_standard",
        title: "Standard quiet hours",
        description: "Quiet after 10:30 PM on weekdays and 11:30 PM on weekends until 8:00 AM.",
        required: true,
      },
      {
        id: "quiet_early_riser",
        title: "Early riser courtesy",
        description: "Use headphones and close bedroom doors when moving around before 8:00 AM.",
        required: false,
      },
    ],
  },
  {
    category: "cleanliness",
    label: "Kitchen & Cleanliness",
    description: "Standards for leaving common areas clean after daily use.",
    suggestions: [
      {
        id: "clean_sink_clear",
        title: "Clean sink policy",
        description: "Wash cookware or load the dishwasher immediately after meals; no dishes left in the sink overnight.",
        required: true,
      },
      {
        id: "clean_counters",
        title: "Wipe down shared surfaces",
        description: "Wipe stove, counters, and table after food preparation.",
        required: false,
      },
      {
        id: "clean_bathroom_amenities",
        title: "Bathroom reset",
        description: "Keep personal toiletries in your assigned bin/caddy and squeegee or rinse after showering.",
        required: false,
      },
    ],
  },
  {
    category: "guests",
    label: "Visitors & Guests",
    description: "Guidelines around day visitors and overnight stays.",
    suggestions: [
      {
        id: "guests_text_heads_up",
        title: "Prior text notice",
        description: "Send a quick group text before inviting any daytime guests into common areas.",
        required: true,
      },
      {
        id: "guests_overnight_limit",
        title: "Overnight guest limit",
        description: "Overnight guests must be discussed in advance; limit to maximum 2 consecutive nights per week.",
        required: false,
      },
    ],
  },
  {
    category: "shared_supplies",
    label: "Food & Shared Supplies",
    description: "Clear expectations around personal groceries and shared staples.",
    suggestions: [
      {
        id: "supplies_label_food",
        title: "Label personal food",
        description: "Label personal specialty groceries in fridge/pantry. Communal basics (oil, salt, spices) are shared.",
        required: true,
      },
      {
        id: "supplies_restock_courtesy",
        title: "Restock when you finish",
        description: "If you use the last of shared dish soap, paper towels, or toilet paper, put out the next roll or note it.",
        required: false,
      },
    ],
  },
  {
    category: "clean_air",
    label: "Substances & Clean Air",
    description: "Policies on smoking, vaping, and shared indoor air quality.",
    suggestions: [
      {
        id: "clean_air_smoke_free",
        title: "100% Smoke and vape free indoors",
        description: "No cigarette, vape, or cannabis smoking anywhere indoors. Designated outdoor spaces only.",
        required: true,
      },
    ],
  },
  {
    category: "remote_work",
    label: "Work From Home & Noise",
    description: "Professional courtesy for calls and meetings in shared spaces.",
    suggestions: [
      {
        id: "work_headphones",
        title: "Headphones for calls",
        description: "Use headphones for calls, video conferences, or music in common living rooms during work hours (9 AM - 5 PM).",
        required: false,
      },
    ],
  },
];
