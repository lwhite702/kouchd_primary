import ClerkKit
import ClerkKitUI
import ConvexMobile
import SwiftUI

struct MoreScreen: View {
  let store: KouchdStore

  private var usesOccupiedNights: Bool {
    store.bundle["terms"]["billingBasis"].text == "occupied_nights"
  }

  var body: some View {
    Page(title: "More", navigationTitle: "More") {
      Card {
        Text("The rest of your stay tools").font(.headline)
        Text("Home, Ledger, Chores, and Stay keep everyday tasks close. Use these tools for agreements, requests, rewards, and account details.")
          .font(.subheadline).foregroundStyle(Palette.muted)
      }

      if store.isHost {
        Card {
          Text("Manage this stay").font(.headline)
          if !store.isEnded {
            MoreActionRow(title: "Host controls", detail: "Edit the agreement, house details, and contribution options.", symbol: "slider.horizontal.3", route: .hostControls)
          }
          MoreActionRow(title: "Schedule requests", detail: "Review requests to change the contribution rhythm.", symbol: "calendar", route: .schedule)
          if usesOccupiedNights {
            MoreActionRow(title: "Occupied nights", detail: "Record or review nights included in the agreement.", symbol: "moon", route: .occupancy)
          }
          MoreActionRow(title: "Contribution rewards", detail: "Review submitted contributions and reward points.", symbol: "sparkles", route: .rewards)
          MoreActionRow(title: "Household activity", detail: "See recent changes and shared updates.", symbol: "clock.arrow.circlepath", route: .activity)
        }
      } else {
        Card {
          Text("Your stay").font(.headline)
          MoreActionRow(title: "Guest agreement", detail: "Read the shared expectations and review any changes.", symbol: "doc.text", route: .agreement)
          MoreActionRow(title: "Schedule requests", detail: "Ask your host to change the contribution rhythm.", symbol: "calendar", route: .schedule)
          if usesOccupiedNights {
            MoreActionRow(title: "Occupied nights", detail: "Review nights recorded for this stay.", symbol: "moon", route: .occupancy)
          }
          MoreActionRow(title: "Contribution rewards", detail: "Submit contributions for review or use available points.", symbol: "sparkles", route: .rewards)
          MoreActionRow(title: "Household activity", detail: "See recent changes and shared updates.", symbol: "clock.arrow.circlepath", route: .activity)
        }
      }

      Card {
        Text("Household coordination").font(.headline)
        MoreActionRow(title: "Shopping list", detail: "Keep shared items and your own list together.", symbol: "basket", route: .shopping)
        MoreActionRow(title: "Check-ins", detail: "Share updates and follow up with your host or guest.", symbol: "bubble.left.and.bubble.right", route: .checkins)
      }
      Card {
        Text("Account & help").font(.headline)
        MoreActionRow(title: "Profile & reminders", detail: "Update your name, phone number, and notifications.", symbol: "person.crop.circle", route: .settings)
        MoreActionRow(title: "Household guide", detail: "Learn how shared stay tools work.", symbol: "book.closed", route: .householdGuide)
        MoreActionRow(title: "About Kouchd", detail: "See what Kouchd helps hosts and guests manage.", symbol: "info.circle", route: .about)
        Link(destination: URL(string: "https://help.kouchd.com")!) {
          MoreExternalRow(title: "Help center", detail: "Find answers and contact support.", symbol: "questionmark.circle")
        }
      }

      Card {
        Text("Another stay").font(.headline)
        MoreActionRow(title: "Create a stay", detail: "Set up a new shared stay and its agreement.", symbol: "plus.circle", route: .createStay)
        MoreActionRow(title: "Join a stay", detail: "Enter an invitation code from your host.", symbol: "person.badge.plus", route: .joinCode)
      }

      if store.adminAccess.flag {
        Card {
          Text("Administration").font(.headline)
          MoreActionRow(title: "Platform administration", detail: "Review platform tools and audit records.", symbol: "shield.lefthalf.filled", route: .admin)
        }
      }
    }
  }
}

private struct MoreActionRow: View {
  let title: String
  let detail: String
  let symbol: String
  let route: KouchdRoute

  var body: some View {
    NavigationLink(value: route) {
      MoreRowLabel(title: title, detail: detail, symbol: symbol, showsChevron: true)
    }
    .buttonStyle(.plain)
  }
}

private struct MoreExternalRow: View {
  let title: String
  let detail: String
  let symbol: String

