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
  var flag: Bool {
    if case .bool(let value) = self { return value }
    return false
  }
}

extension Value {
  var id: String { self["_id"].text }
  var title: String { self["title"].text }
}

enum Display {
  static func money(_ cents: Int) -> String {
    (Double(cents) / 100).formatted(.currency(code: "USD"))
  }
  static func date(_ date: Date = .now) -> String {
    date.formatted(.iso8601.year().month().day().dateSeparator(.dash))
  }
}
