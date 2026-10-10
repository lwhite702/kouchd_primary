import ClerkKit
import ClerkKitUI
import ConvexMobile
import SwiftUI

struct HomeScreen: View {
  let store: KouchdStore
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack {
          Menu {
            ForEach(store.stays.indices, id: \.self) { index in
              let stay = store.stays[index]["stay"]
              Button(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text) {
                store.selectStay(stay["_id"].text)
              }
            }
          } label: {
            HStack(spacing: 5) {
              Text(store.stayName).font(.headline)
              Image(systemName: "chevron.down").font(.caption2)
            }.foregroundStyle(Palette.forest)
          }
          Spacer()
          Text(String(store.viewer["name"].text.prefix(2)).uppercased())
            .font(.caption.bold()).foregroundStyle(Palette.forest)
            .frame(width: 40, height: 40)
            .background(Palette.lime, in: Circle())
            .accessibilityLabel("Account initials")
        }
        VStack(alignment: .leading, spacing: 8) {
          Text(store.isHost ? "A little room, well shared." : "Make yourself at home.")
            .font(Palette.heading).foregroundStyle(Palette.forest)
            .accessibilityAddTraits(.isHeader)
          Text(store.isHost
               ? "Welcome back, \(store.viewer["name"].text)."
               : "Your stay with \(store.members.first(where: { $0["membership"]["role"].text == "host" })?["person"]["name"].text ?? "your host") · \(store.bundle["terms"]["startDate"].text) – \(store.bundle["terms"]["endDate"].text)")
            .font(.subheadline).foregroundStyle(Palette.muted)
        }
        if store.isHost {
          VStack(alignment: .leading, spacing: 14) {
            Text(store.stayName.uppercased()).font(.caption.bold())
              .foregroundStyle(Palette.lime)
            Text("\(store.stays.count) stays. One welcoming home.")
              .font(Palette.section).foregroundStyle(.white)
            Text("Next shared check-in · \(store.bundle["stay"]["nextCheckInDate"].text.isEmpty ? "Set a date" : store.bundle["stay"]["nextCheckInDate"].text)")
              .font(.subheadline).foregroundStyle(.white.opacity(0.8))
          }
          .padding(24).frame(maxWidth: .infinity, alignment: .leading)
          .background(Palette.forest, in: RoundedRectangle(cornerRadius: 24))
          Text("Your stays").font(Palette.section)
          ForEach(store.stays.indices, id: \.self) { index in
            let stay = store.stays[index]["stay"]
            Button {
              store.selectStay(stay["_id"].text)
            } label: {
              VStack(alignment: .leading, spacing: 14) {
                Text(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text)
                  .font(.title3.bold()).foregroundStyle(Palette.forest)
                Text(stay["status"].text.capitalized)
                  .font(.subheadline).foregroundStyle(Palette.muted)
                Rectangle().fill(Palette.line).frame(height: 1)
                Text("Open household details").font(.subheadline).foregroundStyle(Palette.forest)
              }
              .padding(22).frame(maxWidth: .infinity, alignment: .leading)
              .background(.white, in: RoundedRectangle(cornerRadius: 24))
              .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.line))
            }.buttonStyle(.plain)
          }
        } else {
          VStack(alignment: .leading, spacing: 18) {
            Text("NEXT CONTRIBUTION").font(.caption.bold()).foregroundStyle(Palette.lime)
            Text(Display.money(store.ledger.first?["balanceCents"].int ?? 0))
              .font(.largeTitle.bold()).foregroundStyle(.white)
            Text("Due \(store.ledger.first?["dueDate"].text ?? "later")")
              .font(.subheadline).foregroundStyle(.white.opacity(0.85))
            NavigationLink("View contributions", value: KouchdRoute.ledger)
              .font(.headline).foregroundStyle(Palette.ink)
              .frame(maxWidth: .infinity).padding(14)
              .background(.white, in: RoundedRectangle(cornerRadius: 14))
          }
          .padding(24).frame(maxWidth: .infinity, alignment: .leading)
          .background(Palette.forest, in: RoundedRectangle(cornerRadius: 24))
          if let next = store.chores.first(where: { !$0["completed"].flag && $0["voidedAt"].text.isEmpty && $0["assignee"].text != "host" && ($0["assigneeUserId"].text.isEmpty || $0["assigneeUserId"].text == store.viewer["id"].text) }) {
            Card {
              Text(next.title).font(.headline)
              Text("Your turn · \(next["dueDate"].text)")
                .font(.subheadline).foregroundStyle(Palette.muted)
            }
          }
          Card {
            Text("Your shared expectations").font(.headline)
            Text(store.bundle["terms"]["houseNotes"].text)
              .font(.subheadline).foregroundStyle(Palette.muted)
          }
        }
      if store.stays.count > 1 {
        Picker("Stay", selection: Binding(
          get: { store.selectedStayID },
          set: { store.selectStay($0) }
        )) {
          ForEach(store.stays.indices, id: \.self) { index in
            let item = store.stays[index]
            Text(item["stay"]["name"].text.isEmpty ? "Shared stay" : item["stay"]["name"].text)
              .tag(item["stay"]["_id"].text)
          }
        }.pickerStyle(.menu)
      }
      if store.isHost && store.guests.count > 1 {
        GuestPicker(store: store)
      }
      if store.bundle["membership"]["acceptedTermsId"].text != store.bundle["terms"]["_id"].text,
         !store.isHost, !store.isEnded {
        Card {
          Text("Your agreement needs review").font(.headline)
          Text("Read the current terms before recording new activity.")
          NavigationLink("Review agreement", value: KouchdRoute.agreement)
        }
      }
      Card {
        Text("Contribution balance").font(.subheadline).foregroundStyle(Palette.muted)
        Text(Display.money(store.ledger.reduce(0) { $0 + $1["balanceCents"].int }))
          .font(.system(size: 38, weight: .bold, design: .rounded))
          .foregroundStyle(Palette.forest)
        NavigationLink("Open ledger", value: KouchdRoute.ledger)
      }
      HStack(spacing: 12) {
        NavigationLink(value: KouchdRoute.chores) {
          StatCard(number: "\(store.chores.filter { !$0["completed"].flag && $0["voidedAt"].text.isEmpty }.count)", label: "Open chores")
        }
        NavigationLink(value: KouchdRoute.rewards) {
          StatCard(number: "\(store.wallet["availablePoints"].int)", label: "Reward points")
        }
      }
      if let notice = store.announcements.first {
        Card {
          Pill(text: "Household note")
          Text(notice.title).font(.headline)
          Text(notice["body"].text).font(.subheadline)
        }
      }
      Card {
        Text("Your next steps").font(.headline)
        NavigationLink("Stay details and agreement", value: KouchdRoute.stay)
        NavigationLink("Occupied nights", value: KouchdRoute.occupancy)
        NavigationLink("Schedule requests", value: KouchdRoute.schedule)
      }
      if !store.activity.isEmpty {
        Card {
          Text("Recent activity").font(.headline)
          ForEach(Array(store.activity.prefix(3)), id: \.id) { item in
            Text(item["detail"].text)
              .font(.subheadline).foregroundStyle(Palette.muted)
          }
        }
      }
      }
      .padding(24)
      .frame(maxWidth: 720, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.cream.ignoresSafeArea())
    .kouchdEntrance()
    .toolbar(.hidden, for: .navigationBar)
  }
}