  var body: some View {
    MoreRowLabel(title: title, detail: detail, symbol: symbol, showsChevron: false)
  }
}

private struct MoreRowLabel: View {
  let title: String
  let detail: String
  let symbol: String
  let showsChevron: Bool

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: symbol)
        .font(.body.weight(.semibold)).foregroundStyle(Palette.forest)
        .frame(width: 40, height: 40)
        .background(Palette.cream, in: RoundedRectangle(cornerRadius: 12))
      VStack(alignment: .leading, spacing: 3) {
        Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
        Text(detail).font(.caption).foregroundStyle(Palette.muted).fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      if showsChevron {
        Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
      }
    }
    .padding(.vertical, 5)
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
  }
}

struct ScheduleScreen: View {
  let store: KouchdStore
  @State private var cadence = "daily"
  @State private var weekday = 1
  var body: some View {
    Page(title: "Schedule changes") {
      Card {
        Text("Change your contribution rhythm").font(.headline)
        Text("Guests can request a change. The host reviews it before it takes effect.")
          .font(.subheadline).foregroundStyle(Palette.muted)
      }
      if !store.isHost && !store.isEnded {
        Card {
          Picker("New rhythm", selection: $cadence) {
            Text("Daily").tag("daily"); Text("Weekly").tag("weekly")
          }.pickerStyle(.segmented)
          if cadence == "weekly" {
            Picker("Due weekday", selection: $weekday) {
              ForEach(0..<7) { day in
                Text(Calendar.current.weekdaySymbols[day]).tag(day)
              }
            }
          }
          PrimaryButton(title: "Request change") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID, "cadence": cadence
              ]
              if cadence == "weekly" { args["paymentDayOfWeek"] = Double(weekday) }
              _ = await store.mutate("paymentSchedule:requestChange", args)
            }
          }
        }
      }
      if store.schedule.isEmpty {
        EmptyCard(title: "No requests", message: "Schedule requests will appear here.")
      }
      ForEach(store.schedule, id: \.id) { request in
        Card {
          HStack {
            Text(request["guestName"].text).font(.headline)
            Spacer(); Pill(text: request["status"].text)
          }
          DataRow(title: "Requested", detail: request["requestedCadence"].text.capitalized)
          if store.isHost && request["status"].text == "pending" {
            HStack {
              Button("Approve") {
                Task { _ = await store.mutate("paymentSchedule:reviewRequest", [
                  "requestId": request.id, "decision": "approve"
                ]) }
              }
              Button("Reject") {
                Task { _ = await store.mutate("paymentSchedule:reviewRequest", [
                  "requestId": request.id, "decision": "reject"
                ]) }
              }
            }.buttonStyle(.bordered)
          }
        }
      }
    }
    .stayFeature(.schedule, store: store)
  }
}

struct OccupancyScreen: View {
  let store: KouchdStore
  @State private var date = Date.now
  var body: some View {
    Page(title: "Occupied nights") {
      Card {
        Text("Nights spent at the stay").font(.headline)
        Text("When the agreement uses occupied nights, the host records each night here.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        if store.isHost && !store.isEnded {
          if store.guests.count > 1 { GuestPicker(store: store) }
          DatePicker("Night", selection: $date, displayedComponents: .date)
          PrimaryButton(title: "Record night") {
            let guest = store.selectedGuestID.isEmpty
              ? store.guests.first?["person"]["id"].text ?? ""
              : store.selectedGuestID
            guard !guest.isEmpty else { return }
            Task { _ = await store.mutate("occupancy:recordOvernight", [
              "stayId": store.selectedStayID, "guestUserId": guest,
              "nightDate": Display.date(date)
            ]) }
          }
        }
      }
      if store.nights.isEmpty {
        EmptyCard(title: "No nights recorded", message: "Recorded nights appear here with their agreed amount.")
      }
      ForEach(store.nights, id: \.id) { night in
        Card {
          DataRow(title: night["nightDate"].text, detail: Display.money(night["amountCents"].int))
          if store.isHost && !store.isEnded && night["voidedAt"].text.isEmpty {
            Button("Remove this night") {
              Task { _ = await store.mutate("occupancy:voidOvernight", [
                "occupiedNightId": night.id
              ]) }
            }.tint(.red)
          }
        }
      }
    }
    .stayFeature(.occupancy, store: store)
  }
}

