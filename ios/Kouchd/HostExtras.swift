import ConvexMobile
import SwiftUI

struct TermsEditScreen: View {
  let store: KouchdStore
  @State private var start = ""
  @State private var end = ""
  @State private var cadence = "weekly"
  @State private var weekday = 1
  @State private var rate = ""
  @State private var notes = ""
  @State private var billing = "continuous"
  @State private var lateFee = false
  @State private var lateCents = ""
  @State private var grace = ""
  @State private var earlyDiscount = false
  @State private var earlyPercent = ""
  @State private var earlyDays = ""
  @State private var rewardEnabled = false
  @State private var coinName = "Coins"
  @State private var centsPerPoint = "100"
  @State private var maxCredit = "0"
  @State private var houseRules: [EditableHouseRule] = []
  private var terms: Value {
    if !store.selectedGuestID.isEmpty,
       let guest = store.guests.first(where: { $0["person"]["id"].text == store.selectedGuestID }) {
      return guest["terms"]
    }
    return store.bundle["terms"]
  }
  var body: some View {
    Form {
      if !store.guests.isEmpty { GuestPicker(store: store) }
      Section("Dates and contribution") {
        TextField("Start (YYYY-MM-DD)", text: $start)
        TextField("End (YYYY-MM-DD)", text: $end)
        Picker("Cadence", selection: $cadence) {
          Text("Weekly").tag("weekly")
          Text("Daily").tag("daily")
        }
        if cadence == "weekly" {
          Picker("Due weekday", selection: $weekday) {
            ForEach(0..<7) { day in
              Text(Calendar.current.weekdaySymbols[day]).tag(day)
            }
          }
        }
        TextField("Amount in dollars", text: $rate).keyboardType(.decimalPad)
        Picker("Billing", selection: $billing) {
          Text("Continuous").tag("continuous")
          Text("Occupied nights").tag("occupied_nights")
        }
      }
      Section("Adjustments") {
        Toggle("Early discount", isOn: $earlyDiscount)
        if earlyDiscount {
          TextField("Discount percent", text: $earlyPercent).keyboardType(.numberPad)
          TextField("Days early", text: $earlyDays).keyboardType(.numberPad)
        }
        Toggle("Late fee", isOn: $lateFee)
        if lateFee {
          TextField("Late fee in dollars", text: $lateCents).keyboardType(.decimalPad)
          TextField("Grace days", text: $grace).keyboardType(.numberPad)
        }
      }
      Section("House notes") { TextField("Notes", text: $notes, axis: .vertical) }
      Section("Shared expectations") {
        ForEach($houseRules) { $rule in
          VStack(alignment: .leading) {
            TextField("Title", text: $rule.title)
            TextField("Category", text: $rule.category)
            TextField("Description", text: $rule.description, axis: .vertical)
            Toggle("Required", isOn: $rule.required)
            Button("Remove expectation", role: .destructive) {
              houseRules.removeAll { $0.id == rule.id }
            }
          }
        }
        Button("Add expectation") { houseRules.append(EditableHouseRule()) }
      }
      Section("Contribution rewards") {
        Toggle("Enable rewards", isOn: $rewardEnabled)
        if rewardEnabled {
          TextField("Point name", text: $coinName)
          TextField("Cents per point", text: $centsPerPoint).keyboardType(.numberPad)
          TextField("Maximum credit per period in dollars", text: $maxCredit).keyboardType(.decimalPad)
        }
      }
      Section {
        Button("Save new agreement version") { save() }
      } footer: {
        Text("Guests must review a changed agreement before continuing.")
      }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "Agreement")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Save") { save() }
      }
    }
    .onAppear(perform: fill)
    .onChange(of: store.selectedGuestID) { _, _ in fill() }
  }

  private func fill() {
    let value = terms
    start = value["startDate"].text
    end = value["endDate"].text
    cadence = value["cadence"].text
    weekday = value["paymentDayOfWeek"].int
    rate = String(Double(value["rateCents"].int) / 100)
    notes = value["houseNotes"].text
    billing = value["billingBasis"].text.isEmpty ? "continuous" : value["billingBasis"].text
    lateFee = value["lateFeeEnabled"].flag
    lateCents = String(Double(value["lateFeeCents"].int) / 100)
    grace = String(value["graceDays"].int)
    earlyDiscount = value["earlyDiscountEnabled"].flag
    earlyPercent = String(value["earlyDiscountPercentage"].int)
    earlyDays = String(value["earlyDiscountDays"].int)
    rewardEnabled = value["rewards"]["enabled"].flag
    coinName = value["rewards"]["coinName"].text.isEmpty ? "Coins" : value["rewards"]["coinName"].text
    centsPerPoint = String(value["rewards"]["centsPerPoint"].int > 0 ? value["rewards"]["centsPerPoint"].int : 100)
    maxCredit = String(Double(value["rewards"]["maxCreditPerPeriodCents"].int) / 100)
    houseRules = value["houseRules"].items.map { EditableHouseRule(value: $0) }
  }

  private func save() {
    var fields: [String: ConvexEncodable?] = [
      "startDate": start, "endDate": end, "cadence": cadence,
      "billingBasis": billing, "rateCents": Double(Int((Double(rate) ?? 0) * 100)),
      "earlyDiscountEnabled": earlyDiscount,
      "earlyDiscountPercentage": Double(earlyDiscount ? (Int(earlyPercent) ?? 0) : 0),
      "earlyDiscountDays": Double(earlyDiscount ? (Int(earlyDays) ?? 0) : 0),
      "lateFeeEnabled": lateFee,
      "lateFeeCents": Double(lateFee ? Int((Double(lateCents) ?? 0) * 100) : 0),
      "graceDays": Double(lateFee ? (Int(grace) ?? 0) : 0), "houseNotes": notes
    ]
    if cadence == "weekly" { fields["paymentDayOfWeek"] = Double(weekday) }
    fields["houseRules"] = Value.array(houseRules.map(\.value))
    fields["rewards"] = Value.object([
      "enabled": .bool(rewardEnabled), "coinName": .string(coinName),
      "centsPerPoint": .number(Double(Int(centsPerPoint) ?? 0)),
      "maxCreditPerPeriodCents": .number(Double(Int((Double(maxCredit) ?? 0) * 100)))
    ])
    var args: [String: ConvexEncodable?] = ["stayId": store.selectedStayID, "terms": fields]
    let function = store.selectedGuestID.isEmpty ? "terms:updateCurrent" : "terms:updateGuest"
    if !store.selectedGuestID.isEmpty { args["guestUserId"] = store.selectedGuestID }
    Task { _ = await store.mutate(function, args) }
  }
}

