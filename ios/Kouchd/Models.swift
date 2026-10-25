import Foundation
import ConvexMobile

/// Flexible decoding for Convex documents; unknown server fields remain harmless.
enum Value: Codable, ConvexEncodable {
  case object([String: Value]), array([Value]), string(String), number(Double), bool(Bool), null

  init(from decoder: Decoder) throws {
    let box = try decoder.singleValueContainer()
    if box.decodeNil() { self = .null }
    else if let value = try? box.decode([String: Value].self) { self = .object(value) }
    else if let value = try? box.decode([Value].self) { self = .array(value) }
    else if let value = try? box.decode(String.self) { self = .string(value) }
    else if let value = try? box.decode(Bool.self) { self = .bool(value) }
    else { self = .number(try box.decode(Double.self)) }
  }

  func encode(to encoder: Encoder) throws {
    var box = encoder.singleValueContainer()
    switch self {
    case .object(let value): try box.encode(value)
    case .array(let value): try box.encode(value)
    case .string(let value): try box.encode(value)
    case .number(let value): try box.encode(value)
    case .bool(let value): try box.encode(value)
    case .null: try box.encodeNil()
    }
  }

  subscript(_ key: String) -> Value {
    guard case .object(let fields) = self else { return .null }
    return fields[key] ?? .null
  }

  var text: String {
    switch self {
    case .string(let value): value
    case .number(let value): value.formatted()
    default: ""
    }
  }
  var items: [Value] {
    if case .array(let values) = self { return values }
    return []
  }
  var int: Int {
    if case .number(let value) = self { return Int(value) }
    return 0
  }
  var double: Double {
    if case .number(let value) = self { return value }
    return 0
  }
  var flag: Bool {
    if case .bool(let value) = self { return value }
    return false
  }
}

extension Value {
  var id: String { self["_id"].text }
  var title: String { self["title"].text }
  var guestPersonID: String { self["person"]["id"].text }
}

enum Display {
  static func money(_ cents: Int) -> String {
    (Double(cents) / 100).formatted(.currency(code: "USD"))
  }
  static func date(_ date: Date = .now) -> String {
    date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
  }
}


enum HouseDetail {
  static let fields: [(key: String, label: String)] = [
    ("wifiNetwork", "Wi-Fi network"), ("wifiPassword", "Wi-Fi password"),
    ("streetAddress", "Street address"), ("unit", "Unit"), ("cityStateZip", "City and ZIP"),
    ("doorCode", "Door code"), ("parkingNotes", "Parking"), ("trashDay", "Trash day"),
    ("emergencyContact", "Emergency contact"), ("otherNotes", "Other notes")
  ]
}

enum P2PChannel: String, CaseIterable, Identifiable {
  case venmo
  case cashapp
  case chime
  case zelle
  case cash
  case paypal
  case applepay

  var id: String { rawValue }

  var label: String {
    switch self {
    case .venmo: "Venmo"
    case .cashapp: "Cash App"
    case .chime: "Chime"
    case .zelle: "Zelle"
    case .cash: "Cash"
    case .paypal: "PayPal"
    case .applepay: "Apple Cash"
    }
  }
}

struct P2PRewardOffset: Equatable {
  let grossAmountCents: Int
  let pointsApplied: Int
  let rewardCreditCents: Int
  let netPayableCents: Int
  var netPayableFormatted: String {
    String(format: "%.2f", Double(netPayableCents) / 100.0)
  }
}

enum P2PRouting {
  private static let allowedQueryChars: CharacterSet = {
    var set = CharacterSet.urlQueryAllowed
    set.remove(charactersIn: "&+=?")
    return set
  }()

  private static func encode(_ value: String) -> String {
    value.trimmingCharacters(in: .whitespacesAndNewlines)
      .addingPercentEncoding(withAllowedCharacters: allowedQueryChars) ?? value
  }