private struct StatCard: View {
  let number: String
  let label: String
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(number).font(.title.bold())
      Text(label).font(.caption)
    }
    .foregroundStyle(Palette.forest)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(Palette.lime, in: RoundedRectangle(cornerRadius: 20))
  }
}

struct GuestPicker: View {
  let store: KouchdStore
  var body: some View {
    Picker("Guest", selection: Binding(
      get: { store.selectedGuestID },
      set: { store.selectGuest($0) }
    )) {
      Text("Select a guest").tag("")
      ForEach(store.guests.indices, id: \.self) { index in
        let guest = store.guests[index]
        Text(guest["person"]["name"].text).tag(guest["person"]["id"].text)
      }
    }
    .pickerStyle(.menu)
  }
}

struct LedgerScreen: View {
  let store: KouchdStore
  @State private var showingContribution = false
  var body: some View {
    Page(title: "The ledger") {
      if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
      Card {
        Text("Outside contributions").font(.headline)
        Text("Kouchd records contributions and asks the other person to confirm. Money moves outside the app.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        if !store.isEnded {
          PrimaryButton(title: "Record a contribution") { showingContribution = true }
        }
      }
      if store.ledger.isEmpty {
        EmptyCard(title: "Nothing due yet", message: "Agreed charges will appear here.")
      } else {
        ForEach(store.ledger, id: \.id) { item in
          Card {
            HStack {
              Text(item["title"].text.isEmpty ? "Stay contribution" : item["title"].text)
                .font(.headline)
              Spacer()
              Pill(text: item["status"].text)
            }
            DataRow(title: "Due", detail: item["dueDate"].text)
            DataRow(title: "Charge", detail: Display.money(item["effectiveChargeCents"].int))
            DataRow(title: "Confirmed credit", detail: Display.money(item["creditedCents"].int))
            DataRow(title: "Balance", detail: Display.money(item["balanceCents"].int))
            if store.isHost && item["type"].text == "adhoc" && item["status"].text != "voided" {
              VoidRecordButton(store: store, function: "obligations:voidAdhocCharge",
                               recordKey: "obligationId", recordID: item.id)
            }
            if store.isHost && !store.isEnded && item["lateFeeCents"].int > 0 && !item["lateFeeWaived"].flag {
              Button("Waive late fee") {
                Task { _ = await store.mutate("obligations:waiveLateFee", ["obligationId": item.id]) }
              }
            }
          }
        }
      }
      Text("Contribution records").font(.title2.bold())
      if store.contributions.isEmpty {
        EmptyCard(title: "No records yet", message: "Record a payment made outside Kouchd, groceries, supplies, or house work.")
      }
      ForEach(store.contributions, id: \.id) { item in
        Card {
          HStack {
            Text(item["type"].text.replacingOccurrences(of: "_", with: " ").capitalized).font(.headline)
            Spacer()
            Pill(text: item["status"].text)
          }
          DataRow(title: "Amount", detail: Display.money(item["amountCents"].int))
          DataRow(title: "Date", detail: item["date"].text)
          if !item["note"].text.isEmpty { Text(item["note"].text).font(.subheadline) }
          if !store.isEnded && item["status"].text == "pending" && item["createdBy"].text != store.viewer["id"].text {
            HStack {
              Button("Confirm") {
                Task { _ = await store.mutate("contributions:confirm", ["contributionId": item.id]) }
              }
              Button("Dispute") {
                Task { _ = await store.mutate("contributions:dispute", ["contributionId": item.id]) }
              }.tint(.red)
            }.buttonStyle(.bordered)
          }
          if item["status"].text != "voided" &&
             (store.isHost || item["createdBy"].text == store.viewer["id"].text) {
            VoidRecordButton(store: store, function: "contributions:voidContribution",
                             recordKey: "contributionId", recordID: item.id)
          }
          if item["status"].text == "pending" && item["createdBy"].text == store.viewer["id"].text {
            Text("Waiting for the other person to confirm.")
              .font(.caption).foregroundStyle(Palette.muted)
          }
        }
      }
      NavigationLink("Contribution rewards", value: KouchdRoute.rewards)
      NavigationLink("Schedule changes", value: KouchdRoute.schedule)
    }
    .sheet(isPresented: $showingContribution) { ContributionForm(store: store) }
  }
}

