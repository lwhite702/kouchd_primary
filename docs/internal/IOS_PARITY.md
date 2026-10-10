# Native iOS parity review

Issue: WRE-162. Version candidate: 0.4.0. Source in the implementation branch
is separate from authenticated acceptance and distribution evidence.

| Web capability / design | Native source | Service |
| --- | --- | --- |
| Household and guest Home (Figma 16:282, 16:313) | `HomeScreen` | Stay bundle, ledger, chores, announcements, activity |
| Contributions (16:375) | `LedgerScreen`, `ContributionForm` | Guest-scoped obligations and contributions; confirm, dispute, void, fee waiver |
| Chores (16:406) | `ChoresScreen`, `ChoreForm` | Create, assign a guest, toggle, void |
| Invitation (16:344) | `InviteForm`, `InvitationScreen`, `RootView` | Hashed one-use preview/accept; invitation retained through sign-in |
| Payment review and receipt (16:437, 16:468) | Outside contribution form and status cards | Records and two-party confirmation; no payment collection |
| Create / join additional stays | `CreateStayScreen`, `JoinCodeScreen` | Stay creation, referral join, select returned stay |
| Guest agreement and changed terms | `AgreementScreen`, `TermsEditScreen` | Current and guest terms; acceptance, cadence and due weekday |
| House access and outside payment choices | `StayScreen`, `HouseInfoScreen`, `PaymentOptionsScreen` | Member-only stay bundle and host-only updates |
| Schedule changes | `ScheduleScreen` | Request, approve, reject |
| Occupied nights | `OccupancyScreen` | Host record/void; guest-scoped history |
| Rewards | `RewardsScreen`, `RewardRulesScreen`, `TermsEditScreen` | Rule selection/create/toggle, settings, claims, review, void, redeem |
| Household announcements / activity | `HostControlsScreen`, `ActivityScreen` | Create announcement, activity history |
| Reminders and profile | `SettingsScreen` | Clerk profile, Convex sync/preferences, explicit SMS disclosure and consent |
| Ended stay | Stay history and disabled write controls | Existing ended-stay guards plus native read-only controls |
| Resumable household guide | `HouseholdGuideScreen` | Existing host/guest guide progress |
| Administration | `AdminScreen`, user/stay/financial/SMS detail screens | Existing server authorization, user role changes with confirmation, isolated subscriptions and cache clearing |

## Acceptance still required

Every row needs a real development journey, then staging verification. Source
coverage and an unsigned build do not prove full feature parity. In particular:

- Validate Clerk Native API, native registration, Apple sign-in and JWT issuer
  settings with the real development host, two guests and administrator.
- Verify link return after sign-in on a device; confirm failed, used and expired
  links do not reveal household details or create duplicate membership.
- Compare each authenticated screen with its Figma frame. Additional web
  features reuse those visual rules; they still need visual acceptance.
- Exercise pending, confirmed, disputed and voided contribution records,
  agreement changes, multiple guests, network failures, rewards, and ended stays.
- Validate small display widths, Dynamic Type including accessibility sizes,
  VoiceOver focus and labels, and real-device TestFlight installation.
- Verify administrator access changes and resumable host/guest guides against
  current web behavior before claiming full current web parity.
