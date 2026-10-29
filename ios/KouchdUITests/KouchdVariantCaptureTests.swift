import XCTest

/// Captures every funnel variant screen for the Appto Onboarding section.
/// Run on its own: `-only-testing:KouchdUITests/KouchdVariantCaptureTests`.
/// Screenshots are attached as `<placement>.<variant>.<NN>`.
final class KouchdVariantCaptureTests: XCTestCase {
  private let app = XCUIApplication()

  override func setUpWithError() throws {
    continueAfterFailure = false
  }

  func testHostOnboardingVariants() throws {
    for variant in ["current", "compact", "guided"] {
      app.terminate()
      app.launchArguments = [
        "-kouchd.introductionRevision", "0",
        "--funnel", "host_onboarding=\(variant)",
        "--sandbox"
      ]
      app.launch()
      XCTAssertTrue(app.buttons["Skip"].waitForExistence(timeout: 10))
      capture("host_onboarding.\(variant).01")
      for index in 2...5 {
        // The introduction debounces rapid swipes, so pace like a person.
        Thread.sleep(forTimeInterval: 1.1)
        app.swipeLeft()
        Thread.sleep(forTimeInterval: 0.6)
        capture("host_onboarding.\(variant).0\(index)")
      }
      XCTAssertTrue(app.buttons["Create a stay"].exists)
    }
  }

  func testPaywallVariants() throws {
    for variant in ["current", "annual_trial"] {
      app.terminate()
      app.launchArguments = [
        "-kouchd.introductionRevision", "1",
        "--screenshot-demo-host",
        "--funnel", "kouchd_plus_paywall=\(variant)",
        "--sandbox"
      ]
      app.launch()
      XCTAssertTrue(app.buttons["Stay"].waitForExistence(timeout: 10))
      app.buttons["Stay"].tap()
      let settings = app.buttons["Settings and reminders"]
      if !settings.isHittable { app.swipeUp() }
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
      // Let the offerings load before the capture.
      Thread.sleep(forTimeInterval: 4)
      capture("kouchd_plus_paywall.\(variant).01")
    }
  }

  private func capture(_ name: String) {
    let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
}
