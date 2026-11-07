import XCTest
@testable import Kouchd

final class HeyCatchTests: XCTestCase {
  func testUUIDv7FormatAndTimestamp() {
    let fixedDate = Date(timeIntervalSince1970: 1794050000.123)
    let uuid = HeyCatchNative.generateUUIDv7(date: fixedDate)

    XCTAssertEqual(uuid.count, 36)
    // UUID regex format: 8-4-4-4-12
    let pattern = "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    XCTAssertNotNil(uuid.range(of: pattern, options: .regularExpression), "Expected valid UUIDv7 format, got \(uuid)")
  }

  func testBuildPayloadContainsRequiredHeyCatchFields() {
    let client = HeyCatchNative()
    let now = Date(timeIntervalSince1970: 1794050000)
    let payload = client.buildPayload(
      name: "$screen",
      distinctId: "user-123",
      properties: ["$screen_name": "welcome"],
      isCustom: false,
      now: now
    )

    XCTAssertEqual(payload["api_key"] as? String, HeyCatchNative.apiKey)
    XCTAssertEqual(payload["event"] as? String, "$screen")
    XCTAssertEqual(payload["distinct_id"] as? String, "user-123")

    guard let props = payload["properties"] as? [String: Any] else {
      XCTFail("Missing properties in payload")
      return
    }

    XCTAssertEqual(props["heycatch_project_key"] as? String, HeyCatchNative.projectKey)
    XCTAssertEqual((props["$groups"] as? [String: String])?["project"], HeyCatchNative.projectKey)
    XCTAssertEqual(props["$lib"] as? String, "heycatch-native")
    XCTAssertEqual(props["$screen_name"] as? String, "welcome")
    XCTAssertNotNil(props["$session_id"] as? String)
    XCTAssertNil(props["heycatch_custom_user_event"], "Standard $screen event must not have custom flag")
  }

  func testCustomBusinessEventIncludesFlag() {
    let client = HeyCatchNative()
    let payload = client.buildPayload(
      name: "signup_completed",
      distinctId: "user-123",
      properties: ["plan": "plus"],
      isCustom: true
    )

    guard let props = payload["properties"] as? [String: Any] else {
      XCTFail("Missing properties")
      return
    }

    XCTAssertEqual(props["heycatch_custom_user_event"] as? Bool, true)
    XCTAssertEqual(props["plan"] as? String, "plus")
  }

  func testAnonymousIdPersistsUntilSignOut() {
    let suiteName = "test.heycatch.\(UUID().uuidString)"
    guard let defaults = UserDefaults(suiteName: suiteName) else {
      XCTFail("Failed to create isolated UserDefaults")
      return
    }
    defer { defaults.removePersistentDomain(forName: suiteName) }

    let client = HeyCatchNative(userDefaults: defaults)
    let firstAnon = client.anonymousId
    XCTAssertFalse(firstAnon.isEmpty)
    XCTAssertEqual(client.anonymousId, firstAnon, "Anonymous ID should persist across calls")

    // Signing in identifies the user
    client.identify(userId: "user_456")
    // Signing out rotates the anonymous ID
    client.identify(userId: nil)
    let secondAnon = client.anonymousId
    XCTAssertNotEqual(firstAnon, secondAnon, "Sign-out must rotate to a fresh anonymous ID")
  }

  func testSessionIdRotatesAfterThirtyMinutes() {
    let client = HeyCatchNative()
    let t0 = Date(timeIntervalSince1970: 1794050000)
    let session1 = client.activeSessionId(now: t0)

    // 15 minutes later: same session
    let t1 = t0.addingTimeInterval(15 * 60)
    let session2 = client.activeSessionId(now: t1)
    XCTAssertEqual(session1, session2)

    // 35 minutes after the last activity: new session
    let t2 = t1.addingTimeInterval(35 * 60)
    let session3 = client.activeSessionId(now: t2)
    XCTAssertNotEqual(session1, session3)
  }
}
