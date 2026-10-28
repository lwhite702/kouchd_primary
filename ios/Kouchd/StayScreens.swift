import ClerkKit
import ClerkKitUI
import ConvexMobile
import CryptoKit
import SwiftUI

struct StayScreen: View {
  let store: KouchdStore
  @State private var showingInvite = false
  @State private var showingGuestLimit = false
  private let plus = PlusAccess.shared
  private static let stayLimitMessage = "Kouchd is free for one active stay. Kouchd Plus lets you host up to three stays and three guests."
  @State private var showingEdit = false
  var body: some View {
    Page(title: "Your stay") {
      Text("Stay information").font(Palette.section)
      Card {
        HStack { Pill(text: store.isHost ? "Host" : "Guest"); Spacer(); Pill(text: store.bundle["stay"]["status"].text) }
        Text(store.stayName).font(.title2.bold())
        DataRow(title: "From", detail: store.bundle["terms"]["startDate"].text)
        DataRow(title: "Until", detail: store.bundle["terms"]["endDate"].text)
        DataRow(title: "Rhythm", detail: store.bundle["terms"]["cadence"].text.capitalized)
        DataRow(title: "Contribution", detail: Display.money(store.bundle["terms"]["rateCents"].int))
      }
      Card {
        Text("The people").font(.headline)
        ForEach(store.members.indices, id: \.self) { index in
          let member = store.members[index]
          DataRow(title: member["person"]["name"].text,
                  detail: member["membership"]["role"].text.capitalized)
        }
      }
      Card {
        Text("House notes").font(.headline)
        if store.bundle["terms"]["houseNotes"].text.isEmpty {
          Text("No house notes have been shared yet.")
            .font(.subheadline).foregroundStyle(Palette.muted)
        } else {
          Text(store.bundle["terms"]["houseNotes"].text)
            .font(.subheadline).foregroundStyle(Palette.ink)
        }
      }
      Card {
        Text("Latest announcement").font(.headline)
        if let announcement = store.announcements.first {
          Text(announcement.title).font(.subheadline.weight(.semibold))
          Text(announcement["body"].text)
            .font(.subheadline).foregroundStyle(Palette.muted)
        } else {
          Text("No household announcements yet.")
            .font(.subheadline).foregroundStyle(Palette.muted)
        }
      }
      Card {
        Text("Around the home").font(.headline)
        ForEach(HouseDetail.fields, id: \.key) { field in
          let detail = store.bundle["stay"]["houseInfo"][field.key].text
          if !detail.isEmpty { DataRow(title: field.label, detail: detail) }
        }
        if HouseDetail.fields.allSatisfy({ store.bundle["stay"]["houseInfo"][$0.key].text.isEmpty }) {
          Text(store.isHost
               ? "No house details have been shared yet."
               : "Your host hasn't added house details yet.")
            .font(.subheadline).foregroundStyle(Palette.muted)
        }
      }

      Text("Things you can do").font(Palette.section)
      ActionCard {
        Text("Stay planning").font(.headline)
        NavigationRow("Guest agreement", symbol: "doc.text") { AgreementScreen(store: store) }
        NavigationRow(
          "Schedule changes",
          subtitle: "Request or review changes to stay dates",
          symbol: "calendar.badge.clock"
        ) { ScheduleScreen(store: store) }
        NavigationRow("Occupied nights", symbol: "calendar") { OccupancyScreen(store: store) }
      }
      ActionCard {
        Text("Household").font(.headline)
        if store.isHost && !store.isEnded {
          PrimaryButton(title: "Invite a guest") {
            if plus.reachedGuestLimit(store) { showingGuestLimit = true } else { showingInvite = true }
          }
          NavigationRow("Edit house notes", subtitle: "Update the shared stay agreement", symbol: "note.text") {
            TermsEditScreen(store: store)
          }
          NavigationRow("Post an announcement", subtitle: "Share a household update", symbol: "megaphone") {
            HostControlsScreen(store: store)
          }
          NavigationRow("Add house details", subtitle: "Share Wi-Fi and access details", symbol: "house") {
            HouseInfoScreen(store: store)
          }
        }
        NavigationRow("Contribution rewards", symbol: "gift") { RewardsScreen(store: store) }
        NavigationRow("Household activity", symbol: "clock.arrow.circlepath") { ActivityScreen(store: store) }
      }
      ActionCard {
        Text("Account and stays").font(.headline)
        if store.isHost && !store.isEnded {
          Button("Edit stay name") { showingEdit = true }
            .buttonStyle(.bordered)
        }
        NavigationRow("Settings and reminders", symbol: "bell") { SettingsScreen(store: store) }
        if plus.reachedStayLimit(store) {
          NavigationRow("Create another stay", symbol: "plus.circle", badge: "Plus") {
            PlusLimitContent(title: "Add more stays", message: Self.stayLimitMessage)
          }
          NavigationRow("Join another stay", symbol: "person.badge.plus", badge: "Plus") {
            PlusLimitContent(title: "Add more stays", message: Self.stayLimitMessage)
          }
        } else {
          NavigationRow("Create another stay", symbol: "plus.circle") { CreateStayScreen(store: store) }
          NavigationRow("Join another stay", symbol: "person.badge.plus") { JoinCodeScreen(store: store) }
        }
        if store.isHost && !store.isEnded {
          NavigationRow("Host controls", symbol: "slider.horizontal.3") { HostControlsScreen(store: store) }
        }
      }
    }
    .sheet(isPresented: $showingInvite) { InviteForm(store: store) }
    .sheet(isPresented: $showingGuestLimit) {
      PlusLimitSheet(
        title: "Invite more guests",
        message: "Kouchd is free for one active stay and one active guest. Kouchd Plus lets you host up to three stays and three guests."
      )
    }
    .sheet(isPresented: $showingEdit) { RenameStayForm(store: store) }
  }
}