struct HouseInfoScreen: View {
  let store: KouchdStore
  @State private var network = ""
  @State private var password = ""
  @State private var address = ""
  @State private var doorCode = ""
  @State private var parking = ""
  @State private var trash = ""
  @State private var emergency = ""
  @State private var unit = ""
  @State private var city = ""
  @State private var otherNotes = ""
  var body: some View {
    Form {
      Section {
        TextField("Network", text: $network)
        TextField("Password", text: $password)
        TextField("Street address", text: $address)
        TextField("Unit", text: $unit)
        TextField("City, state and ZIP", text: $city)
        TextField("Door code", text: $doorCode)
      } header: {
        Text("Access and Wi-Fi")
      } footer: {
        Text("Guests see door and Wi-Fi codes only while the stay is active and after their agreement is accepted. Keep codes in these fields, not in notes.")
      }
      Section("Around the home") {
        TextField("Parking", text: $parking, axis: .vertical)
        TextField("Trash day", text: $trash)
        TextField("Emergency contact", text: $emergency)
        TextField("Other notes", text: $otherNotes, axis: .vertical)
      }
      Button("Save house details") {
        save()
      }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "House details")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Save") { save() }
      }
    }
    .onAppear {
      let info = store.bundle["stay"]["houseInfo"]
      network = info["wifiNetwork"].text
      password = info["wifiPassword"].text
      address = info["streetAddress"].text
      doorCode = info["doorCode"].text
      parking = info["parkingNotes"].text
      trash = info["trashDay"].text
      emergency = info["emergencyContact"].text
      unit = info["unit"].text
      city = info["cityStateZip"].text
      otherNotes = info["otherNotes"].text
    }
  }

  private func save() {
    let info: [String: ConvexEncodable?] = [
      "wifiNetwork": network, "wifiPassword": password,
      "streetAddress": address, "doorCode": doorCode,
      "parkingNotes": parking, "trashDay": trash,
      "emergencyContact": emergency, "unit": unit,
      "cityStateZip": city, "otherNotes": otherNotes
    ]
    Task { _ = await store.mutate("stays:updateHouseInfo", [
      "stayId": store.selectedStayID, "houseInfo": info
    ]) }
  }
}