struct RewardsScreen: View {
  let store: KouchdStore
  @State private var title = ""
  @State private var points = ""
  @State private var note = ""
  @State private var redeemPoints = ""
  @State private var selectedRule = ""
  var body: some View {
    Page(title: "Contribution rewards") {
      if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
      Card {
        Pill(text: store.wallet["settings"]["coinName"].text.isEmpty
             ? "Points" : store.wallet["settings"]["coinName"].text)
        Text("\(store.wallet["availablePoints"].int) available")
          .font(.largeTitle.bold()).foregroundStyle(Palette.forest)
        DataRow(title: "Credit value", detail: Display.money(store.wallet["dollarEquivalentCents"].int))
      }
      if !store.isHost && !store.isEnded && store.wallet["settings"]["enabled"].flag {
        Card {
          Text("Submit a contribution").font(.headline)
          Picker("Suggested task", selection: $selectedRule) {
            Text("Custom contribution").tag("")
            ForEach(store.rules.filter { $0["isActive"].flag }, id: \.id) { rule in
              Text(rule.title + " · \(rule["pointsAwarded"].int) pts").tag(rule.id)
            }
          }
          .onChange(of: selectedRule) { _, id in
            if let rule = store.rules.first(where: { $0.id == id }) {
              title = rule.title
              points = String(rule["pointsAwarded"].int)
            }
          }
          TextField("What did you do?", text: $title)
          TextField("Points", text: $points).keyboardType(.numberPad)
          TextField("Details", text: $note)
          PrimaryButton(title: "Submit for review") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID, "title": title, "points": Double(Int(points) ?? 0),
                "note": note, "date": Display.date()
              ]
              if !selectedRule.isEmpty { args["ruleId"] = selectedRule }
              if await store.mutate("rewards:submitClaim", args) { title = ""; points = ""; note = ""; selectedRule = "" }
            }
          }.disabled(title.isEmpty || (Int(points) ?? 0) <= 0)
          TextField("Points to redeem", text: $redeemPoints).keyboardType(.numberPad)
          Button("Redeem toward balance") {
            Task { _ = await store.mutate("rewards:redeem", [
              "stayId": store.selectedStayID, "points": Double(Int(redeemPoints) ?? 0),
              "date": Display.date()
            ]) }
          }.disabled((Int(redeemPoints) ?? 0) <= 0)
        }
      }
      if store.wallet["claims"].items.isEmpty {
        EmptyCard(title: "No reward claims", message: "Household contributions can earn points after review.")
      }
      ForEach(store.wallet["claims"].items, id: \.id) { claim in
        Card {
          HStack {
            Text(claim.title).font(.headline)
            Spacer(); Pill(text: claim["status"].text)
          }
          DataRow(title: "Points", detail: "\(claim["points"].int)")
          if claim["status"].text != "voided" &&
             (store.isHost || claim["guestUserId"].text == store.viewer["id"].text) {
            VoidRecordButton(store: store, function: "rewards:voidClaim",
                             recordKey: "claimId", recordID: claim.id)
          }
          if store.isHost && !store.isEnded && claim["status"].text == "pending" {
            HStack {
              Button("Confirm") {
                Task { _ = await store.mutate("rewards:confirmClaim", ["claimId": claim.id]) }
              }
              Button("Dispute") {
                Task { _ = await store.mutate("rewards:disputeClaim", ["claimId": claim.id]) }
              }
            }.buttonStyle(.bordered)
          }
        }
      }
    }
    .stayFeature(.rewards, store: store)
  }
}

struct ActivityScreen: View {
  let store: KouchdStore
  var body: some View {
    Page(title: "Household activity") {
      if store.activity.isEmpty {
        EmptyCard(title: "Quiet for now", message: "Stay updates will appear here.")
      }
      ForEach(store.activity, id: \.id) { event in
        Card {
          Text(event["detail"].text).font(.headline)
          Text(event["kind"].text.capitalized).font(.caption).foregroundStyle(Palette.muted)
        }
      }
    }
  }
}