struct AgreementScreen: View {
  let store: KouchdStore
  @State private var cadence = "weekly"
  @State private var weekday = 1
  var body: some View {
    Page(title: "Your agreement") {
      Card {
        Pill(text: "Version \(store.bundle["terms"]["version"].int)")
        DataRow(title: "Dates", detail: store.bundle["terms"]["startDate"].text + " – " + store.bundle["terms"]["endDate"].text)
        DataRow(title: "Amount", detail: Display.money(store.bundle["terms"]["rateCents"].int))
        DataRow(title: "Cadence", detail: store.bundle["terms"]["cadence"].text.capitalized)
        DataRow(title: "Billing", detail: store.bundle["terms"]["billingBasis"].text.replacingOccurrences(of: "_", with: " ").capitalized)
        Text(store.bundle["terms"]["houseNotes"].text).font(.subheadline)
        ForEach(store.bundle["terms"]["houseRules"].items.indices, id: \.self) { index in
          let rule = store.bundle["terms"]["houseRules"].items[index]
          Text(rule["title"].text).font(.headline)
          Text(rule["description"].text).font(.subheadline)
        }
      }
      if !store.isHost && !store.isEnded &&
         store.bundle["membership"]["acceptedTermsId"].text != store.bundle["terms"]["_id"].text {
        Card {
          Text("Choose your contribution rhythm").font(.headline)
          Picker("Rhythm", selection: $cadence) {
            Text("Weekly").tag("weekly")
            Text("Daily").tag("daily")
          }.pickerStyle(.segmented)
          if cadence == "weekly" {
            Picker("Due weekday", selection: $weekday) {
              ForEach(0..<7) { day in
                Text(Calendar.current.weekdaySymbols[day]).tag(day)
              }
            }
          }
          PrimaryButton(title: "Accept current agreement") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID,
                "initialCadence": cadence
              ]
              if cadence == "weekly" { args["initialPaymentDayOfWeek"] = Double(weekday) }
              _ = await store.mutate("terms:acceptCurrent", args)
            }
          }
        }
      }
    }
    .onAppear {
      cadence = store.bundle["terms"]["cadence"].text.isEmpty ? "weekly" : store.bundle["terms"]["cadence"].text
    }
  }
}

struct InvitationScreen: View {
  let store: KouchdStore
  let token: String
  let preview: Value
  let onFinished: () -> Void
  var body: some View {
    NavigationStack {
      Page(title: "You're invited") {
        Card {
          Pill(text: "Invitation")
          Text(preview["hostName"].text + " has invited you to " + preview["stayName"].text + ".")
            .font(.title3.bold())
          DataRow(title: "From", detail: preview["terms"]["startDate"].text)
          DataRow(title: "Until", detail: preview["terms"]["endDate"].text)
          DataRow(title: "Contribution", detail: Display.money(preview["terms"]["rateCents"].int))
          Text(preview["terms"]["houseNotes"].text).font(.subheadline)
          PrimaryButton(title: "Join this stay") {
            Task {
              let hash = SHA256.hash(data: Data(token.utf8))
                .map { String(format: "%02x", $0) }.joined()
              if await store.joinOrCreateStay("invites:accept", ["tokenHash": hash]) { onFinished() }
            }
          }
        }
      }
      .toolbar { Button("Close") { onFinished() } }
    }
  }
}