  private static func normalizePayPalHandle(_ raw: String) -> String {
    var cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    cleaned = cleaned.replacingOccurrences(of: "^@", with: "", options: .regularExpression)
    cleaned = cleaned.replacingOccurrences(
      of: "^https?://(www\\.)?paypal\\.me/",
      with: "",
      options: [.regularExpression, .caseInsensitive]
    )
    cleaned = cleaned.replacingOccurrences(
      of: "^paypal\\.me/",
      with: "",
      options: [.regularExpression, .caseInsensitive]
    )
    if let firstSegment = cleaned.components(separatedBy: CharacterSet(charactersIn: "/?#")).first {
      cleaned = firstSegment
    }
    return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  static func buildURI(
    channel: P2PChannel,
    handle: String,
    amountDollars: String,
    memo: String
  ) -> String {
    let trimmedHandle = handle.trimmingCharacters(in: .whitespacesAndNewlines)
    let cleanAmount = amountDollars.trimmingCharacters(in: .whitespacesAndNewlines)
    let encodedMemo = encode(memo)

    switch channel {
    case .venmo:
      let username = trimmedHandle.replacingOccurrences(of: "^@", with: "", options: .regularExpression)
      return "venmo://paycharge?txn=pay&recipients=\(encode(username))&amount=\(encode(cleanAmount))&note=\(encodedMemo)"
    case .cashapp:
      let cashtag = trimmedHandle.replacingOccurrences(of: "^\\$", with: "", options: .regularExpression)
      return "https://cash.app/$\(encode(cashtag))/\(encode(cleanAmount))"
    case .chime:
      let chimesign = trimmedHandle.replacingOccurrences(of: "^\\$", with: "", options: .regularExpression)
      return "https://app.chime.com/link/qr?u=\(encode(chimesign))"
    case .paypal:
      let paypalUser = normalizePayPalHandle(trimmedHandle)
      guard !paypalUser.isEmpty else { return "https://paypal.me" }
      return "https://paypal.me/\(encode(paypalUser))/\(encode(cleanAmount))"
    case .zelle, .cash, .applepay:
      return trimmedHandle
    }
  }

  static func formattedHandle(channel: P2PChannel, rawHandle: String) -> String {
    let trimmed = rawHandle.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty {
      return channel == .cash ? "Hand directly to your host" : "Not set by host"
    }
    switch channel {
    case .venmo:
      let clean = trimmed.replacingOccurrences(of: "^@", with: "", options: .regularExpression)
      return "@\(clean)"
    case .cashapp, .chime:
      let clean = trimmed.replacingOccurrences(of: "^\\$", with: "", options: .regularExpression)
      return "$\(clean)"
    case .paypal:
      let clean = normalizePayPalHandle(trimmed)
      return clean.isEmpty ? "Not set by host" : "paypal.me/\(clean)"
    case .zelle, .cash, .applepay:
      return trimmed
    }
  }

  static func calculateRewardsOffset(
    amountDollars: String,
    pointsToApply: Int,
    availablePoints: Int,
    centsPerPoint: Int
  ) -> P2PRewardOffset {
    let parsed = Double(amountDollars.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
    let grossCents = parsed > 0 ? Int((parsed * 100.0).rounded()) : 0
    let safeCentsPerPoint = max(1, centsPerPoint)
    let maxNeededPoints = grossCents / safeCentsPerPoint
    let clampedPoints = max(0, min(pointsToApply, min(availablePoints, maxNeededPoints)))
    let creditCents = clampedPoints * safeCentsPerPoint
    let netCents = max(0, grossCents - creditCents)
    return P2PRewardOffset(
      grossAmountCents: grossCents,
      pointsApplied: clampedPoints,
      rewardCreditCents: creditCents,
      netPayableCents: netCents
    )
  }
}

/// Strongly-typed navigation destinations supported across Kouchd navigation stacks.
enum KouchdRoute: Hashable {
  case agreement
  case ledger
  case chores
  case rewards
  case stay
  case occupancy
  case schedule
  case settings
  case activity
  case householdGuide
  case createStay
  case joinCode
  case hostControls
  case subscription
  case termsEdit
  case houseInfo
  case paymentOptions
  case adhocCharge
  case rewardRules
  case about
  case admin
  case adminFinancial
  case adminSmsHistory
  case adminUserSmsHistory(userID: String)
  case adminUser(id: String)
  case adminStay(id: String)
}