struct SettingsScreen: View {
  let store: KouchdStore
  @Environment(Clerk.self) private var clerk
  @State private var name = ""
  @State private var phone = ""
  @State private var email = true
  @State private var sms = false
  @State private var showAccount = false
  @State private var saving = false
  var body: some View {
    Page(title: "Settings") {
      Card {
        Text("Your profile").font(.headline)
        TextField("Name", text: $name).textContentType(.name)
        TextField("Phone", text: $phone).keyboardType(.phonePad)
        Toggle("Email reminders", isOn: $email)
        Toggle("SMS reminders", isOn: $sms)
        if sms {
          Text("By enabling SMS reminders, you agree to receive transactional text messages from Wrelik Brands LLC (operating Kouchd). Message and data rates may apply. Message frequency varies. Text STOP to cancel, HELP for help. Consent is not a condition of purchase or any stay agreement. We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.")
            .font(.footnote).foregroundStyle(Palette.muted)
        }
        DisclosureGroup("Legal and privacy details") {
          Text("Review how Kouchd handles account, stay, and reminder information.")
            .font(.footnote).foregroundStyle(Palette.muted)
          Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
          Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
          Link("SMS Terms Details", destination: URL(string: "https://kouchd.com/sms-opt-in")!)
        }
        .font(.subheadline.weight(.semibold))
        PrimaryButton(title: "Save preferences") {
          savePreferences()
        }.disabled(saving)
      }
      Card {
        Text("Account").font(.headline)
        if store.isSubscriptionSummaryLoading {
          ProgressView("Checking subscription access")
        } else if !store.subscriptionSummaryError.isEmpty {
          Text("Kouchd couldn't check subscription access.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)
          Button("Try again") { store.loadAccount() }
        } else if store.subscriptionSummary["canManageSubscription"].flag {
          NavigationLink("Subscription", value: KouchdRoute.subscription)
        }
        NavigationLink("About Kouchd", value: KouchdRoute.about)
        Button("Manage account & security") { showAccount = true }
        DataRow(title: "Kouchd version",
                detail: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
        Button("Sign out") {
          Task { try? await clerk.auth.signOut(sessionId: clerk.session?.id) }
        }
      }
      if !store.selectedStayID.isEmpty {
        NavigationLink("Household guide", value: KouchdRoute.householdGuide)
      }
      if store.adminAccess.flag {
        NavigationLink("Platform administration", value: KouchdRoute.admin)
      }
    }
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Save") { savePreferences() }.disabled(saving)
      }
    }
    .onAppear {
      name = store.viewer["name"].text
      phone = store.viewer["phone"].text
      email = store.viewer["notifyEmail"].flag
      sms = store.viewer["notifySms"].flag
    }
    .sheet(isPresented: $showAccount) { UserProfileView().environment(\.clerkTheme, .kouchd) }
  }

  private func savePreferences() {
    guard !saving else { return }
    saving = true
    Task {
      defer { saving = false }
      let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmed.isEmpty else {
        store.error = "Enter your name before saving."
        return
      }
      let parts = trimmed.split(whereSeparator: \.isWhitespace).map(String.init)
      guard let first = parts.first else {
        store.error = "Enter your name before saving."
        return
      }

      // Update Convex first with the verified display name
      guard await store.mutate("users:syncCurrent", ["clerkName": trimmed]) else { return }

      // Best-effort sync to Clerk profile
      if let user = clerk.user {
        do {
          let last = parts.dropFirst().joined(separator: " ")
          if last.isEmpty {
            _ = try await user.update(.init(firstName: first))
          } else {
            _ = try await user.update(.init(firstName: first, lastName: last))
          }
        } catch {
          // Keep Convex update active even if Clerk user update throws
        }
      }

      _ = await store.mutate("users:updatePreferences", [
        "phone": phone,
        "notifyEmail": email, "notifySms": sms,
        "smsConsentSource": "settings", "smsConsentConfirmed": sms
      ])
    }
  }
}