struct ContributionForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var type = "payment"
  @State private var amount = ""
  @State private var note = ""
  @State private var countsTowardBalance = true
  @State private var busy = false
  var body: some View {
    NavigationStack {
      Form {
        Section {
          Picker("Type", selection: $type) {
            Text("Outside payment").tag("payment")
            Text("Groceries").tag("groceries")
            Text("Supplies").tag("supplies")
            Text("House work").tag("house_work")
            Text("Other").tag("other")
          }
          TextField("Amount in dollars", text: $amount).keyboardType(.decimalPad)
          TextField("Note", text: $note, axis: .vertical).lineLimit(2...4)
          Toggle("Count toward balance", isOn: $countsTowardBalance)
        } header: { Text("Record a contribution") }
        footer: { Text("Recording a payment does not move money. The other member must confirm it.") }
        if store.isHost && store.guests.count > 1 {
          Section { GuestPicker(store: store) }
        }
      }
      .navigationTitle("Contribution")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Record") {
            busy = true
            Task {
              let cents = Int((Double(amount) ?? 0) * 100)
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID,
                "type": type,
                "amountCents": cents,
                "date": Display.date(),
                "note": note,
                "countsTowardBalance": countsTowardBalance
              ]
              if !store.selectedGuestID.isEmpty { args["guestUserId"] = store.selectedGuestID }
              if await store.mutate("contributions:create", args) { dismiss() }
              busy = false
            }
          }.disabled(busy || (Double(amount) ?? 0) <= 0)
        }
      }
    }
  }
}

