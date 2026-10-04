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
      Section {
        Button("Save new agreement version") { save() }
      } footer: {
        Text("Guests must review a changed agreement before continuing.")
      }
    }
    .navigationTitle("Agreement")
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
  }

  private func save() {
    var fields: [String: ConvexEncodable?] = [
      "startDate": start, "endDate": end, "cadence": cadence,
      "billingBasis": billing, "rateCents": Int((Double(rate) ?? 0) * 100),
      "earlyDiscountEnabled": earlyDiscount,
      "earlyDiscountPercentage": earlyDiscount ? (Int(earlyPercent) ?? 0) : 0,
      "earlyDiscountDays": earlyDiscount ? (Int(earlyDays) ?? 0) : 0,
      "lateFeeEnabled": lateFee,
      "lateFeeCents": lateFee ? Int((Double(lateCents) ?? 0) * 100) : 0,
      "graceDays": lateFee ? (Int(grace) ?? 0) : 0, "houseNotes": notes
    ]
    if cadence == "weekly" { fields["paymentDayOfWeek"] = weekday }
    for key in ["houseRules", "rewards"] {
      if case .null = terms[key] {} else { fields[key] = terms[key] }
    }
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
  var body: some View {
    Form {
      Section("Access and Wi-Fi") {
        TextField("Network", text: $network)
        TextField("Password", text: $password)
        TextField("Street address", text: $address)
        TextField("Door code", text: $doorCode)
      }
      Section("Around the home") {
        TextField("Parking", text: $parking, axis: .vertical)
        TextField("Trash day", text: $trash)
        TextField("Emergency contact", text: $emergency)
      }
      Button("Save house details") {
        var info: [String: ConvexEncodable?] = [
          "wifiNetwork": network, "wifiPassword": password,
          "streetAddress": address, "doorCode": doorCode,
          "parkingNotes": parking, "trashDay": trash,
          "emergencyContact": emergency
        ]
        for key in ["unit", "cityStateZip", "otherNotes"] {
          let value = store.bundle["stay"]["houseInfo"][key]
          if case .null = value {} else { info[key] = value }
        }
        Task { _ = await store.mutate("stays:updateHouseInfo", [
          "stayId": store.selectedStayID, "houseInfo": info
        ]) }
      }
    }
    .navigationTitle("House details")
    .onAppear {
      let info = store.bundle["stay"]["houseInfo"]
      network = info["wifiNetwork"].text
      password = info["wifiPassword"].text
      address = info["streetAddress"].text
      doorCode = info["doorCode"].text
      parking = info["parkingNotes"].text
      trash = info["trashDay"].text
      emergency = info["emergencyContact"].text
    }
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
          Text("Zelle").tag("zelle"); Text("PayPal").tag("paypal")
          Text("Cash App").tag("cashapp"); Text("Apple Pay").tag("applepay")
        }
        TextField("How guests find you", text: $detail)
        Button("Add") {
          options.append(.object(["provider": .string(provider), "detail": .string(detail)]))
          detail = ""
        }.disabled(detail.isEmpty)
      }
      Section {
        Button("Save outside payment options") {
          Task { _ = await store.mutate("stays:updatePaymentOptions", [
            "stayId": store.selectedStayID, "paymentOptions": Value.array(options)
          ]) }
        }
      } footer: { Text("Kouchd displays these options but does not move money.") }
    }
    .navigationTitle("Outside payment")
    .onAppear { options = store.bundle["stay"]["paymentOptions"].items }
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
          Task { _ = await store.mutate("obligations:createAdhocCharge", [
            "stayId": store.selectedStayID, "guestUserId": store.selectedGuestID,
            "title": title, "amountCents": Int((Double(amount) ?? 0) * 100),
            "effectiveDate": Display.date(), "dueDate": Display.date(due)
          ]) }
        }.disabled(store.selectedGuestID.isEmpty || title.isEmpty || (Double(amount) ?? 0) <= 0)
      }
    }
    .navigationTitle("One-time charge")
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
          Task { _ = await store.mutate("rewards:createRule", [
            "stayId": store.selectedStayID, "title": title,
            "category": "other", "pointsAwarded": Int(points) ?? 0,
            "description": description
          ]) }
        }.disabled(title.isEmpty || (Int(points) ?? 0) <= 0)
      }
      Section("Rules") {
        ForEach(store.rules.indices, id: \.self) { index in
          let rule = store.rules[index]
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
    .navigationTitle("Reward rules")
  }
}