struct AdminScreen: View {
  let store: KouchdStore
  var body: some View {
    Page(title: "Platform overview") {
      Card {
        Text("Kouchd operations").font(.headline)
        DataRow(title: "Users", detail: "\(store.adminStats["totalUsers"].int)")
        DataRow(title: "Stays", detail: "\(store.adminStats["totalStays"].int)")
        DataRow(title: "Active", detail: "\(store.adminStats["activeStays"].int)")
        DataRow(title: "Pending contributions", detail: "\(store.adminStats["pendingContributionsCount"].int)")
        DataRow(title: "Disputes", detail: "\(store.adminStats["disputedContributionsCount"].int)")
      }
      Card {
        Text("User and stay records").font(.headline)
        DataRow(title: "Users returned", detail: "\(store.adminUsers.items.count)")
        DataRow(title: "Stays returned", detail: "\(store.adminStays.items.count)")
      }
      ForEach(store.adminUsers.items.indices, id: \.self) { index in
        let user = store.adminUsers.items[index]
        NavigationLink(value: KouchdRoute.adminUser(id: user.id)) {
          Card {
            Text(user["name"].text).font(.headline)
            Text(user["email"].text).font(.subheadline).foregroundStyle(Palette.muted)
          }
        }.buttonStyle(.plain)
      }
      ForEach(store.adminStays.items.indices, id: \.self) { index in
        let stay = store.adminStays.items[index]
        NavigationLink(value: KouchdRoute.adminStay(id: stay.id)) {
          Card {
            Text(stay["hostName"].text + "'s stay").font(.headline)
            DataRow(title: "Status", detail: stay["status"].text)
            DataRow(title: "Balance", detail: Display.money(stay["balanceCents"].int))
          }
        }.buttonStyle(.plain)
      }
      NavigationLink("Contribution records and exceptions", value: KouchdRoute.adminFinancial)
      NavigationLink("SMS consent history", value: KouchdRoute.adminSmsHistory)
      Card {
        Text("Financial exceptions").font(.headline)
        DataRow(title: "Recent contributions",
                detail: "\(store.adminFinancials["contributions"].items.count)")
        DataRow(title: "Audited charges",
                detail: "\(store.adminFinancials["auditedObligations"].items.count)")
      }
      Card {
        Text("SMS consent events").font(.headline)
        Text("\(store.adminSms.count) recent events").font(.subheadline)
      }
    }
    .task { store.loadAdmin() }
    .onDisappear { store.stopAdmin("overview") }
  }
}

struct AdminUserScreen: View {
  let store: KouchdStore
  let userID: String
  @State private var confirmRoleChange = false
  var body: some View {
    Page(title: store.adminUserDetail["user"]["name"].text) {
      Card {
        DataRow(title: "Email", detail: store.adminUserDetail["user"]["email"].text)
        DataRow(title: "Stays", detail: "\(store.adminUserDetail["memberships"].items.count)")
        DataRow(title: "SMS events", detail: "\(store.adminUserDetail["smsEvents"].items.count)")
        DataRow(title: "Phone", detail: store.adminUserDetail["user"]["phone"].text)
        DataRow(title: "Email reminders", detail: store.adminUserDetail["user"]["notifyEmail"].flag ? "On" : "Off")
        DataRow(title: "SMS reminders", detail: store.adminUserDetail["user"]["notifySms"].flag ? "On" : "Off")
      }
      Card {
        Text("Platform access").font(.headline)
        DataRow(title: "Administrator", detail: store.adminUserDetail["user"]["isAdmin"].flag ? "Yes" : "No")
        Button(store.adminUserDetail["user"]["isAdmin"].flag ? "Remove administrator access" : "Grant administrator access") {
          confirmRoleChange = true
        }.disabled(!store.adminAccess.flag || store.adminUserDetail["user"].id.isEmpty)
      }
      ForEach(store.adminUserDetail["memberships"].items.indices, id: \.self) { index in
        let member = store.adminUserDetail["memberships"].items[index]
        Card {
          Text(member["role"].text.capitalized).font(.headline)
          Text(member["status"].text.capitalized).font(.subheadline)
          DataRow(title: "Host", detail: member["hostName"].text)
          DataRow(title: "Stay status", detail: member["stayStatus"].text)
          NavigationLink("View stay", value: KouchdRoute.adminStay(id: member["stayId"].text))
        }
      }
      NavigationLink("SMS consent history", value: KouchdRoute.adminUserSmsHistory(userID: userID))
    }
    .task { store.loadAdminUser(userID) }
    .onDisappear { store.stopAdmin("user") }
    .confirmationDialog("Change this person's platform access?", isPresented: $confirmRoleChange) {
      Button(store.adminUserDetail["user"]["isAdmin"].flag ? "Remove administrator access" : "Grant administrator access", role: .destructive) {
        Task { _ = await store.mutate("admin:toggleAdmin", [
          "userId": userID, "isAdmin": !store.adminUserDetail["user"]["isAdmin"].flag
        ]) }
      }
    } message: { Text("Administrators can view platform user, household, financial, and SMS consent records.") }
  }
}

