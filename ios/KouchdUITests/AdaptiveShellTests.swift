import XCTest

@MainActor
final class AdaptiveShellTests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
  }

  private func launch(_ scenario: String, _ extra: [String] = []) {
    app.launchArguments = ["--ui-test-stay-layout", scenario] + extra
    app.launch()
    if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
  }

  /// Attaches landscape screenshots of the main screens for visual review.
  func testLandscapeScreens() throws {
    try XCTSkipUnless(UIDevice.current.userInterfaceIdiom == .pad, "Landscape review is iPad only")
    for (scenario, section) in [("guest", "home"), ("guest", "ledger"), ("host", "home"), ("guest", "chores"), ("host", "stay"), ("host", "checkins"), ("guest", "rewards")] {
      launch(scenario, ["--ui-test-section", section])
      sleep(2)
      let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
      attachment.name = "landscape-\(scenario)-\(section)"
      attachment.lifetime = .keepAlways
      add(attachment)
    }
  }

  func testSidebarOpensSectionsOnIPad() throws {
    try XCTSkipUnless(UIDevice.current.userInterfaceIdiom == .pad, "Sidebar is iPad only")
    launch("guest")
    let shopping = app.staticTexts["Shopping list"].firstMatch
    XCTAssertTrue(shopping.waitForExistence(timeout: 10))
    shopping.tap()
    XCTAssertTrue(app.buttons["Add item"].waitForExistence(timeout: 5))
    app.staticTexts["Ledger"].firstMatch.tap()
    XCTAssertTrue(app.buttons["Add contribution"].firstMatch.waitForExistence(timeout: 5))
  }

  func testLedgerSelectionShowsDetailsOnIPad() throws {
    try XCTSkipUnless(UIDevice.current.userInterfaceIdiom == .pad, "Split ledger is iPad only")
    launch("guest", ["--ui-test-section", "ledger"])
    let row = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Shared internet'")).firstMatch
    XCTAssertTrue(row.waitForExistence(timeout: 10))
    row.tap()
    XCTAssertTrue(app.staticTexts["Confirmed credit"].waitForExistence(timeout: 5))
  }

  func testPhoneKeepsTabs() throws {
    try XCTSkipUnless(UIDevice.current.userInterfaceIdiom == .phone, "Tabs check is for iPhone")
    launch("guest", ["--ui-test-tabs"])
    XCTAssertTrue(app.tabBars.buttons["More"].waitForExistence(timeout: 10))
    app.tabBars.buttons["More"].tap()
    XCTAssertTrue(app.staticTexts["Shopping list"].waitForExistence(timeout: 5))
  }
}
