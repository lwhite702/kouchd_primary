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
  var body: some View {
    Page(title: "Your stay", width: .wide) {
      TwoColumnLayout {
      Card {
        HStack { Pill(text: store.isHost ? "Host" : "Guest"); Spacer(); Pill(text: store.bundle["stay"]["status"].text) }
        Text(store.stayName).font(.title2.bold())
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
          PrimaryButton(title: "Invite a guest") { showingInvite = true }
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
        if HouseDetail.fields.allSatisfy({ store.bundle["stay"]["houseInfo"][$0.key].text.isEmpty }) {
          Text("Your host hasn't added house details yet.").foregroundStyle(Palette.muted)
        }
      }
      Card {
        Text("Pay outside Kouchd").font(.headline)
        Text("Choose an option with your host, then record the contribution in the ledger.")
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
          }.disabled(store.typedAgreement == nil)
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
      .kouchdNavigationBar()
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
      var args: [String: ConvexEncodable?] = [
        "name": name, "creationRequestId": creationRequestID,
        "timezone": TimeZone.current.identifier, "terms": terms
      ]
      if checkInEnabled { args["nextCheckInDate"] = Display.date(checkIn) }
      if await store.joinOrCreateStay("stays:create", args) { dismiss() }
      busy = false
    }
  }
}

struct JoinCodeScreen: View {
  let store: KouchdStore
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
