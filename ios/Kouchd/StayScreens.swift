import ClerkKit
import ClerkKitUI
import ConvexMobile
import CryptoKit
import SwiftUI

struct StayScreen: View {
  let store: KouchdStore
  @State private var showingInvite = false
  @State private var showingEdit = false
  @State private var showingContributionRouter = false
  private var accessCodesHiddenMessage: String? {
    // The server sets this only when it actually removed a configured code.
    switch store.bundle["accessCodesHidden"].text {
    case "ended":
      if store.bundle["stay"]["arrangement"].text == "sublease" {
        return "Your sublease agreement has ended, so door and Wi-Fi codes are no longer shown."
      }
      return "This stay has ended, so door and Wi-Fi codes are no longer shown."
    case "needs_acceptance":
      return "Door and Wi-Fi codes appear once your agreement is accepted."
    default:
      return nil
    }
  }
  var body: some View {
    Page(title: "Your stay", width: .wide) {
      if store.bundle["subleaseLock"]["locked"].flag {
        Card {
          HStack(spacing: 12) {
            Image(systemName: "lock.fill").foregroundStyle(store.isHost ? .red : .orange)
            VStack(alignment: .leading, spacing: 4) {
              Text(store.isHost ? "Sublease locked" : "Sublease read-only").font(.headline)
              Text(store.isHost
                   ? "Your Plus subscription has ended. This sublease is locked and personal exports are blocked until you have an active subscription."
                   : "This sublease is read-only and personal exports are blocked until the host renews. Your sublease agreement still applies, so keep paying rent as agreed. Kouchd's record being locked doesn't change it.")
                .font(.subheadline).foregroundStyle(Palette.muted)
            }
          }
        }
      }
      if store.isHost &&
         store.bundle["stay"]["arrangement"].text == "sublease" &&
         store.bundle["stay"]["landlordConsent"]["answer"].text == "not_confirmed" &&
         store.bundle["stay"]["landlordConsent"]["warningDismissedAt"].double == 0 {
        Card {
          HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 6) {
              Text("Landlord consent not confirmed").font(.headline)
              Text("Subletting without landlord consent may violate your lease. You can proceed, but please verify permissions before inviting guests.")
                .font(.subheadline).foregroundStyle(Palette.muted)
              Button("Dismiss warning") {
                Task {
                  _ = await store.mutate("stays:dismissLandlordConsentWarning", ["stayId": store.bundle["stay"]["_id"].text])
                }
              }
              .font(.subheadline.bold())
              .foregroundStyle(Palette.forest)
            }
          }
        }
      }
      TwoColumnLayout {
      Card {
        HStack { Pill(text: store.isHost ? "Host" : "Guest"); Spacer(); Pill(text: store.bundle["stay"]["status"].text) }
        Text(store.stayName).font(.title2.bold())
        if store.bundle["stay"]["arrangement"].text == "sublease" {
          DataRow(title: "Type", detail: "Sublease (" + (store.bundle["stay"]["subleaseLayout"].text == "private_room" ? "Private room" : "Whole place") + ")")
          if store.bundle["stay"]["subleaseLayout"].text == "private_room" {
            DataRow(title: "Roommates", detail: "\(max(1, store.bundle["stay"]["roommateCount"].int))")
          }
        }
        DataRow(title: "From", detail: store.bundle["terms"]["startDate"].text)
        DataRow(title: "Until", detail: store.bundle["terms"]["endDate"].text)
        DataRow(title: "Rhythm", detail: store.bundle["terms"]["cadence"].text.capitalized)
        DataRow(title: "Contribution", detail: Display.money(store.bundle["terms"]["rateCents"].int))
        if store.isHost && !store.isEnded {
          Button("Edit stay name") { showingEdit = true }
        }
      }
      Card {
        Text("The people").font(.headline)
        ForEach(store.members.indices, id: \.self) { index in
          let member = store.members[index]
          DataRow(title: member["person"]["name"].text,
                  detail: member["membership"]["role"].text.capitalized)
        }
        if store.isHost && !store.isEnded {
          if let usage = store.planUsage { GuestSpotsRow(usage: usage) }
          PrimaryButton(title: "Invite a guest") { showingInvite = true }
        }
      }
      if store.isHost && !store.isEnded, let usage = store.planUsage {
        ForEach(usage.blockedJoins(inStay: store.selectedStayID)) { blocked in
          BlockedJoinCard(store: store, usage: usage, blocked: blocked)
        }
      }
      } trailing: {
      Card {
        Text("House notes").font(.headline)
        Text(store.bundle["terms"]["houseNotes"].text.isEmpty
             ? "No notes yet." : store.bundle["terms"]["houseNotes"].text)
      }
      Card {
        Text("Around the home").font(.headline)
        ForEach(HouseDetail.fields, id: \.key) { field in
          let detail = store.bundle["stay"]["houseInfo"][field.key].text
          if !detail.isEmpty { DataRow(title: field.label, detail: detail) }
        }
        if let message = accessCodesHiddenMessage {
          Text(message).font(.subheadline).foregroundStyle(Palette.muted)
        } else if HouseDetail.fields.allSatisfy({ store.bundle["stay"]["houseInfo"][$0.key].text.isEmpty }) {
          Text(store.isHost
               ? "You haven't added house details yet."
               : "Your host hasn't added house details yet.").foregroundStyle(Palette.muted)
        }
      }
      Card {
        Text("Pay outside Kouchd").font(.headline)
        Text(store.isHost
             ? "Agree on an option with your guests, then record each contribution on the Ledger."
             : "Choose an option with your host, then record the contribution on the Ledger.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        ForEach(store.bundle["stay"]["paymentOptions"].items.indices, id: \.self) { index in
          let option = store.bundle["stay"]["paymentOptions"].items[index]
          DataRow(title: option["provider"].text.capitalized, detail: option["detail"].text)
        }
        if !store.isEnded {
          PrimaryButton(title: "Send & log contribution") {
            showingContributionRouter = true
          }
        }
      }
      if store.bundle["stay"]["arrangement"].text == "sublease" {
        Card {
          Text("Condition Checklists").font(.headline)
          Text("Move-in and move-out condition checklists document private room and shared space conditions with timestamped confirmations.")
            .font(.subheadline).foregroundStyle(Palette.muted)
          DataRow(title: "Checklist type", detail: store.bundle["stay"]["subleaseLayout"].text == "private_room" ? "Private room + shared areas" : "Whole place")
        }
        Card {
          Text("Security Deposit").font(.headline)
          Text("Kouchd provides shared household records only and never holds, transfers, or decides deposit funds.")
            .font(.footnote).foregroundStyle(Palette.muted)
        }
      }
      }
    }
    .toolbar {
      if store.isHost && !store.isEnded {
        ToolbarItem(placement: .primaryAction) {
          Menu {
            Button {
              showingInvite = true
            } label: {
              Label("Invite guest", systemImage: "person.badge.plus")
            }
            Button {
              showingEdit = true
            } label: {
              Label("Edit stay name", systemImage: "pencil")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
          }
          .accessibilityLabel("Stay options")
        }
      }
    }
    .sheet(isPresented: $showingInvite) { InviteForm(store: store) }
    .task(id: store.opensInviteOnStay) {
      guard store.opensInviteOnStay else { return }
      // Wait for the Plus sheet to finish closing, or this one can't present.
      try? await Task.sleep(for: .milliseconds(600))
      showingInvite = true
      store.opensInviteOnStay = false
    }
    .sheet(isPresented: $showingEdit) { RenameStayForm(store: store) }
    .sheet(isPresented: $showingContributionRouter) { ContributionForm(store: store) }
  }
}