struct PaymentOptionsScreen: View {
  let store: KouchdStore
  @State private var provider = "zelle"
  @State private var detail = ""
  @State private var options: [Value] = []
  var body: some View {
    Form {
      Section("Existing options") {
        ForEach(options.indices, id: \.self) { index in
          let option = options[index]
          DataRow(title: option["provider"].text.capitalized, detail: option["detail"].text)
        }
        .onDelete { options.remove(atOffsets: $0) }
      }
      Section("Add an option") {
        Picker("Provider", selection: $provider) {
          Text("Venmo").tag("venmo")
          Text("Cash App").tag("cashapp")
          Text("Chime").tag("chime")
          Text("Zelle").tag("zelle")
          Text("Cash (in-person)").tag("cash")
          Text("PayPal").tag("paypal")
          Text("Apple Pay").tag("applepay")
        }
        TextField("How guests find you (handle, email, or note)", text: $detail)
        Button("Add") {
          options.removeAll { $0["provider"].text == provider }
          options.append(.object(["provider": .string(provider), "detail": .string(detail)]))
          detail = ""
        }.disabled(detail.isEmpty)
      }
      Section {
        Button("Save outside payment options") {
          save()
        }
      } footer: { Text("Kouchd displays these options but does not move money.") }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "Outside payment")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Save") { save() }
      }
    }
    .onAppear { options = store.bundle["stay"]["paymentOptions"].items }
  }

  private func save() {
    Task { _ = await store.mutate("stays:updatePaymentOptions", [
      "stayId": store.selectedStayID, "paymentOptions": Value.array(options)
    ]) }
  }
}

struct AdhocChargeScreen: View {
  let store: KouchdStore
  @State private var title = ""
  @State private var amount = ""
  @State private var due = Date.now
  var body: some View {
    Form {
      Section("One-time charge") {
        GuestPicker(store: store)
        TextField("What is this for?", text: $title)
        TextField("Amount in dollars", text: $amount).keyboardType(.decimalPad)
        DatePicker("Due date", selection: $due, displayedComponents: .date)
        Button("Add charge") {
          addCharge()
        }.disabled(isInvalid)
      }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "One-time charge")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Add") { addCharge() }
          .disabled(isInvalid)
      }
    }
  }

  private var isInvalid: Bool {
    store.selectedGuestID.isEmpty || title.trimmingCharacters(in: .whitespaces).isEmpty || (Double(amount) ?? 0) <= 0
  }

  private func addCharge() {
    Task { _ = await store.mutate("obligations:createAdhocCharge", [
      "stayId": store.selectedStayID, "guestUserId": store.selectedGuestID,
      "title": title, "amountCents": Double(Int((Double(amount) ?? 0) * 100)),
      "effectiveDate": Display.date(), "dueDate": Display.date(due)
    ]) }
  }
}