struct AdminStayScreen: View {
  let store: KouchdStore
  let stayID: String
  var body: some View {
    Page(title: "Stay record") {
      Card {
        DataRow(title: "Status", detail: store.adminStayDetail["stay"]["status"].text)
        DataRow(title: "Host", detail: store.adminStayDetail["host"]["name"].text)
        DataRow(title: "Members", detail: "\(store.adminStayDetail["members"].items.count)")
        DataRow(title: "Contributions", detail: "\(store.adminStayDetail["contributions"].items.count)")
        DataRow(title: "Chores", detail: "\(store.adminStayDetail["chores"].items.count)")
      }
      ForEach(store.adminStayDetail["members"].items.indices, id: \.self) { index in
        let member = store.adminStayDetail["members"].items[index]
        Card {
          Text(member["user"]["name"].text).font(.headline)
          DataRow(title: "Role", detail: member["role"].text)
          DataRow(title: "Status", detail: member["status"].text)
        }
      }
      AdminContributionList(records: store.adminStayDetail["contributions"].items)
      AdminObligationList(records: store.adminStayDetail["obligations"].items)
      ForEach(store.adminStayDetail["announcements"].items.indices, id: \.self) { index in
        let notice = store.adminStayDetail["announcements"].items[index]
        Card { Text(notice.title).font(.headline); Text(notice["body"].text) }
      }
      ForEach(store.adminStayDetail["chores"].items.indices, id: \.self) { index in
        let chore = store.adminStayDetail["chores"].items[index]
        Card { Text(chore.title).font(.headline); DataRow(title: "Completed", detail: chore["completed"].flag ? "Yes" : "No") }
      }
      ForEach(store.adminStayDetail["activity"].items.indices, id: \.self) { index in
        Card { Text(store.adminStayDetail["activity"].items[index]["detail"].text) }
      }
    }.task { store.loadAdminStay(stayID) }
      .onDisappear { store.stopAdmin("stay") }
  }
}

/// Mirrors the web "Automatic acceptance" setting backed by `stays:updateAgreementAutoAccept`.
private struct AgreementAutoAcceptCard: View {
  let store: KouchdStore
  @State private var enabled: Bool
  @State private var hours: Int
  @State private var saving = false

  init(store: KouchdStore) {
    self.store = store
    let stay = store.bundle["stay"]
    // Stays created before this setting existed default to on, 24 hours, as on web.
    _enabled = State(initialValue: HouseholdSettings.autoAcceptEnabled(stay["agreementAutoAcceptEnabled"]))
    _hours = State(initialValue: HouseholdSettings.autoAcceptHours(stay["agreementAutoAcceptHours"].int))
  }

  var body: some View {
    Card {
      Text("Automatic acceptance").font(.headline)
      Text("If a guest doesn't respond, their pending agreement is accepted after this many hours. Turn it off to require each guest to accept.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      Toggle("Accept pending agreements automatically", isOn: $enabled)
      if enabled {
        Stepper("After \(hours) \(hours == 1 ? "hour" : "hours")", value: $hours, in: HouseholdSettings.autoAcceptHourRange)
      }
      PrimaryButton(title: saving ? "Saving…" : "Save") {
        guard !saving else { return }
        saving = true
        Task {
          _ = await store.mutate("stays:updateAgreementAutoAccept", [
            "stayId": store.selectedStayID, "enabled": enabled, "hours": Double(hours)
          ])
          saving = false
        }
      }.disabled(saving)
    }
  }
}

/// Mirrors the web guest preferred-name field backed by `stays:updateGuestPreferredName`.
private struct GuestNamesCard: View {
  let store: KouchdStore
  @State private var names: [String: String] = [:]
  @State private var savingID = ""

  /// `stays:updateGuestPreferredName` only accepts active guests.
  private var activeGuests: [Value] { store.guests.filter { $0["membership"]["status"].text == "active" } }

  var body: some View {
    Card {
      Text("Guest display names").font(.headline)
      Text("Choose the name everyone in the stay sees for each guest.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      ForEach(activeGuests, id: \.guestPersonID) { guest in
        let id = guest.guestPersonID
        HStack {
          TextField("Display name", text: Binding(
            get: { names[id] ?? guest["person"]["name"].text },
            set: { names[id] = $0 }
          )).textFieldStyle(.roundedBorder)
          Button(savingID == id ? "Saving…" : "Save") {
            let name = names[id] ?? guest["person"]["name"].text
            savingID = id
            Task {
              _ = await store.mutate("stays:updateGuestPreferredName", [
                "stayId": store.selectedStayID, "guestUserId": id, "preferredName": name
              ])
              savingID = ""
            }
          }
          .buttonStyle(.bordered)
          .disabled(!savingID.isEmpty || !HouseholdSettings.isValidPreferredName(names[id] ?? guest["person"]["name"].text))
        }
      }
    }
  }
}

struct EndGuestAgreementCard: View {
  let store: KouchdStore
  @State private var guestToEnd: Value?
  private var activeGuests: [Value] { store.guests.filter { $0["membership"]["status"].text == "active" } }

