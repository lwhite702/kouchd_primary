import ClerkKit
import ClerkKitUI
import ConvexMobile
import SwiftUI

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
          .font(.largeTitle.bold()).foregroundStyle(Palette.link)
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
                "stayId": store.selectedStayID, "title": title, "points": Int(points) ?? 0,
                "note": note, "date": Display.date()
              ]
              if !selectedRule.isEmpty { args["ruleId"] = selectedRule }
              if await store.mutate("rewards:submitClaim", args) { title = ""; points = ""; note = ""; selectedRule = "" }
            }
          }.disabled(title.isEmpty || (Int(points) ?? 0) <= 0)
          TextField("Points to redeem", text: $redeemPoints).keyboardType(.numberPad)
          Button("Redeem toward balance") {
            Task { _ = await store.mutate("rewards:redeem", [
              "stayId": store.selectedStayID, "points": Int(redeemPoints) ?? 0,
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
  @AppStorage("kouchd.darkModeEnabled") private var darkModeEnabled = false
  @State private var name = ""
  @State private var phone = ""
  @State private var email = true
  @State private var sms = false
  var body: some View {
    Page(title: "Settings") {
      Card {
        Text("Appearance").font(.headline)
        Toggle("Dark mode", isOn: $darkModeEnabled)
          .tint(Palette.link)
        Text(darkModeEnabled
             ? "Kouchd will stay in dark mode."
             : "Kouchd follows your iPhone’s appearance.")
          .font(.subheadline)
          .foregroundStyle(Palette.muted)
      }
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
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
          .foregroundStyle(Palette.ink).underline()
        Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
          .foregroundStyle(Palette.ink).underline()
        Link("SMS Terms Details", destination: URL(string: "https://kouchd.com/sms-opt-in")!)
          .foregroundStyle(Palette.ink).underline()
        PrimaryButton(title: "Save preferences") {
          Task {
            let parts = name.split(whereSeparator: \.isWhitespace).map(String.init)
            guard let first = parts.first, let user = clerk.user else {
              store.error = "Enter your name before saving."
              return
            }
            do {
              _ = try await user.update(.init(firstName: first, lastName: parts.dropFirst().joined(separator: " ")))
              guard await store.mutate("users:syncCurrent", ["clerkName": name]) else { return }
            } catch {
              store.error = error.localizedDescription
              return
            }
            _ = await store.mutate("users:updatePreferences", [
              "phone": phone,
              "notifyEmail": email, "notifySms": sms,
              "smsConsentSource": "settings", "smsConsentConfirmed": sms
            ])
          }
        }
      }
      Card {
        Text("Account").font(.headline)
        NavigationRow("About Kouchd", symbol: "info.circle") { AboutKouchdScreen() }
        UserButton().frame(minWidth: 44, minHeight: 44)
        DataRow(title: "Kouchd version",
                detail: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
        Button("Sign out") {
          Task { try? await clerk.auth.signOut(sessionId: clerk.session?.id) }
        }
      }
      if !store.selectedStayID.isEmpty {
        NavigationRow("Household guide", symbol: "book") { HouseholdGuideScreen(store: store) }
      }
      if store.adminAccess.flag {
        NavigationRow("Platform administration", symbol: "lock.shield") { AdminScreen(store: store) }
      }
    }
    .onAppear {
      name = store.viewer["name"].text
      phone = store.viewer["phone"].text
      email = store.viewer["notifyEmail"].flag
      sms = store.viewer["notifySms"].flag
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
        NavigationLink {
          AdminUserScreen(store: store, userID: user.id)
        } label: {
          Card {
            Text(user["name"].text).font(.headline)
            Text(user["email"].text).font(.subheadline).foregroundStyle(Palette.muted)
          }
        }.buttonStyle(.plain)
      }
      ForEach(store.adminStays.items.indices, id: \.self) { index in
        let stay = store.adminStays.items[index]
        NavigationLink {
          AdminStayScreen(store: store, stayID: stay.id)
        } label: {
          Card {
            Text(stay["hostName"].text + "'s stay").font(.headline)
            DataRow(title: "Status", detail: stay["status"].text)
            DataRow(title: "Balance", detail: Display.money(stay["balanceCents"].int))
          }
        }.buttonStyle(.plain)
      }
      NavigationRow("Contribution records and exceptions", symbol: "list.bullet.clipboard") { AdminFinancialScreen(store: store) }
      NavigationRow("SMS consent history", symbol: "message") { AdminSMSHistory(events: store.adminSms) }
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
          NavigationRow("View stay", symbol: "house") { AdminStayScreen(store: store, stayID: member["stayId"].text) }
        }
      }
      NavigationRow("SMS consent history", symbol: "message") { AdminSMSHistory(events: store.adminUserDetail["smsEvents"].items) }
    }
    .task { store.loadAdminUser(userID) }
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
      Card {
        Text("Stay management").font(.headline)
        NavigationRow("Edit agreement", symbol: "doc.text") { TermsEditScreen(store: store) }
        NavigationRow("House details", symbol: "house") { HouseInfoScreen(store: store) }
        NavigationRow("Outside payment options", symbol: "creditcard") { PaymentOptionsScreen(store: store) }
        NavigationRow("Add a one-time charge", symbol: "plus.circle") { AdhocChargeScreen(store: store) }
        NavigationRow("Reward rules", symbol: "star") { RewardRulesScreen(store: store) }
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
        NavigationRow("Open stay details", symbol: "house") { StayScreen(store: store) }
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
      if await store.mutate("users:updateGuideProgress", ["role": role, "step": step, "status": status]), close { dismiss() }
    }
  }
}