struct InviteForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var email = ""
  @State private var link: URL?
  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("Guest email (optional)", text: $email)
            .keyboardType(.emailAddress).textInputAutocapitalization(.never)
          Text("Each link can be used once and expires in seven days.")
        }
        if let link {
          Section("Invite link") {
            ShareLink(item: link) { Label("Share invitation", systemImage: "square.and.arrow.up") }
            Text(link.absoluteString).textSelection(.enabled).font(.footnote)
          }
        }
      }
      .navigationTitle("Invite a guest")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Create") {
            Task {
              let token = UUID().uuidString.replacingOccurrences(of: "-", with: "")
                + UUID().uuidString.replacingOccurrences(of: "-", with: "")
              let hash = SHA256.hash(data: Data(token.utf8))
                .map { String(format: "%02x", $0) }.joined()
              guard let url = URL(string: "https://kouchd.com/invite/\(token)") else { return }
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID, "tokenHash": hash,
                "expiresAt": Date.now.addingTimeInterval(7 * 86_400).timeIntervalSince1970 * 1000,
                "inviteUrl": url.absoluteString
              ]
              if !email.isEmpty { args["invitedEmail"] = email }
              if await store.mutate("invites:create", args) { link = url }
            }
          }
        }
      }
    }
  }
}

struct RenameStayForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  var body: some View {
    NavigationStack {
      Form { TextField("Stay name", text: $name) }
        .navigationTitle("Stay name")
        .toolbar {
          ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
          ToolbarItem(placement: .confirmationAction) {
            Button("Save") {
              Task {
                if await store.mutate("stays:updateName", [
                  "stayId": store.selectedStayID, "name": name
                ]) { dismiss() }
              }
            }.disabled(name.trimmingCharacters(in: .whitespaces).count < 2)
          }
        }
    }
    .onAppear { name = store.stayName }
  }
}

struct CreateStayScreen: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  @State private var start = Date.now
  @State private var end = Date.now.addingTimeInterval(30 * 86_400)
  @State private var rate = ""
  @State private var cadence = "weekly"
  @State private var notes = ""
  @State private var busy = false
  @State private var creationRequestID = UUID().uuidString
  @State private var weekday = 1
  @State private var checkInEnabled = false
  @State private var checkIn = Date.now
  var body: some View {
    Form {
      Section("Household") { TextField("Stay name", text: $name) }
      Section("Agreement") {
        DatePicker("Starts", selection: $start, displayedComponents: .date)
        DatePicker("Ends", selection: $end, in: start..., displayedComponents: .date)
        Picker("Contribution rhythm", selection: $cadence) {
          Text("Weekly").tag("weekly")
          Text("Daily").tag("daily")
        }
        if cadence == "weekly" {
          Picker("Due weekday", selection: $weekday) {
            ForEach(0..<7) { Text(Calendar.current.weekdaySymbols[$0]).tag($0) }
          }
        }
        Toggle("Set a shared check-in", isOn: $checkInEnabled)
        if checkInEnabled { DatePicker("Check-in", selection: $checkIn, displayedComponents: .date) }
        TextField("Amount in dollars", text: $rate).keyboardType(.decimalPad)
        TextField("House notes", text: $notes, axis: .vertical).lineLimit(3...7)
      }
      Section {
        Button("Create stay") {
          busy = true
          Task {
            var terms: [String: ConvexEncodable?] = [
              "startDate": Display.date(start), "endDate": Display.date(end),
              "cadence": cadence,
              "rateCents": Double(Int((Double(rate) ?? 0) * 100)),
              "earlyDiscountEnabled": false, "earlyDiscountPercentage": Double(0),
              "earlyDiscountDays": Double(0), "lateFeeEnabled": false,
              "lateFeeCents": Double(0), "graceDays": Double(0), "houseNotes": notes
            ]
            if cadence == "weekly" { terms["paymentDayOfWeek"] = Double(weekday) }
            var args: [String: ConvexEncodable?] = [
              "name": name, "creationRequestId": creationRequestID,
              "timezone": TimeZone.current.identifier, "terms": terms
            ]
            if checkInEnabled { args["nextCheckInDate"] = Display.date(checkIn) }
            if await store.joinOrCreateStay("stays:create", args) { dismiss() }
            busy = false
          }
        }.disabled(busy || name.trimmingCharacters(in: .whitespaces).count < 2 || (Double(rate) ?? 0) <= 0)
      }
    }
    .navigationTitle("Create stay")
  }
}

struct JoinCodeScreen: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var code = ""
  var body: some View {
    Form {
      Section {
        TextField("Referral code", text: $code)
          .textInputAutocapitalization(.characters)
        Button("Join stay") {
          Task {
            if await store.joinOrCreateStay("referral:joinWithCode", ["referralCode": code]) { dismiss() }
          }
        }.disabled(code.isEmpty)
      } footer: { Text("Ask your host for their household code.") }
    }
    .navigationTitle("Join a stay")
  }
}