struct RewardRulesScreen: View {
  let store: KouchdStore
  @State private var title = ""
  @State private var points = ""
  @State private var description = ""
  var body: some View {
    Form {
      Section("Create a rule") {
        TextField("Title", text: $title)
        TextField("Points", text: $points).keyboardType(.numberPad)
        TextField("Description", text: $description)
        Button("Add rule") {
          addRule()
        }.disabled(isRuleInvalid)
      }
      Section("Rules") {
        ForEach(store.rules, id: \.id) { rule in
          Button {
            Task { _ = await store.mutate("rewards:toggleRule", ["ruleId": rule.id]) }
          } label: {
            HStack {
              Text(rule.title)
              Spacer()
              Text("\(rule["pointsAwarded"].int) pts")
              Image(systemName: rule["isActive"].flag ? "checkmark.circle.fill" : "circle")
            }
          }
        }
      }
    }
    .kouchdFormWidth()
    .kouchdNavigationBar(title: "Reward rules")
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("Add") { addRule() }
          .disabled(isRuleInvalid)
      }
    }
    .stayFeature(.rewards, store: store)
  }

  private var isRuleInvalid: Bool {
    title.trimmingCharacters(in: .whitespaces).isEmpty || (Int(points) ?? 0) <= 0
  }

  private func addRule() {
    Task { _ = await store.mutate("rewards:createRule", [
      "stayId": store.selectedStayID, "title": title,
      "category": "other", "pointsAwarded": Double(Int(points) ?? 0),
      "description": description
    ]) }
  }
}


struct EditableHouseRule: Identifiable {
  var id = UUID().uuidString
  var category = "other"
  var title = ""
  var description = ""
  var required = false

  init() {}
  init(value: Value) {
    id = value["id"].text
    category = value["category"].text
    title = value["title"].text
    description = value["description"].text
    required = value["required"].flag
  }
  var value: Value {
    .object(["id": .string(id), "category": .string(category),
             "title": .string(title), "description": .string(description),
             "required": .bool(required)])
  }
}

