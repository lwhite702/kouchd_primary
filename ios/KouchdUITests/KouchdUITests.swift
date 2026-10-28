import XCTest

final class KouchdUITests: XCTestCase {
  private let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testOnboardingAdvancesBySwipe() throws {
    app.launchArguments = [
      "-kouchd.introductionRevision", "0",
      "--funnel", "host_onboarding=current"
    ]
    app.launch()

    let firstHeading = app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "A shared stay")
    ).firstMatch
    XCTAssertTrue(firstHeading.waitForExistence(timeout: 10))
    attachScreenshot(named: "onboarding-01-start")

    swipeToNextPage()
    XCTAssertTrue(app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "Good stays start")
    ).firstMatch.waitForExistence(timeout: 5))

    swipeToNextPage()
    XCTAssertTrue(app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "Clear records")
    ).firstMatch.waitForExistence(timeout: 5))

    swipeToNextPage()
    XCTAssertTrue(app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "Make the everyday")
    ).firstMatch.waitForExistence(timeout: 5))
    attachScreenshot(named: "onboarding-04-final-preview")

    swipeToNextPage()
    XCTAssertTrue(app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS %@", "making room")
    ).firstMatch.waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["Create a stay"].exists)
    XCTAssertTrue(app.buttons["Join a stay"].exists)
    attachScreenshot(named: "onboarding-05-role-choice")
  }

  func testHostCanOpenPurchaseScreen() throws {
    app.launchArguments = [
      "-kouchd.introductionRevision", "1",
      "--screenshot-demo-host"
    ]
    app.launch()

    XCTAssertTrue(app.buttons["Stay"].waitForExistence(timeout: 10))
    app.buttons["Stay"].tap()

    let settings = app.buttons["Settings and reminders"]
    XCTAssertTrue(settings.waitForExistence(timeout: 5))
    settings.tap()

    let about = app.buttons["About Kouchd"]
    if !about.isHittable { app.swipeUp() }
    XCTAssertTrue(about.waitForExistence(timeout: 5))
    about.tap()

    let openPlus = app.buttons["Open Kouchd Plus"]
    if !openPlus.isHittable { app.swipeUp() }
    XCTAssertTrue(openPlus.waitForExistence(timeout: 5))
    openPlus.tap()

    XCTAssertTrue(app.navigationBars["Kouchd Plus"].waitForExistence(timeout: 10))
    XCTAssertTrue(
      app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Annual")).firstMatch
        .waitForExistence(timeout: 10)
    )
    XCTAssertTrue(app.buttons["Restore Purchases"].exists)
    attachScreenshot(named: "purchase-screen")
  }

  private func attachScreenshot(named name: String) {
    let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  private func swipeToNextPage() {
    // The product intentionally debounces rapid swipes so one gesture cannot
    // skip multiple onboarding pages. Match a human pace in the UI test.
    Thread.sleep(forTimeInterval: 1.1)
    app.swipeLeft()
  }
}