struct AgreementScreen: View {
  let store: KouchdStore
  @State private var cadence = "weekly"
  @State private var weekday = 1
  var body: some View {
    Page(title: "Your agreement") {
      Card {
        if let terms = store.typedAgreement {
          Pill(text: "Version \(terms.version)")
          DataRow(title: "Dates", detail: terms.startDate + " – " + terms.endDate)
          DataRow(title: "Amount", detail: Display.money(terms.rateCents))
          DataRow(title: "Cadence", detail: terms.cadence.capitalized)
          if store.bundle["terms"]["cadence"].text == "monthly" {
            DataRow(title: "Due day", detail: "Day \(max(1, store.bundle["terms"]["paymentDayOfMonth"].int)) of each month")
          }
        } else {
          Text("Agreement details couldn't be read. Reopen this stay to try again.").foregroundStyle(Palette.muted)
        }
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
          if store.bundle["terms"]["cadence"].text != "monthly" {
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
          }
          PrimaryButton(title: "Accept current agreement") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID
              ]
              if store.bundle["terms"]["cadence"].text != "monthly" {
                args["initialCadence"] = cadence
                if cadence == "weekly" { args["initialPaymentDayOfWeek"] = Double(weekday) }
              }
              _ = await store.mutate("terms:acceptCurrent", args)
            }
          }.disabled(store.typedAgreement == nil)
        }
      }
    }
    .onAppear {
      let currentCadence = store.bundle["terms"]["cadence"].text
      cadence = currentCadence.isEmpty || currentCadence == "monthly" ? "weekly" : currentCadence
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
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") { onFinished() }
        }
      }
    }
    .planLimitPresentation(store: store)
  }
}

