import XCTest

@MainActor
final class IntroductionFlowTests: XCTestCase {
  private var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
  }

  private func launch(dark: Bool = false, replay: Bool = false, accessibilityText: Bool = false) {
    app.launchArguments = ["--ui-test-introduction"]
    if dark { app.launchArguments.append("--ui-test-dark") }
    if replay { app.launchArguments.append("--ui-test-replay") }
    if accessibilityText { app.launchArguments.append("--ui-test-accessibility-text") }
    app.launch()
    XCTAssertTrue(app.buttons["Get started"].waitForExistence(timeout: 10))
  }

  private func tap(_ label: String) {
    let button = app.buttons[label].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5), "Missing button: \(label)")
    XCTAssertTrue(waitUntilHittable(button), "Unreachable button: \(label)")
    button.tap()
  }

  /// Introduction content fades in when a page appears, so give it a moment to settle before tapping.
  private func waitUntilHittable(_ element: XCUIElement, timeout: TimeInterval = 2) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while !element.isHittable && Date() < deadline { Thread.sleep(forTimeInterval: 0.1) }
    return element.isHittable
  }

  private func snapshot(_ name: String) {
    // Capture the settled layout after the page transition and the staggered content reveal.
    Thread.sleep(forTimeInterval: 1.2)
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
    assertTitle("Shared stays, made clear.")
    snapshot("01-welcome" + suffix)
    tap("Get started")
    assertTitle("Agree on the stay.")
    snapshot("02-stay" + suffix)
    tap("Continue")
    assertTitle("Keep a clear record.")
    XCTAssertTrue(app.staticTexts["The other person confirms each record. Money is settled outside Kouchd."].exists)
    snapshot("03-contributions" + suffix)
    tap("Continue")
    assertTitle("Share the everyday.")
    snapshot("04-chores" + suffix)
    tap("Choose how you’re joining")
    assertTitle("How are you making room?")
    snapshot("05-role" + suffix)
    if role == "host" { tap("Start free as a host") } else { joinWithCode() }
    XCTAssertTrue(app.staticTexts["Introduction completed: " + role].waitForExistence(timeout: 5))
  }

  /// Guests join with the invite code their host shared; Join stays disabled until a code is entered.
  private func joinWithCode() {
    let field = app.textFields["Invite code"].firstMatch
    XCTAssertTrue(field.waitForExistence(timeout: 5), "Missing invite code field")
    _ = waitUntilHittable(field)
    var swipes = 0
    while !field.isHittable && swipes < 8 { app.swipeUp(); swipes += 1 }
    XCTAssertTrue(field.isHittable, "Invite code field was not hittable after scrolling")
    field.tap()
    field.typeText("KCH-TEST01")
    let join = app.buttons["Join"].firstMatch
    swipes = 0
    while !join.isHittable && swipes < 8 { app.swipeUp(); swipes += 1 }
    XCTAssertTrue(join.isHittable, "Join button was not hittable after scrolling")
    XCTAssertTrue(join.isEnabled, "Join should be enabled once a code is entered")
    join.tap()
  }

  /// Scrolls until a control at the end of the page is on screen and tappable.
  private func scrollTo(_ label: String) {
    let button = app.buttons[label].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5), "Missing button: \(label)")
    _ = waitUntilHittable(button, timeout: 1)
    var swipes = 0
    while !button.isHittable && swipes < 8 {
      app.swipeUp()
      swipes += 1
    }
    tap(label)
  }

  func testSwipingMovesBetweenStepsAndKeepsTheFooterInStep() {
    launch()
    assertTitle("Shared stays, made clear.")
    app.swipeLeft()
    assertTitle("Agree on the stay.")
    XCTAssertTrue(app.buttons["Continue"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Back"].exists)
    app.swipeLeft()
    assertTitle("Keep a clear record.")
    app.swipeRight()
    assertTitle("Agree on the stay.")
    snapshot("swipe-back")
  }

  // At accessibility sizes the footer scrolls with the content instead of being pinned.
  func testAccessibilityTextFooterScrollsIntoReachThroughRoleSelection() {
    launch(accessibilityText: true)
    // A pinned footer would be on screen at launch and cover the content.
    XCTAssertFalse(app.buttons["Get started"].isHittable)
    scrollTo("Get started")
    assertTitle("Agree on the stay.")
    scrollTo("Continue")
    assertTitle("Keep a clear record.")
    scrollTo("Continue")
    assertTitle("Share the everyday.")
    snapshot("04-chores-accessibility")
    scrollTo("Choose how you’re joining")
    assertTitle("How are you making room?")
    XCTAssertFalse(app.buttons["Skip"].exists)
    scrollTo("I already have an account")
    XCTAssertTrue(app.staticTexts["Introduction completed: none"].waitForExistence(timeout: 5))
  }

  func testAccessibilityTextRoleSelectionIsReachable() {
    launch(accessibilityText: true)
    scrollTo("Get started")
    tap("Skip")
    assertTitle("How are you making room?")
    joinWithCode()
    XCTAssertTrue(app.staticTexts["Introduction completed: guest"].waitForExistence(timeout: 5))
  }

  func testLightIntroductionAndHostSelection() { journey(dark: false, role: "host") }
  func testDarkIntroductionAndGuestSelection() { journey(dark: true, role: "guest") }

  func testBackReturnsToWelcome() {
    launch()
    tap("Get started")
    tap("Back")
    assertTitle("Shared stays, made clear.")
  }

  func testSkipShowsRoleSelection() {
    launch()
    // The welcome page has no Skip; it appears from the first preview on.
    XCTAssertFalse(app.buttons["Skip"].exists)
    tap("Get started")
    tap("Skip")
    XCTAssertTrue(app.buttons["Start free as a host"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.textFields["Invite code"].exists)
    XCTAssertFalse(app.buttons["Join"].isEnabled)
    XCTAssertFalse(app.buttons["Skip"].exists)
  }

  func testSignInReturnsNoRole() {
    launch()
    tap("I already have an account")
    XCTAssertTrue(app.staticTexts["Introduction completed: none"].waitForExistence(timeout: 5))
  }

  func testConfiguredSignInPresentsAuthentication() throws {
    app.launchArguments = ["-kouchd.introductionRevision", "0"]
    app.launch()

    let signIn = app.buttons["I already have an account"].firstMatch
    guard signIn.waitForExistence(timeout: 10) else {
      throw XCTSkip("Requires local Clerk and Convex configuration")
    }

    signIn.tap()
    XCTAssertTrue(
      app.staticTexts["Welcome! Sign in to continue"].waitForExistence(timeout: 10),
      "Authentication screen did not appear"
    )
  }

  func testReplaySwipeStopsAtTheLastPreview() {
    launch(replay: true)
    for _ in 0..<4 { app.swipeLeft() }
    assertTitle("Share the everyday.")
    XCTAssertFalse(app.staticTexts["How are you making room?"].exists)
    XCTAssertTrue(app.buttons["Done"].exists)
  }

  func testReplayCompletesWithoutRoleSelection() {
    launch(replay: true)
    XCTAssertFalse(app.buttons["I already have an account"].exists)
    tap("Get started")
    tap("Continue")
    tap("Continue")
    tap("Done")
    XCTAssertTrue(app.staticTexts["Introduction completed: none"].waitForExistence(timeout: 5))
  }
}