struct BillSplitSheet: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var category = "electricity"
  @State private var serviceStart = ""
  @State private var serviceEnd = ""
  @State private var total = ""
  @State private var dueDate = ""
  @State private var splitMethod = "equal"
  @State private var includeHost = true
  @State private var prorateByStayDates = false
  @State private var selectedGuests: Set<String> = []
  @State private var guestInputs: [String: String] = [:]
  @State private var saving = false

  private var activeGuests: [Value] {
    store.guests.filter { $0["membership"]["status"].text == "active" }
  }

  private var totalCents: Int {
    Int(((Double(total.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0) * 100.0).rounded())
  }

  private var isInvalid: Bool {
    saving ||
    title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
    serviceStart.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
    serviceEnd.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
    dueDate.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
    totalCents <= 0 ||
    selectedGuests.isEmpty
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("Bill details") {
          TextField("Title", text: $title)
          Picker("Category", selection: $category) {
            Text("Electricity").tag("electricity")
            Text("Water").tag("water")
            Text("Gas").tag("gas")
            Text("Internet").tag("internet")
            Text("Trash").tag("trash")
            Text("Other").tag("other")
          }
          TextField("Service start (YYYY-MM-DD)", text: $serviceStart)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
          TextField("Service end (YYYY-MM-DD)", text: $serviceEnd)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
          TextField("Total in dollars", text: $total)
            .keyboardType(.decimalPad)
          TextField("Due date (YYYY-MM-DD)", text: $dueDate)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
        }

        Section {
          Picker("Split method", selection: $splitMethod) {
            Text("Equal").tag("equal")
            Text("Percentage").tag("percentage")
            Text("Fixed amount").tag("fixed")
          }
          if splitMethod == "equal" || splitMethod == "percentage" {
            Toggle("Include host in split", isOn: $includeHost)
          }
          Toggle("Prorate by guest stay dates", isOn: $prorateByStayDates)
        } header: {
          Text("How to split")
        } footer: {
          if splitMethod == "equal" {
            Text("In an equal split, guests can work out each other's share from the bill total.")
          }
        }

        Section("Guests") {
          if activeGuests.isEmpty {
            Text("Invite an active guest to split a household bill.")
              .foregroundStyle(Palette.muted)
          } else {
            ForEach(activeGuests, id: \.guestPersonID) { guest in
              let id = guest.guestPersonID
              let isSelected = selectedGuests.contains(id)
              VStack(alignment: .leading, spacing: 8) {
                Toggle(guest["person"]["name"].text, isOn: Binding(
                  get: { isSelected },
                  set: { checked in
                    if checked { selectedGuests.insert(id) }
                    else { selectedGuests.remove(id) }
                  }
                ))
                if isSelected && splitMethod == "percentage" {
                  TextField("Percentage (0–100)", text: Binding(
                    get: { guestInputs[id] ?? "" },
                    set: { guestInputs[id] = $0 }
                  ))
                  .keyboardType(.decimalPad)
                  .textFieldStyle(.roundedBorder)
                } else if isSelected && splitMethod == "fixed" {
                  TextField("Share in dollars", text: Binding(
                    get: { guestInputs[id] ?? "" },
                    set: { guestInputs[id] = $0 }
                  ))
                  .keyboardType(.decimalPad)
                  .textFieldStyle(.roundedBorder)
                }
              }
            }
          }
        }

        Section {
          Button(saving ? "Posting…" : "Post split bill") {
            submit()
          }
          .disabled(isInvalid)
        } footer: {
          Text("Posting a split bill adds an entry to each selected guest's Ledger. Kouchd records each share and never moves money directly.")
        }
      }
      .kouchdFormWidth()
      .navigationTitle("Split a bill")
      .kouchdNavigationBar()
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("Post") { submit() }
            .disabled(isInvalid)
        }
      }
      .onAppear {
        let today = Display.date(timezone: store.bundle["stay"]["timezone"].text)
        let defaultStart = store.bundle["terms"]["startDate"].text.isEmpty ? today : store.bundle["terms"]["startDate"].text
        let defaultEnd = store.bundle["terms"]["endDate"].text.isEmpty ? today : store.bundle["terms"]["endDate"].text
        if serviceStart.isEmpty { serviceStart = defaultStart }
        if serviceEnd.isEmpty { serviceEnd = defaultEnd }
        if dueDate.isEmpty { dueDate = today }
        if selectedGuests.isEmpty {
          selectedGuests = Set(activeGuests.map(\.guestPersonID))
        }
      }
    }
  }

  private func submit() {
    guard !isInvalid else { return }
    saving = true
    let guestItems: [Value] = activeGuests.compactMap { guest in
      let id = guest.guestPersonID
      guard selectedGuests.contains(id) else { return nil }
      var fields: [String: Value] = ["guestUserId": .string(id)]
      let rawInput = (guestInputs[id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
      if splitMethod == "percentage" {
        fields["input"] = .number(Double(rawInput) ?? 0)
      } else if splitMethod == "fixed" {
        let cents = Int(((Double(rawInput) ?? 0) * 100.0).rounded())
        fields["input"] = .number(Double(cents))
      }
      return .object(fields)
    }

    let args: [String: ConvexEncodable?] = [
      "stayId": store.selectedStayID,
      "title": title.trimmingCharacters(in: .whitespacesAndNewlines),
      "category": category,
      "serviceStart": serviceStart.trimmingCharacters(in: .whitespacesAndNewlines),
      "serviceEnd": serviceEnd.trimmingCharacters(in: .whitespacesAndNewlines),
      "totalCents": Double(totalCents),
      "dueDate": dueDate.trimmingCharacters(in: .whitespacesAndNewlines),
      "splitMethod": splitMethod,
      "includeHost": splitMethod == "fixed" ? false : includeHost,
      "prorateByStayDates": prorateByStayDates,
      "guests": Value.array(guestItems)
    ]

    Task {
      let created = await store.mutate("bills:create", args)
      saving = false
      if created || store.planLimit != nil {
        dismiss()
      }
    }
  }
}
