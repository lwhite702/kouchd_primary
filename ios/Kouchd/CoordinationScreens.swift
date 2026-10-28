import SwiftUI

struct ShoppingScreen: View {
  let store: KouchdStore
  @State private var title = ""
  @State private var quantity = "1"
  @State private var note = ""
  @State private var personal = false
  @State private var submitting = false
  @State private var editing: EditingShoppingItem?

  var body: some View {
    Page(title: "Shopping list") {
      Text("Shopping items are shared notes. They do not change anyone’s contribution balance.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      if !store.isEnded {
        Card {
          TextField("Item", text: $title).textFieldStyle(.roundedBorder)
          TextField("Quantity", text: $quantity).textFieldStyle(.roundedBorder)
          TextField("Note (optional)", text: $note).textFieldStyle(.roundedBorder)
          Toggle("Personal item", isOn: $personal)
          Text("Personal items are visible to you and your host.").font(.caption).foregroundStyle(Palette.muted)
          PrimaryButton(title: submitting ? "Adding…" : "Add item") {
            guard !submitting else { return }
            submitting = true
            Task {
              let saved = await store.mutate("shopping:create", ["stayId": store.selectedStayID, "title": title, "quantity": quantity, "note": note, "visibility": personal ? "personal" : "shared"])
              if saved { title = ""; note = ""; quantity = "1" }
              submitting = false
            }
          }.disabled(submitting || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || quantity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
      }
      if store.shopping.isEmpty { EmptyCard(title: "Nothing on the list yet", message: "Add a shared item when the household needs something.") }
      ForEach(store.shopping, id: \.id) { item in
        Card {
          HStack {
            VStack(alignment: .leading, spacing: 5) {
              Text(item.title).font(.headline).strikethrough(!item["checkedAt"].text.isEmpty)
              Text("\(item["quantity"].text) · \(item["visibility"].text.capitalized)").font(.caption).foregroundStyle(Palette.muted)
              if !item["note"].text.isEmpty { Text(item["note"].text).font(.subheadline) }
            }
            Spacer()
            if !store.isEnded {
              Button(item["checkedAt"].text.isEmpty ? "Mark done" : "Reopen") {
                Task { _ = await store.mutate("shopping:toggle", ["itemId": item.id]) }
              }.buttonStyle(.bordered)
            }
          }
          if !store.isEnded && canEdit(item) {
            HStack {
              Button("Edit item") { editing = EditingShoppingItem(item: item) }
              Spacer()
              Button("Remove item", role: .destructive) {
                Task { _ = await store.mutate("shopping:remove", ["itemId": item.id]) }
              }
            }
          }
        }
      }
    }
    .stayFeature(.shopping, store: store)
    .sheet(item: $editing) { editing in ShoppingItemForm(store: store, item: editing.item) }
  }

  private func canEdit(_ item: Value) -> Bool {
    HouseholdRules.canEditShoppingItem(item, viewerID: store.viewer["id"].text, isHost: store.isHost)
  }
}

private struct EditingShoppingItem: Identifiable {
  let item: Value
  var id: String { item.id }
}

private struct ShoppingItemForm: View {
  let store: KouchdStore
  let item: Value
  @Environment(\.dismiss) private var dismiss
  @State private var title: String
  @State private var quantity: String
  @State private var note: String
  @State private var personal: Bool
  @State private var submitting = false

  init(store: KouchdStore, item: Value) {
    self.store = store
    self.item = item
    _title = State(initialValue: item.title)
    _quantity = State(initialValue: item["quantity"].text)
    _note = State(initialValue: item["note"].text)
    _personal = State(initialValue: item["visibility"].text == "personal")
  }

  private var canSetPersonal: Bool {
    HouseholdRules.canSetShoppingItemPersonal(item, viewerID: store.viewer["id"].text, isHost: store.isHost)
  }
  private var isValid: Bool {
    !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !quantity.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  var body: some View {
    NavigationStack {
      Form {
        TextField("Item", text: $title)
        TextField("Quantity", text: $quantity)
        TextField("Note (optional)", text: $note)
        if canSetPersonal {
          Toggle("Personal item", isOn: $personal)
          Text("Personal items are visible to you and your host.").font(.caption).foregroundStyle(Palette.muted)
        }
      }
      .navigationTitle("Edit item")
      .kouchdNavigationBar()
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button(submitting ? "Saving…" : "Save") {
            submitting = true
            Task {
              let saved = await store.mutate("shopping:update", ["itemId": item.id, "title": title, "quantity": quantity, "note": note, "visibility": personal ? "personal" : "shared"])
              submitting = false
              if saved { dismiss() }
            }
          }.disabled(submitting || !isValid)
        }
      }
    }
  }
}

struct CheckInsScreen: View {
  let store: KouchdStore
  @State private var topic = ""
  @State private var note = ""
  @State private var date = Date.now
  @State private var submitting = false

  var body: some View {
    Page(title: "Check-ins") {
      if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
      if !store.isEnded {
        Card {
          TextField("Topic", text: $topic).textFieldStyle(.roundedBorder)
          TextField("What would you like to discuss?", text: $note, axis: .vertical).textFieldStyle(.roundedBorder)
          DatePicker("Check-in date", selection: $date, displayedComponents: .date)
          PrimaryButton(title: submitting ? "Saving…" : "Start check-in") {
            guard !submitting else { return }
            submitting = true
            Task {
              let guestID = store.isHost ? store.selectedGuestID : store.viewer["id"].text
              let saved = await store.mutate("checkIns:create", ["stayId": store.selectedStayID, "guestUserId": guestID,
                "checkInDate": Display.date(date, timezone: store.bundle["stay"]["timezone"].text), "topic": topic, "note": note])
              if saved { topic = ""; note = "" }
              submitting = false
            }
          }.disabled(submitting || topic.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.isHost && store.selectedGuestID.isEmpty)
        }
      }
      if store.checkins.isEmpty { EmptyCard(title: "Room for a conversation", message: "Start a check-in to share an update or make a plan together.") }
      ForEach(store.checkins, id: \.id) { item in
        CheckInCard(store: store, item: item)
      }
    }
    .stayFeature(.checkins, store: store)
  }
}

private struct CheckInCard: View {
  let store: KouchdStore
  let item: Value
  @State private var response = ""
  @State private var submitting = false

  var body: some View {
    Card {
      Text(item["topic"].text).font(.headline)
      Text("\(item["guestName"].text) · \(item["checkInDate"].text) · \(item["status"].text.replacingOccurrences(of: "_", with: " "))")
        .font(.caption).foregroundStyle(Palette.muted)
      Text(item["note"].text)
      ForEach(Array(item["responses"].items.enumerated()), id: \.offset) { _, reply in
        Text(reply["body"].text).font(.subheadline).padding(.vertical, 4)
      }
      if !store.isEnded {
        if item["status"].text != "resolved" {
          TextField("Add a response", text: $response, axis: .vertical).textFieldStyle(.roundedBorder)
          Button(submitting ? "Sending…" : "Send response") {
            guard !submitting else { return }
            submitting = true
            Task {
              if await store.mutate("checkIns:respond", ["checkInId": item.id, "body": response]) { response = "" }
              submitting = false
            }
          }.disabled(submitting || response.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        Menu("Update status") {
          ForEach(["open", "follow_up", "resolved"], id: \.self) { status in
            Button(status.replacingOccurrences(of: "_", with: " ").capitalized) {
              Task { _ = await store.mutate("checkIns:setStatus", ["checkInId": item.id, "status": status]) }
            }
          }
        }
      }
    }
  }
}
