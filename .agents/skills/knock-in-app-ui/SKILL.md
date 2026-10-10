---
name: knock-in-app-ui
description: Build in-app messaging experiences, feeds, guides, and banners in Kouchd using Knock APIs and React SDK (@knocklabs/react). Use when implementing or customizing in-product notifications, announcement banners, onboarding modals, real-time message feeds, targeting rules, engagement tracking, or Knock channel configuration.
license: MIT
metadata:
  version: 1.0.0
---

# Building In-App UI with Knock in Kouchd

This internal developer guide provides specifications, architectural patterns, and code blueprints for building in-product messaging experiences within **Kouchd** using **Knock** APIs and SDKs.

---

## 1. Overview & Core Philosophy

Knock powers both **out-of-app notifications** (email, SMS, push) and **native in-app messaging experiences** within Kouchd.

### Separation of Presentation & Content
- **Kouchd owns the presentation**: Custom React components use Kouchd's design tokens (Forest `#184F3A`, Soft Sage `#E9F3EC`, Warm Paper `#FFFDF8`, `#DED8CE`), typography (Manrope), and accessibility standards.
- **Knock owns the orchestration & content**: Content copy, CTAs, targeting rules, activation conditions, and delivery cadences are managed centrally in the Knock dashboard.

### Core Capabilities
- **Real-Time Ready**: Built-in WebSocket connection delivers messages instantly without client polling.
- **Managed Notification State**: Badge counts, read/seen timestamps, archive status, and user dismissals are tracked automatically.
- **Cross-Channel Workflows**: Chain in-app banners/feeds with fallback email and SMS (e.g., *“Show an in-app banner for check-in; if unseen after 24h, send an SMS/email”*).
- **Graceful Fail-Open**: In local demo/offline mode or when Knock credentials are not yet set, components cleanly fail open without crashing the app.

---

## 2. Channel Types: Feeds vs. Guides

| Feature | In-App Feeds (`KnockFeedProvider`) | In-App Guides (`KnockGuideProvider`) |
| :--- | :--- | :--- |
| **Model** | Per-user list / history of messages | Single contextual message on page/view |
| **Use Cases** | Notification centers, activity alerts, ledger receipts | Announcement banners, welcome modals, paywalls |
| **SDK Hook** | `useNotifications`, `useFeedSettings` | `useGuide`, `useGuides` |
| **Lifecycle** | Persistent historical list (read, seen, archive) | Activated by targeting/page rules, dismissed once |
| **Kouchd Integration** | Household bell menu, ledger activity feeds | `<KouchdGuideBanner />`, `<KouchdGuideModal />` |

---

## 3. Architecture in Kouchd

### Providers: `components/knock/knock-guides-provider.tsx`
Wraps the application workspace with `KnockProvider` and `KnockGuideProvider`:

```tsx
"use client";

import React, { useMemo } from "react";
import { KnockProvider, KnockGuideProvider } from "@knocklabs/react";

interface KnockGuidesProviderProps {
  userId?: string;
  userProperties?: Record<string, unknown>;
  children: React.ReactNode;
}

export function KnockGuidesProvider({
  userId,
  userProperties,
  children,
}: KnockGuidesProviderProps) {
  const knockApiKey = process.env.NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY;
  const guideChannelId = process.env.NEXT_PUBLIC_KNOCK_GUIDES_CHANNEL_ID;

  const targetParams = useMemo(() => {
    return userProperties ? { data: userProperties } : undefined;
  }, [userProperties]);

  if (!knockApiKey || !guideChannelId) {
    return <>{children}</>;
  }

  return (
    <KnockProvider
      apiKey={knockApiKey}
      user={{ id: userId ?? null, ...(userProperties ?? {}) }}
      enabled={Boolean(userId)}
    >
      <KnockGuideProvider
        channelId={guideChannelId}
        readyToTarget={Boolean(userId)}
        targetParams={targetParams}
        trackLocationFromWindow={true}
      >
        {children}
      </KnockGuideProvider>
    </KnockProvider>
  );
}
```

### Components: `components/knock/kouchd-guides.tsx`
Provides native headless bindings to Knock Guides:

1. **`<KouchdGuideBanner guideKey="..." />`**:
   - Primary placement: Top of `<LiveStay>` in `components/authenticated-home.tsx`.
   - Used for: Maintenance notices, quiet hours alerts, check-in announcements.
   - Handlers:
     - Dismiss: `client.markAsArchived(guide, step)`
     - Primary CTA: `client.markAsInteracted(guide, step)`

2. **`<KouchdGuideModal guideKey="..." />`**:
   - Primary placement: Center modal inside `<LiveStay>`.
   - Used for: Welcome onboarding, terms acceptance prompts, milestone unlocked.
   - Handlers: Same lifecycle methods as banner.

---

## 4. Guide Step Schema for Knock Dashboard

When configuring a Guide in Knock:
- **Channel**: In-App Guide channel
- **Key**: Must match the `guideKey` prop in code (e.g. `household-notice-banner` or `welcome-modal`).

### Step Content JSON
```json
{
  "title": "Scheduled Water Heater Maintenance",
  "body": "Hot water will be briefly shut off between 10am and 12pm this Thursday.",
  "primary_button": {
    "text": "View Schedule",
    "action": "https://kouchd.com"
  },
  "dismissible": true
}
```

### Supported Targeting Parameters in Kouchd
Passed through `userProperties` in `SyncedWorkspace`:
- `stayId`: Active stay document ID
- `role`: `"host"` | `"guest"`
- `stayStatus`: `"active"` | `"pending"` | `"ended"`
- `financialGuestId`: Currently selected or authenticated guest ID

---

## 5. Environment Configuration

In `.env.local` or deployment settings:
```bash
NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY=pk_test_...
NEXT_PUBLIC_KNOCK_GUIDES_CHANNEL_ID=<knock-guide-channel-uuid>
```

---

## 6. Going to Production Checklist

1. [ ] Create In-App Guide channel in Knock dashboard and copy the channel UUID.
2. [ ] Add `NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY` and `NEXT_PUBLIC_KNOCK_GUIDES_CHANNEL_ID` to Vercel production environment variables.
3. [ ] Configure guides in Knock with appropriate keys (`household-notice-banner`, `welcome-modal`).
4. [ ] Define audience targeting rules in Knock matching Kouchd user properties (`role == "guest"`, `stayStatus == "active"`).
5. [ ] Verify user engagement tracking (`seen`, `interacted`, `archived`) in Knock Guide metrics.
