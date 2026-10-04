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
              if cadence == "weekly" { args["paymentDayOfWeek"] = weekday }
              _ = await store.mutate("paymentSchedule:requestChange", args)
            }
          }
        }
      }
      if store.schedule.isEmpty {
        EmptyCard(title: "No requests", message: "Schedule requests will appear here.")
      }
      ForEach(store.schedule.indices, id: \.self) { index in
        let request = store.schedule[index]
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
      ForEach(store.nights.indices, id: \.self) { index in
        let night = store.nights[index]
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
          TextField("What did you do?", text: $title)
          TextField("Points", text: $points).keyboardType(.numberPad)
          TextField("Details", text: $note)
          PrimaryButton(title: "Submit for review") {
            Task { _ = await store.mutate("rewards:submitClaim", [
              "stayId": store.selectedStayID, "title": title, "points": Int(points) ?? 0,
              "note": note, "date": Display.date()
            ]) }
          }
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
      ForEach(store.wallet["claims"].items.indices, id: \.self) { index in
        let claim = store.wallet["claims"].items[index]
        Card {
          HStack {
            Text(claim.title).font(.headline)
            Spacer(); Pill(text: claim["status"].text)
          }
          DataRow(title: "Points", detail: "\(claim["points"].int)")
          if store.isHost && claim["status"].text == "pending" {
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
      ForEach(store.activity.indices, id: \.self) { index in
        let event = store.activity[index]
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
  var body: some View {
    Page(title: "Settings") {
      Card {
        Text("Your profile").font(.headline)
        TextField("Name", text: $name).textContentType(.name)
        TextField("Phone", text: $phone).keyboardType(.phonePad)
        Toggle("Email reminders", isOn: $email)
        Toggle("SMS reminders", isOn: $sms)
        if sms {
          Text("By turning on SMS reminders, you agree to receive Kouchd stay messages. Message and data rates may apply. You can turn them off here.")
            .font(.footnote).foregroundStyle(Palette.muted)
        }
        PrimaryButton(title: "Save preferences") {
          Task {
            _ = await store.mutate("users:updatePreferences", [
              "name": name, "phone": phone,
              "notifyEmail": email, "notifySms": sms,
              "smsConsentSource": "settings", "smsConsentConfirmed": sms
            ])
          }
        }
      }
      Card {
        Text("Account").font(.headline)
        UserButton()
        DataRow(title: "Kouchd version",
                detail: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
        Button("Sign out") {
          Task { try? await clerk.auth.signOut(sessionId: clerk.session?.id) }
        }
      }
      if store.adminAccess.flag {
        NavigationLink("Platform administration") { AdminScreen(store: store) }
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
  var body: some View {
    Page(title: store.adminUserDetail["user"]["name"].text) {
      Card {
        DataRow(title: "Email", detail: store.adminUserDetail["user"]["email"].text)
        DataRow(title: "Stays", detail: "\(store.adminUserDetail["memberships"].items.count)")
        DataRow(title: "SMS events", detail: "\(store.adminUserDetail["smsEvents"].items.count)")
      }
      ForEach(store.adminUserDetail["memberships"].items.indices, id: \.self) { index in
        let member = store.adminUserDetail["memberships"].items[index]
        Card {
          Text(member["role"].text.capitalized).font(.headline)
          Text(member["status"].text.capitalized).font(.subheadline)
        }
      }
    }.task { store.loadAdminUser(userID) }
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
        NavigationLink("Edit agreement") { TermsEditScreen(store: store) }
        NavigationLink("House details") { HouseInfoScreen(store: store) }
        NavigationLink("Outside payment options") { PaymentOptionsScreen(store: store) }
        NavigationLink("Add a one-time charge") { AdhocChargeScreen(store: store) }
        NavigationLink("Reward rules") { RewardRulesScreen(store: store) }
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
