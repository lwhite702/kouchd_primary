import XCTest

/// Captures App Store screenshots from the synthetic-data test hosts. No real
/// account, Clerk, Convex, or RevenueCat data is used. Skipped unless
/// `KOUCHD_SCREENSHOT_DIR` is set (pass it to xcodebuild as
/// `TEST_RUNNER_KOUCHD_SCREENSHOT_DIR`); run `ios/scripts/app-store-screenshots.sh`.
@MainActor
final class AppStoreScreenshotTests: XCTestCase {
  private struct Shot {
    let name: String
    let arguments: [String]
    let waitFor: String?
  }

  private static let shots: [Shot] = [
    Shot(name: "01-welcome", arguments: ["--ui-test-introduction"], waitFor: "See how Kouchd works"),
    Shot(name: "02-guest-home", arguments: ["--ui-test-stay-layout", "guest"], waitFor: nil),
    Shot(name: "03-ledger", arguments: ["--ui-test-stay-layout", "guest", "--ui-test-section", "ledger"], waitFor: "Add contribution"),
    Shot(name: "04-add-contribution", arguments: ["--ui-test-contribution=venmo-saved"], waitFor: nil),
    Shot(name: "05-chores", arguments: ["--ui-test-stay-layout", "guest", "--ui-test-section", "chores"], waitFor: nil),
    Shot(name: "06-shopping", arguments: ["--ui-test-stay-layout", "guest", "--ui-test-section", "shopping"], waitFor: "Add item"),
    Shot(name: "07-host-home", arguments: ["--ui-test-stay-layout", "host"], waitFor: nil),
    Shot(name: "08-house-info", arguments: ["--ui-test-stay-layout", "host", "--ui-test-section", "terms"], waitFor: nil),
    Shot(name: "09-check-ins", arguments: ["--ui-test-stay-layout", "host", "--ui-test-section", "checkins"], waitFor: nil),
    Shot(name: "10-rewards", arguments: ["--ui-test-stay-layout", "guest", "--ui-test-section", "rewards"], waitFor: nil),
  ]

  private var outputDirectory: URL?
  private var environment: [String: String] { ProcessInfo.processInfo.environment }

  override func setUpWithError() throws {
    continueAfterFailure = false
    let path = environment["KOUCHD_SCREENSHOT_DIR"] ?? ""
    try XCTSkipIf(path.isEmpty, "Set TEST_RUNNER_KOUCHD_SCREENSHOT_DIR to capture App Store screenshots")
    let directory = URL(fileURLWithPath: path, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    outputDirectory = directory
  }

  func testCaptureAppStoreScreens() throws {
    let dark = environment["KOUCHD_SCREENSHOT_DARK"] == "1"
    let isPad = UIDevice.current.userInterfaceIdiom == .pad
    let landscape = isPad && environment["KOUCHD_SCREENSHOT_IPAD_PORTRAIT"] != "1"
    let only = Set((environment["KOUCHD_SCREENSHOT_ONLY"] ?? "").split(separator: ",").map(String.init))

    for shot in Self.shots where only.isEmpty || only.contains(shot.name) {
      let app = XCUIApplication()
      app.launchArguments = shot.arguments + (dark ? ["--ui-test-dark"] : [])
      XCUIDevice.shared.orientation = landscape ? .landscapeLeft : .portrait
      app.launch()
      if let label = shot.waitFor {
        let target = app.descendants(matching: .any)[label].firstMatch
        XCTAssertTrue(target.waitForExistence(timeout: 15), "\(shot.name): missing \(label)")
      } else {
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15), "\(shot.name): app did not launch")
      }
      // Let transitions, fonts, and async seed data settle before capture.
      Thread.sleep(forTimeInterval: 2)
      save(XCUIScreen.main.screenshot(), as: shot.name + (dark ? "-dark" : ""))
      app.terminate()
    }
  }

  private func save(_ screenshot: XCUIScreenshot, as name: String) {
    let attachment = XCTAttachment(screenshot: screenshot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    guard let directory = outputDirectory else { return }
    let file = directory.appendingPathComponent("\(name).png")
    XCTAssertNoThrow(try screenshot.pngRepresentation.write(to: file), "Could not write \(file.path)")
  }
}