struct ChoresScreen: View {
  let store: KouchdStore
  @State private var showingCreate = false
  var body: some View {
    Page(title: "Chores & check-ins") {
      Card {
        Text("Little things, shared fairly.").font(.headline)
        Text("Keep track of what needs doing around the home.")
          .foregroundStyle(Palette.muted)
        if !store.isEnded {
          PrimaryButton(title: "Add a chore") { showingCreate = true }
        }
      }
      if store.chores.isEmpty {
        EmptyCard(title: "All clear", message: "Chores your household adds will show up here.")
      }
      ForEach(store.chores, id: \.id) { chore in
        Card {
          HStack {
            Button {
              Task { _ = await store.mutate("chores:toggle", ["choreId": chore.id]) }
            } label: {
              Image(systemName: chore["completed"].flag ? "checkmark.circle.fill" : "circle")
                .font(.title2).foregroundStyle(Palette.forest)
                .frame(minWidth: 44, minHeight: 44)
            }.disabled(store.isEnded || !chore["voidedAt"].text.isEmpty).accessibilityLabel(chore["completed"].flag ? "Mark incomplete" : "Mark complete")
            VStack(alignment: .leading, spacing: 4) {
              Text(chore.title).font(.headline)
              Text(chore["assignee"].text.capitalized + " · " + chore["dueDate"].text)
                .font(.caption).foregroundStyle(Palette.muted)
            }
            Spacer()
          }
          if !chore["note"].text.isEmpty { Text(chore["note"].text).font(.subheadline) }
          if !chore["voidedAt"].text.isEmpty { Pill(text: "Voided") }
          if chore["voidedAt"].text.isEmpty && (store.isHost || chore["createdBy"].text == store.viewer["id"].text) {
            VoidRecordButton(store: store, function: "chores:voidChore",
                             recordKey: "choreId", recordID: chore.id)
          }
        }
      }
      NavigationLink("Occupied nights", value: KouchdRoute.occupancy)
    }
    .sheet(isPresented: $showingCreate) { ChoreForm(store: store) }
  }
}

struct ChoreForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var note = ""
  @State private var assignee = "shared"
  @State private var assigneeID = ""
  @State private var due = Date.now
  var body: some View {
    NavigationStack {
      Form {
        TextField("Chore", text: $title)
        TextField("Details", text: $note)
        Picker("For", selection: $assignee) {
          Text("Shared").tag("shared")
          Text("Host").tag("host")
          Text("Guest").tag("guest")
        }
        if assignee == "guest" {
          Picker("Guest", selection: $assigneeID) {
            Text("Any guest").tag("")
            ForEach(store.guests, id: \.guestPersonID) { guest in
              Text(guest["person"]["name"].text).tag(guest["person"]["id"].text)
            }
          }
        }
        DatePicker("Due", selection: $due, displayedComponents: .date)
      }
      .navigationTitle("New chore")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Add") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID, "title": title, "note": note,
                "assignee": assignee, "dueDate": Display.date(due)
              ]
              if assignee == "guest" && !assigneeID.isEmpty { args["assigneeUserId"] = assigneeID }
              if await store.mutate("chores:create", args) { dismiss() }
            }
          }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
        }
      }
    }
  }
}
