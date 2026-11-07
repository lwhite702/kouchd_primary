import Foundation
import Security

/// HeyCatch native telemetry client for iOS over HTTP per https://heycatch.ai/agents-native.md.
/// Sends events directly to HeyCatch ingest without conflicting with existing PostHog SDK setups.
public final class HeyCatchNative: @unchecked Sendable {
  public static let shared = HeyCatchNative()

  public static let apiKey = "phc_oiDt6uXiBiEA2aT43SMzMAFE9D4gMVkRP3BtvYRsmHqe"
  public static let projectKey = "hck_pk_vTnA-QIqNwJkDomxrPzeV7q7FubOu6pI"
  public static let captureURL = URL(string: "https://in.heycatch.ai/capture/")!

  private let userDefaults: UserDefaults
  private let session: URLSession
  private let queue = DispatchQueue(label: "ai.heycatch.native", qos: .utility)

  private var identifiedUserId: String?
  private var currentSessionId: String?
  private var lastEventDate: Date?

  private let anonIdKey = "heycatch_anon_distinct_id"

  public init(userDefaults: UserDefaults = .standard, session: URLSession = .shared) {
    self.userDefaults = userDefaults
    self.session = session
  }

  /// Stored anonymous install identifier, stable across launches until sign-out rotation.
  public var anonymousId: String {
    if let existing = userDefaults.string(forKey: anonIdKey), !existing.isEmpty {
      return existing
    }
    let fresh = UUID().uuidString.lowercased()
    userDefaults.set(fresh, forKey: anonIdKey)
    return fresh
  }

  public var currentDistinctId: String {
    queue.sync { identifiedUserId ?? anonymousId }
  }

  /// Links the user identity on sign-in, or rotates anonymous ID on sign-out.
  public func identify(userId: String?, properties: [String: Any]? = nil) {
    queue.async {
      if let userId, !userId.isEmpty {
        let prevAnon = self.anonymousId
        self.identifiedUserId = userId
        var eventProps: [String: Any] = [
          "$anon_distinct_id": prevAnon
        ]
        if let properties, !properties.isEmpty {
          eventProps["$set"] = properties
        }
        self.sendEvent(name: "$identify", distinctId: userId, properties: eventProps, isCustom: false)
      } else {
        self.identifiedUserId = nil
        // Rotate to a fresh anonymous ID on sign-out so subsequent launches start unlinked.
        let fresh = UUID().uuidString.lowercased()
        self.userDefaults.set(fresh, forKey: self.anonIdKey)
      }
    }
  }

  /// Records a native screen view ($screen event).
  public func screen(name: String, properties: [String: Any]? = nil) {
    queue.async {
      var eventProps: [String: Any] = [
        "$screen_name": name
      ]
      if let properties {
        for (k, v) in properties {
          eventProps[k] = v
        }
      }
      let distinctId = self.identifiedUserId ?? self.anonymousId
      self.sendEvent(name: "$screen", distinctId: distinctId, properties: eventProps, isCustom: false)
    }
  }

  /// Records a custom business outcome event.
  public func capture(event: String, properties: [String: Any]? = nil) {
    queue.async {
      let distinctId = self.identifiedUserId ?? self.anonymousId
      self.sendEvent(name: event, distinctId: distinctId, properties: properties ?? [:], isCustom: true)
    }
  }

  /// Builds a standard PostHog capture payload for HeyCatch.
  public func buildPayload(
    name: String,
    distinctId: String,
    properties: [String: Any],
    isCustom: Bool,
    now: Date = Date()
  ) -> [String: Any] {
    let sessionId = activeSessionId(now: now)
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let timestamp = formatter.string(from: now)

    var eventProperties = properties
    eventProperties["heycatch_project_key"] = Self.projectKey
    eventProperties["$groups"] = ["project": Self.projectKey]
    eventProperties["$lib"] = "heycatch-native"
    eventProperties["$session_id"] = sessionId
    if isCustom {
      eventProperties["heycatch_custom_user_event"] = true
    }

    return [
      "api_key": Self.apiKey,
      "event": name,
      "distinct_id": distinctId,
      "timestamp": timestamp,
      "properties": eventProperties
    ]
  }

  /// Returns the current session ID, creating a new UUIDv7 if 30 minutes have elapsed or none exists.
  public func activeSessionId(now: Date = Date()) -> String {
    if let current = currentSessionId,
       let last = lastEventDate,
       now.timeIntervalSince(last) < 30 * 60 {
      lastEventDate = now
      return current
    }
    let fresh = Self.generateUUIDv7(date: now)
    currentSessionId = fresh
    lastEventDate = now
    return fresh
  }

  /// Generates a RFC 9562-compliant UUIDv7 string with a 48-bit Unix millisecond timestamp.
  public static func generateUUIDv7(date: Date = Date()) -> String {
    let millis = UInt64(date.timeIntervalSince1970 * 1000)
    var bytes = [UInt8](repeating: 0, count: 16)
    bytes[0] = UInt8((millis >> 40) & 0xFF)
    bytes[1] = UInt8((millis >> 32) & 0xFF)
    bytes[2] = UInt8((millis >> 24) & 0xFF)
    bytes[3] = UInt8((millis >> 16) & 0xFF)
    bytes[4] = UInt8((millis >> 8) & 0xFF)
    bytes[5] = UInt8(millis & 0xFF)

    var random = [UInt8](repeating: 0, count: 10)
    _ = SecRandomCopyBytes(kSecRandomDefault, random.count, &random)

    // Version 7: 0b0111_xxxx
    bytes[6] = 0x70 | (random[0] & 0x0F)
    bytes[7] = random[1]
    // Variant 1: 0b10xx_xxxx
    bytes[8] = 0x80 | (random[2] & 0x3F)
    for i in 0..<7 {
      bytes[9 + i] = random[3 + i]
    }

    return String(
      format: "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
      bytes[0], bytes[1], bytes[2], bytes[3],
      bytes[4], bytes[5],
      bytes[6], bytes[7],
      bytes[8], bytes[9],
      bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    )
  }

  private func sendEvent(name: String, distinctId: String, properties: [String: Any], isCustom: Bool) {
    let payload = buildPayload(name: name, distinctId: distinctId, properties: properties, isCustom: isCustom)
    guard JSONSerialization.isValidJSONObject(payload),
          let body = try? JSONSerialization.data(withJSONObject: payload) else {
      return
    }

    var request = URLRequest(url: Self.captureURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body

    session.dataTask(with: request) { _, _, _ in }.resume()
  }
}