struct InviteForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var email = ""
  @State private var link: URL?
  @State private var plusEntry: PlusEntry?
  var purchasesEnabled = AppConfig.purchasesEnabled
  var body: some View {
    NavigationStack {
      Form {
        if let usage = store.planUsage,
           let line = PlanCopy.inviteSpotsLine(usage, guestsInThisStay: usage.guestSpots(inStay: store.selectedStayID).count) {
          Section {
            Text(line)
            if usage.isFree && usage.guests.isFull && purchasesEnabled {
              Button("Make room with Plus") { plusEntry = .guestLimit }
            }
          }
        }
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
      .kouchdNavigationBar()
      .tint(Palette.forest)
      .sheet(item: $plusEntry) { PlusSheet(store: store, entry: $0, returnsToInvite: true) }
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
        .kouchdNavigationBar()
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
  @State private var arrangement = "home_stay"
  @State private var subleaseLayout = "whole_place"
  @State private var roommateCount = 1
  @State private var roommateNames = ""
  @State private var landlordConsent = "written_permission"
  @State private var landlordConsentWarningDismissed = false
  @State private var paymentDayOfMonth = 1
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
      Section("Arrangement") {
        Picker("Arrangement", selection: $arrangement) {
          Text("Someone staying with me").tag("home_stay")
          Text("Subletting my place").tag("sublease")
        }
        .pickerStyle(.segmented)
        .onChange(of: arrangement) { _, newArrangement in
          if newArrangement == "sublease" && cadence != "monthly" {
            cadence = "monthly"
          } else if newArrangement == "home_stay" && cadence == "monthly" {
            cadence = "weekly"
          }
        }
      }
      if arrangement == "sublease" {
        Section("Sublease layout") {
          Picker("Layout", selection: $subleaseLayout) {
            Text("Whole place").tag("whole_place")
            Text("Private room").tag("private_room")
          }
          .pickerStyle(.segmented)
          if subleaseLayout == "private_room" {
            Stepper("Roommates living there: \(roommateCount)", value: $roommateCount, in: 1...20)
            TextField("Roommate names (optional, comma-separated)", text: $roommateNames)
          }
        }
        Section("Landlord consent") {
          Picker("Landlord consent", selection: $landlordConsent) {
            Text("Written permission").tag("written_permission")
            Text("Not required").tag("not_required")
            Text("Not confirmed yet").tag("not_confirmed")
          }
          if landlordConsent == "not_confirmed" && !landlordConsentWarningDismissed {
            VStack(alignment: .leading, spacing: 6) {
              Text("Subletting without landlord consent may violate your lease. You can proceed, but please verify permissions before inviting guests.")
                .font(.footnote)
                .foregroundStyle(.orange)
              Button("Acknowledge & dismiss warning") {
                landlordConsentWarningDismissed = true
              }
              .font(.footnote.bold())
            }
          }
        }
      }
      Section("Agreement") {
        DatePicker("Starts", selection: $start, displayedComponents: .date)
        DatePicker("Ends", selection: $end, in: start..., displayedComponents: .date)
        Picker("Contribution rhythm", selection: $cadence) {
          if arrangement == "sublease" {
            Text("Monthly").tag("monthly")
          }
          Text("Weekly").tag("weekly")
          Text("Daily").tag("daily")
        }
        if cadence == "weekly" {
          Picker("Due weekday", selection: $weekday) {
            ForEach(0..<7) { Text(Calendar.current.weekdaySymbols[$0]).tag($0) }
          }
        } else if cadence == "monthly" {
          Stepper("Due on day \(paymentDayOfMonth) of the month", value: $paymentDayOfMonth, in: 1...28)
        }
        Toggle("Set a shared check-in", isOn: $checkInEnabled)
        if checkInEnabled { DatePicker("Check-in", selection: $checkIn, displayedComponents: .date) }
        TextField("Amount in dollars", text: $rate).keyboardType(.decimalPad)
        TextField("House notes", text: $notes, axis: .vertical).lineLimit(3...7)
      }
      if arrangement == "sublease" {
        Section("Sublease record notice") {
          Text("Subleases require an active Plus subscription. If Plus lapses, this sublease becomes read-only and personal exports are blocked until renewed. Kouchd is a private record-keeping tool and does not replace a written sublease agreement.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)
        }
      }
      Section {
        Button("Create stay") {
          createStay()
        }.disabled(isInvalid)
      }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "Create stay")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Create") {
          createStay()
        }.disabled(isInvalid)
      }
    }
  }

  private var isInvalid: Bool {
    busy || name.trimmingCharacters(in: .whitespaces).count < 2 || (Double(rate) ?? 0) <= 0
  }

  private func createStay() {
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
      if cadence == "monthly" {
        terms["paymentDayOfMonth"] = Double(paymentDayOfMonth)
        terms["billingBasis"] = "continuous"
      }
      var args: [String: ConvexEncodable?] = [
        "name": name, "creationRequestId": creationRequestID,
        "timezone": TimeZone.current.identifier, "terms": terms,
        "arrangement": arrangement
      ]
      if checkInEnabled { args["nextCheckInDate"] = Display.date(checkIn) }
      if arrangement == "sublease" {
        args["subleaseLayout"] = subleaseLayout
        if subleaseLayout == "private_room" {
          args["roommateCount"] = Double(roommateCount)
          let names = roommateNames.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
          if !names.isEmpty {
            args["roommateNames"] = Value.array(names.map { Value.string($0) })
          }
        }
        var consentObj: [String: Value] = [
          "answer": .string(landlordConsent),
          "answeredAt": .number(Double(Int(Date.now.timeIntervalSince1970 * 1000)))
        ]
        if landlordConsent == "not_confirmed" && landlordConsentWarningDismissed {
          consentObj["warningDismissedAt"] = .number(Double(Int(Date.now.timeIntervalSince1970 * 1000)))
        }
        args["landlordConsent"] = Value.object(consentObj)
        args["subleaseBillPreset"] = subleaseLayout
      }
      if await store.joinOrCreateStay("stays:create", args) { dismiss() }
      busy = false
    }
  }
}

struct JoinCodeScreen: View {
  let store: KouchdStore
  var initialCode = ""
  @Environment(\.dismiss) private var dismiss
  @State private var code = ""
  @State private var busy = false
  var body: some View {
    Form {
      Section {
        TextField("Referral code", text: $code)
          .textInputAutocapitalization(.characters)
        Button("Join stay") {
          joinStay()
        }.disabled(busy || code.trimmingCharacters(in: .whitespaces).isEmpty)
      } footer: { Text("Ask your host for their household code.") }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "Join a stay")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Join") {
          joinStay()
        }.disabled(busy || code.trimmingCharacters(in: .whitespaces).isEmpty)
      }
    }
    .onAppear {
      if code.isEmpty { code = initialCode }
    }
  }

  private func joinStay() {
    busy = true
    Task {
      if await store.joinOrCreateStay("referral:joinWithCode", ["referralCode": code.trimmingCharacters(in: .whitespaces)]) {
        dismiss()
      }
      busy = false
    }
  }
}
