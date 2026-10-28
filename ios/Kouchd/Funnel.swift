import CryptoKit
import Foundation

enum KouchdFunnelEvent: String {
  case view, tap, close, start, done
}

enum KouchdFunnel {
  private struct Placement {
    let exp: String
    let variants: [String: Int]
  }

  private struct RemoteConfig: Decodable {
    struct Placement: Decodable {
      let kind: String
      let exp: String
      let variants: [String: Int]
    }
    let placements: [String: Placement]
  }

  private struct Event: Encodable {
    let p: String
    let v: String
    let e: String
  }

  private static let subjectKey = "kouchd.funnel.subject"
  private static let sandboxKey = "kouchd.funnel.sandbox"
  private static let sentKey = "kouchd.funnel.sent"
  private static let queueKey = "kouchd.funnel.queue"
  private static var remote: [String: Placement] = [:]
  private static var started = false

  static var sandbox: Bool {
    if ProcessInfo.processInfo.arguments.contains("--sandbox") { return true }
    if ProcessInfo.processInfo.environment["KOUCHD_FUNNEL_SANDBOX"] == "1" { return true }
    return UserDefaults.standard.bool(forKey: sandboxKey)
  }

  static func start() async {
    guard !started else { return }
    started = true
    if UserDefaults.standard.string(forKey: subjectKey) == nil {
      UserDefaults.standard.set(UUID().uuidString.lowercased(), forKey: subjectKey)
    }
    guard let server = KouchdFunnelConfig.server, let key = KouchdFunnelConfig.appKey else { return }
    var request = URLRequest(url: server.appendingPathComponent("c").appendingPathComponent(key))
    request.timeoutInterval = 8
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200 else { return }
      let config = try JSONDecoder().decode(RemoteConfig.self, from: data)
      remote = config.placements.mapValues { Placement(exp: $0.exp, variants: $0.variants) }
    } catch {
      // The compiled passport remains the safe fallback when the service is unavailable.
    }
  }

  static func variant(_ placement: String) -> String {
    let override = overrideVariant(for: placement)
    let source: Placement?
    if let configured = remote[placement] {
      source = configured
    } else if let configured = KouchdFunnelConfig.placements[placement] {
      source = Placement(exp: configured.exp, variants: configured.variants)
    } else {
      source = nil
    }
    guard let source else { return "current" }
    if let override, source.variants[override] != nil { return override }
    let key = "\(subject)|\(placement)|\(source.exp)"
    let bucket = Int(hash(key).prefix(8), radix: 16).map { $0 % 100 } ?? 0
    var cursor = 0
    for (id, weight) in source.variants.sorted(by: { $0.key < $1.key }) {
      cursor += max(0, min(100, weight))
      if bucket < cursor { return id }
    }
    return source.variants.keys.sorted().first ?? "current"
  }

  static func mark(_ placement: String, _ event: KouchdFunnelEvent) {
    emit(placement, event.rawValue)
  }

  static func step(_ placement: String, _ number: Int) {
    guard (1...12).contains(number) else { return }
    emit(placement, "s\(number)")
  }

  static func token(_ placement: String) -> UUID {
    let bundle = Bundle.main.bundleIdentifier ?? "com.wrelikbrands.kouchd"
    let value = "\(bundle)/\(placement).\(variant(placement))"
    let namespace = Data([0xf6, 0xba, 0x59, 0x5b, 0x92, 0x22, 0x46, 0x37, 0xb3, 0x96, 0x30, 0xaa, 0xf6, 0x00, 0x81, 0x76])
    var bytes = Array(Insecure.SHA1.hash(data: namespace + Data(value.utf8)).prefix(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x50
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    return UUID(uuid: (bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]))
  }

  private static var subject: String {
    UserDefaults.standard.string(forKey: subjectKey) ?? "anonymous"
  }

  private static func overrideVariant(for placement: String) -> String? {
    let arguments = ProcessInfo.processInfo.arguments
    var values: [String] = []
    for index in arguments.indices where arguments[index] == "--funnel" && arguments.index(after: index) < arguments.endIndex {
      values.append(arguments[arguments.index(after: index)])
    }
    if let environment = ProcessInfo.processInfo.environment["KOUCHD_FUNNEL"] {
      values.append(contentsOf: environment.split(separator: ",").map(String.init))
    }
    return values.lazy.compactMap { value in
      let pair = value.split(separator: "=", maxSplits: 1).map(String.init)
      return pair.count == 2 && pair[0] == placement ? pair[1] : nil
    }.first
  }

  private static func hash(_ value: String) -> String {
    Insecure.SHA1.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
  }

  private static func emit(_ placement: String, _ event: String) {
    let key = "\(placement)|\(variant(placement))|\(event)"
    var sent = Set(UserDefaults.standard.stringArray(forKey: sentKey) ?? [])
    guard sent.insert(key).inserted else { return }
    UserDefaults.standard.set(Array(sent), forKey: sentKey)
    guard KouchdFunnelConfig.server != nil, KouchdFunnelConfig.appKey != nil else { return }
    enqueue(Event(p: placement, v: variant(placement), e: event))
    Task { await flush() }
  }

  private static func enqueue(_ event: Event) {
    var queue = UserDefaults.standard.array(forKey: queueKey) as? [[String: String]] ?? []
    queue.append(["p": event.p, "v": event.v, "e": event.e])
    UserDefaults.standard.set(Array(queue.suffix(20)), forKey: queueKey)
  }

  private static func flush() async {
    guard let server = KouchdFunnelConfig.server, let key = KouchdFunnelConfig.appKey,
          let queue = UserDefaults.standard.array(forKey: queueKey) as? [[String: String]], !queue.isEmpty else { return }
    guard let body = try? JSONSerialization.data(withJSONObject: ["env": sandbox ? "Sandbox" : "Production", "events": queue]) else { return }
    var request = URLRequest(url: server.appendingPathComponent("e").appendingPathComponent(key))
    request.httpMethod = "POST"
    request.httpBody = body
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 8
    do {
      let (_, response) = try await URLSession.shared.data(for: request)
      if (response as? HTTPURLResponse)?.statusCode == 200 { UserDefaults.standard.removeObject(forKey: queueKey) }
    } catch {
      // Keep the small queue for the next app launch.
    }
  }
}
