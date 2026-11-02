import XCTest
@testable import Kouchd

final class KouchdLayoutTests: XCTestCase {
  func testColumnsFollowContentWidth() {
    XCTAssertEqual(KouchdLayout.columns(forWidth: 0), 1)
    XCTAssertEqual(KouchdLayout.columns(forWidth: 400), 1)
    XCTAssertEqual(KouchdLayout.columns(forWidth: 699), 1)
    XCTAssertEqual(KouchdLayout.columns(forWidth: 700), 2)
    XCTAssertEqual(KouchdLayout.columns(forWidth: 999), 2)
    XCTAssertEqual(KouchdLayout.columns(forWidth: 1000), 3)
  }

  func testAccessibilityTextStaysInOneColumn() {
    XCTAssertEqual(KouchdLayout.columns(forWidth: 1200, isAccessibilitySize: true), 1)
  }
}

final class StayToolVisibilityTests: XCTestCase {
  private func context(host: Bool = false, ended: Bool = false, nights: Bool = false, admin: Bool = false) -> StayTool.Context {
    StayTool.Context(isHost: host, isEnded: ended, usesOccupiedNights: nights, isAdmin: admin)
  }

  func testHostControlsOnlyForHostsOfActiveStays() {
    XCTAssertTrue(StayTool.hostControls.isVisible(in: context(host: true)))
    XCTAssertFalse(StayTool.hostControls.isVisible(in: context(host: true, ended: true)))
    XCTAssertFalse(StayTool.hostControls.isVisible(in: context()))
  }

  func testAgreementRowIsForGuests() {
    XCTAssertTrue(StayTool.agreement.isVisible(in: context()))
    XCTAssertFalse(StayTool.agreement.isVisible(in: context(host: true)))
  }

  func testOccupiedNightsFollowsTheAgreement() {
    XCTAssertFalse(StayTool.occupancy.isVisible(in: context()))
    XCTAssertTrue(StayTool.occupancy.isVisible(in: context(nights: true)))
  }

  func testAdministrationNeedsAccess() {
    XCTAssertFalse(StayTool.admin.isVisible(in: context(host: true)))
    XCTAssertTrue(StayTool.admin.isVisible(in: context(admin: true)))
  }

  func testPlanNeedsAManageableSubscription() {
    XCTAssertFalse(StayTool.plan.isVisible(in: context()))
    var manageable = context()
    manageable.canManagePlan = true
    XCTAssertTrue(StayTool.plan.isVisible(in: manageable))
  }

  func testOnlyHelpHasNoRoute() {
    XCTAssertEqual(StayTool.allCases.filter { $0.route == nil }, [.help])
  }
}

@MainActor
final class ShellNavigatorTests: XCTestCase {
  func testToolSelectionCarriesToTabs() {
    let navigator = ShellNavigator()
    navigator.select(.tool(.shopping))
    navigator.detailPath = [.about]
    navigator.syncLayout(toSidebar: false)
    XCTAssertEqual(navigator.tab, .more)
    XCTAssertEqual(navigator.morePath, [.shopping, .about])
  }

  func testMorePathCarriesToSidebar() {
    let navigator = ShellNavigator()
    navigator.openMore(.rewards)
    navigator.morePath = [.rewards, .about]
    navigator.syncLayout(toSidebar: true)
    XCTAssertEqual(navigator.section, .tool(.rewards))
    XCTAssertEqual(navigator.detailPath, [.about])
  }

  func testMoreRootKeepsTheLastSidebarSection() {
    let navigator = ShellNavigator()
    navigator.select(.ledger)
    navigator.selectTab(.more)
    navigator.syncLayout(toSidebar: true)
    XCTAssertEqual(navigator.section, .ledger)
  }

  func testActivityLinksOpenTheRelatedPlace() {
    let navigator = ShellNavigator()
    navigator.openActivity("contribution")
    XCTAssertEqual(navigator.section, .ledger)
    XCTAssertEqual(navigator.tab, .ledger)
    navigator.openActivity("terms", action: "payment_schedule_requested")
    XCTAssertEqual(navigator.section, .tool(.schedule))
    navigator.openActivity("something_new")
    XCTAssertEqual(navigator.section, .tool(.activity))
  }

  func testSwitchingStaysLeavesStayScopedScreens() {
    let navigator = ShellNavigator()
    navigator.select(.tool(.hostControls))
    navigator.detailPath = [.houseInfo]
    navigator.tabPaths[.home] = [.agreement]
    navigator.stayDidChange()
    XCTAssertEqual(navigator.section, .home)
    XCTAssertTrue(navigator.detailPath.isEmpty)
    XCTAssertTrue(navigator.morePath.isEmpty)
    XCTAssertTrue(navigator.tabPaths.isEmpty)
  }

  func testSwitchingStaysKeepsAnEverydaySection() {
    let navigator = ShellNavigator()
    navigator.select(.ledger)
    navigator.stayDidChange()
    XCTAssertEqual(navigator.section, .ledger)
  }

  func testEverydayPushedScreensCarryAcrossAResize() {
    let navigator = ShellNavigator()
    navigator.detailPath = [.agreement]
    navigator.syncLayout(toSidebar: false)
    XCTAssertEqual(navigator.tabPaths[.home], [.agreement])
    navigator.detailPath = []
    navigator.syncLayout(toSidebar: true)
    XCTAssertEqual(navigator.detailPath, [.agreement])
  }

  func testWorkflowsThatDismissArePushed() {
    let navigator = ShellNavigator()
    navigator.select(.tool(.createStay))
    XCTAssertEqual(navigator.section, .home)
    XCTAssertEqual(navigator.detailPath, [.createStay])
    XCTAssertEqual(navigator.tabPaths[.home], [.createStay])
    navigator.selectTab(.more)
    navigator.morePath = [.joinCode]
    navigator.syncLayout(toSidebar: true)
    XCTAssertEqual(navigator.section, .home)
    XCTAssertEqual(navigator.detailPath, [.joinCode])
  }

  func testUnavailableToolsCloseWhenAccessChanges() {
    let navigator = ShellNavigator()
    navigator.select(.tool(.hostControls))
    navigator.detailPath = [.termsEdit]
    let hostedEnded = StayTool.Context(isHost: true, isEnded: true, usesOccupiedNights: false, isAdmin: false)
    navigator.closeUnavailableTools(in: hostedEnded)
    XCTAssertEqual(navigator.section, .home)
    XCTAssertTrue(navigator.detailPath.isEmpty)
    XCTAssertTrue(navigator.morePath.isEmpty)
  }

  func testAvailableToolsStayOpen() {
    let navigator = ShellNavigator()
    navigator.select(.tool(.hostControls))
    let host = StayTool.Context(isHost: true, isEnded: false, usesOccupiedNights: false, isAdmin: false)
    navigator.closeUnavailableTools(in: host)
    XCTAssertEqual(navigator.section, .tool(.hostControls))
  }

  func testChoosingASectionClearsPushedScreens() {
    let navigator = ShellNavigator()
    navigator.detailPath = [.about]
    navigator.select(.chores)
    XCTAssertTrue(navigator.detailPath.isEmpty)
  }
}