  var body: some View {
    Card {
      Text("End a guest's agreement").font(.headline)
      Text("This removes the guest from the stay and opens up their spot. Their records are kept and come back if you invite them again. Their open chores move to everyone.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      ForEach(activeGuests, id: \.guestPersonID) { guest in
        Button("End \(guest["person"]["name"].text)'s agreement", role: .destructive) { guestToEnd = guest }
      }
    }
    .confirmationDialog(
      "End this agreement?",
      isPresented: Binding(get: { guestToEnd != nil }, set: { if !$0 { guestToEnd = nil } })
    ) {
      Button("End agreement", role: .destructive) {
        guard let id = guestToEnd?.guestPersonID else { return }
        Task { _ = await store.mutate("stays:endGuestAgreement", ["stayId": store.selectedStayID, "guestUserId": id]) }
      }
    }
  }
}

struct HostControlsScreen: View {
  let store: KouchdStore
  @State private var announcementTitle = ""
  @State private var announcementBody = ""
  @State private var showEndConfirmation = false
  var body: some View {
    Page(title: "Host controls") {
      Card {
        Text("Household announcement").font(.headline)
        TextField("Title", text: $announcementTitle)
        TextField("Message", text: $announcementBody, axis: .vertical)
        PrimaryButton(title: "Post announcement") {
          Task { _ = await store.mutate("announcements:create", [
            "stayId": store.selectedStayID,
            "title": announcementTitle, "body": announcementBody
          ]) }
        }
      }
      Card {
        Text("Referral code").font(.headline)
        Text(store.bundle["stay"]["referralCode"].text)
          .font(.title3.monospaced()).textSelection(.enabled)
        Button("Generate a new code") {
          Task { _ = await store.mutate("referral:regenerateCode", [
            "stayId": store.selectedStayID
          ]) }
        }
      }
      if !store.isEnded {
        AgreementAutoAcceptCard(store: store)
          .id("\(store.bundle["stay"]["agreementAutoAcceptEnabled"].flag)-\(store.bundle["stay"]["agreementAutoAcceptHours"].int)")
        if store.guests.contains(where: { $0["membership"]["status"].text == "active" }) { EndGuestAgreementCard(store: store) }
        if store.guests.contains(where: { $0["membership"]["status"].text == "active" }) { GuestNamesCard(store: store) }
      }
      Card {
        Text("Stay management").font(.headline)
        MoreActionRow(title: "Edit agreement", detail: "Update dates, contribution amount, and shared expectations.", symbol: "doc.text", route: .termsEdit)
        MoreActionRow(title: "House details", detail: "Share practical information about the home.", symbol: "house", route: .houseInfo)
        MoreActionRow(title: "Outside payment options", detail: "Explain how members can contribute outside Kouchd.", symbol: "creditcard", route: .paymentOptions)
        MoreActionRow(title: "Add a one-time charge", detail: "Record an agreed charge for this stay.", symbol: "plus.circle", route: .adhocCharge)
        MoreActionRow(title: "Reward rules", detail: "Set the points available for shared contributions.", symbol: "sparkles", route: .rewardRules)
      }
      Card {
        Text("End this stay").font(.headline)
        Text("The record is retained, but new activity stops.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Button("End stay", role: .destructive) { showEndConfirmation = true }
      }
    }
    .confirmationDialog("End this stay?", isPresented: $showEndConfirmation) {
      Button("End stay", role: .destructive) {
        Task { _ = await store.mutate("stays:end", ["stayId": store.selectedStayID]) }
      }
    }
  }
}


struct AdminFinancialScreen: View {
  let store: KouchdStore
  @State private var filter = "all"
  var body: some View {
    Page(title: "Financial records") {
      Picker("Status", selection: $filter) {
        Text("All").tag("all"); Text("Disputed").tag("disputed")
        Text("Pending").tag("pending"); Text("Confirmed").tag("confirmed")
      }
      AdminContributionList(records: store.adminFinancials["contributions"].items.filter {
        filter == "all" || $0["status"].text == filter
      })
      Text("Audited charges").font(.headline)
      AdminObligationList(records: store.adminFinancials["auditedObligations"].items)
    }
    .task { store.loadAdminFinancial() }
    .onDisappear { store.stopAdmin("financial") }
  }
}

struct AdminContributionList: View {
  let records: [Value]
  var body: some View {
    ForEach(records.indices, id: \.self) { index in
      let record = records[index]
      Card {
        HStack { Text(record["type"].text.capitalized).font(.headline); Spacer(); Pill(text: record["status"].text) }
        DataRow(title: "Amount", detail: Display.money(record["amountCents"].int))
        DataRow(title: "Date", detail: record["date"].text)
        if !record["guestName"].text.isEmpty { DataRow(title: "Guest", detail: record["guestName"].text) }
        if !record["creatorName"].text.isEmpty { DataRow(title: "Recorded by", detail: record["creatorName"].text) }
        Text(record["note"].text)
      }
    }
  }
}

struct AdminObligationList: View {
  let records: [Value]
  var body: some View {
    ForEach(records.indices, id: \.self) { index in
      let record = records[index]
      Card {
        Text(record.title.isEmpty ? "Stay contribution" : record.title).font(.headline)
        DataRow(title: "Amount", detail: Display.money(record["baseAmountCents"].int))
        DataRow(title: "Due", detail: record["dueDate"].text)
        if !record["voidedAt"].text.isEmpty { Pill(text: "Voided") }
        if !record["lateFeeWaivedAt"].text.isEmpty { Pill(text: "Late fee waived") }
      }
    }
  }
}

struct AdminSMSHistory: View {
  let events: [Value]
  var body: some View {
    Page(title: "SMS consent history") {
      if events.isEmpty { EmptyCard(title: "No events", message: "Consent events will appear here.") }
      ForEach(events.indices, id: \.self) { index in
        let event = events[index]
        Card {
          Text(event["userName"].text).font(.headline)
          DataRow(title: "Action", detail: event["action"].text.replacingOccurrences(of: "_", with: " "))
          DataRow(title: "Source", detail: event["source"].text)
          DataRow(title: "Phone", detail: event["phone"].text)
          DataRow(title: "Disclosure version", detail: event["consentVersion"].text)
          if event["recordedAt"].int > 0 {
            DataRow(title: "Recorded", detail: Date(timeIntervalSince1970: Double(event["recordedAt"].int) / 1000).formatted(date: .abbreviated, time: .shortened))
          }
        }
      }
    }
  }
}


struct HouseholdGuideScreen: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var step = 0
  private var role: String { store.isHost ? "host" : "guest" }
  private var guidance: [(title: String, detail: String)] {
    store.isHost ? [
      ("Welcome your guests", "Give your stay a name, add house details and outside payment options, then share a one-use invitation."),
      ("Agree on the stay", "Set dates, contribution rhythm and shared expectations. Guests review new agreement versions before continuing."),
      ("Keep a shared record", "Add contributions after money or supplies have been provided outside Kouchd. The other person confirms each record. Discuss disputed records together."),
      ("Share the little things", "Assign chores, review schedule requests and reward claims, and record occupied nights when the agreement uses them. Choose optional reminders in Settings.")
    ] : [
      ("Make yourself at home", "Review your host's invitation and current agreement. Choose your initial contribution rhythm and due weekday."),
      ("Find your house details", "Stay contains the Wi-Fi, access details, house notes and outside payment choices shared by your host."),
      ("Keep contributions clear", "Money moves outside Kouchd. Record what you provided in Ledger, then ask your host to confirm. Confirm or discuss records your host adds."),
      ("Coordinate your stay", "Track chores, request schedule changes, submit reward claims and review occupied-night records. SMS and email reminders are optional in Settings.")
    ]
  }
  var body: some View {
    Page(title: "Your household guide") {
      Card {
        Pill(text: "Step \(step + 1) of 4")
        Text(guidance[step].title).font(.title2.bold())
        Text(guidance[step].detail)
        HStack {
          if step > 0 { Button("Back") { advance(to: step - 1) } }
          Spacer()
          Button(step == 3 ? "Finish" : "Next") {
            if step == 3 { save(status: "completed", close: true) }
            else { advance(to: step + 1) }
          }.buttonStyle(.borderedProminent).tint(Palette.forest)
        }
        Button("Skip for now") { save(status: "skipped", close: true) }
        NavigationLink("Open stay details", value: KouchdRoute.stay)
      }
    }
    .onAppear {
      let progress = store.viewer["guideProgress"][role]
      step = progress["status"].text == "in_progress" ? min(3, max(0, progress["step"].int)) : 0
    }
  }
  private func advance(to next: Int) {
    step = next
    save(status: "in_progress", close: false)
  }
  private func save(status: String, close: Bool) {
    Task {
      if await store.mutate("users:updateGuideProgress", ["role": role, "step": Double(step), "status": status]), close { dismiss() }
    }
  }
}
