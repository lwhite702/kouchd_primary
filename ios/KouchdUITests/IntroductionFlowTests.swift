import XCTest

@MainActor
final class IntroductionFlowTests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
  }

  private func launch(dark: Bool = false, replay: Bool = false) {
    app.launchArguments = ["--ui-test-introduction"]
    if dark { app.launchArguments.append("--ui-test-dark") }
    if replay { app.launchArguments.append("--ui-test-replay") }
    app.launch()
    XCTAssertTrue(app.buttons["See how Kouchd works"].waitForExistence(timeout: 10))
  }

  private func tap(_ label: String) {
    let button = app.buttons[label].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5), "Missing button: \(label)")
    XCTAssertTrue(button.isHittable, "Unreachable button: \(label)")
    button.tap()
  }

  private func snapshot(_ name: String) {
    // Capture the settled layout after the introduction's short page transition.
    Thread.sleep(forTimeInterval: 0.5)
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  private func assertTitle(_ title: String) {
    XCTAssertTrue(app.staticTexts[title].waitForExistence(timeout: 5))
  }

  private func journey(dark: Bool, role: String) {
    launch(dark: dark)
    let suffix = dark ? "-dark" : ""
    assertTitle("A shared stay.\nOn the same page.")
    snapshot("01-welcome" + suffix)
    tap("See how Kouchd works")
    assertTitle("Good stays start\nwith clarity.")
    snapshot("02-stay" + suffix)
    tap("Continue")
    assertTitle("Clear records.\nFewer awkward asks.")
    XCTAssertTrue(app.staticTexts["Kouchd records contributions. It does not move money."].exists)
    snapshot("03-contributions" + suffix)
    tap("Continue")
    assertTitle("Make the everyday\nfeel more shared.")
    snapshot("04-chores" + suffix)
    tap("Let’s get started")
    assertTitle("How are you\nmaking room?")
    snapshot("05-role" + suffix)
    tap(role == "host" ? "Create a stay" : "Join a stay")
    XCTAssertTrue(app.staticTexts["Introduction completed: " + role].waitForExistence(timeout: 5))
  }

  func testLightIntroductionAndHostSelection() { journey(dark: false, role: "host") }
  func testDarkIntroductionAndGuestSelection() { journey(dark: true, role: "guest") }

  func testBackReturnsToWelcome() {
    launch()
    tap("See how Kouchd works")
    tap("Back")
    assertTitle("A shared stay.\nOn the same page.")
  }

  func testSkipShowsRoleSelection() {
    launch()
    tap("Skip")
    XCTAssertTrue(app.buttons["Create a stay"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Join a stay"].exists)
    XCTAssertFalse(app.buttons["Skip"].exists)
  }

  func testSignInReturnsNoRole() {
    launch()
    tap("Already have an account? Sign in")
    XCTAssertTrue(app.staticTexts["Introduction completed: none"].waitForExistence(timeout: 5))
  }

  func testConfiguredSignInPresentsAuthentication() throws {
    app.launchArguments = ["-kouchd.introductionRevision", "0"]
    app.launch()

    let signIn = app.buttons["Already have an account? Sign in"].firstMatch
    guard signIn.waitForExistence(timeout: 10) else {
      throw XCTSkip("Requires local Clerk and Convex configuration")
    }

    signIn.tap()
    XCTAssertTrue(
      app.staticTexts["Welcome! Sign in to continue"].waitForExistence(timeout: 10),
      "Authentication screen did not appear"
    )
  }

  func testReplayCompletesWithoutRoleSelection() {
    launch(replay: true)
    XCTAssertFalse(app.buttons["Already have an account? Sign in"].exists)
    tap("See how Kouchd works")
    tap("Continue")
    tap("Continue")
    tap("Done")
    XCTAssertTrue(app.staticTexts["Introduction completed: none"].waitForExistence(timeout: 5))
  }
}
