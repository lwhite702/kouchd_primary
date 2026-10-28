import XCTest
@testable import Kouchd

final class HouseholdRulesTests: XCTestCase {
  private func item(visibility: String, createdBy: String) -> Value {
    .object(["_id": .string("item"), "visibility": .string(visibility), "createdBy": .string(createdBy)])
  }

  func testAnyMemberCanEditSharedShoppingItems() {
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(item(visibility: "shared", createdBy: "guest-a"), viewerID: "guest-b", isHost: false))
  }

  func testPersonalShoppingItemsAreEditableOnlyByCreatorOrHost() {
    let personal = item(visibility: "personal", createdBy: "guest-a")
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(personal, viewerID: "guest-a", isHost: false))
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(personal, viewerID: "host", isHost: true))
    XCTAssertFalse(HouseholdRules.canEditShoppingItem(personal, viewerID: "guest-b", isHost: false))
  }

  func testMissingViewerIsNotTreatedAsCreator() {
    XCTAssertFalse(HouseholdRules.canEditShoppingItem(item(visibility: "personal", createdBy: ""), viewerID: "", isHost: false))
  }

  func testOnlyCreatorOrHostCanMakeAnItemPersonal() {
    let shared = item(visibility: "shared", createdBy: "guest-a")
    XCTAssertTrue(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "guest-a", isHost: false))
    XCTAssertTrue(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "host", isHost: true))
    XCTAssertFalse(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "guest-b", isHost: false))
  }

  func testChoreRepeatCadenceSendsOnlyServerAcceptedValues() {
    XCTAssertNil(HouseholdRules.choreRepeatCadence("none"))
    XCTAssertEqual(HouseholdRules.choreRepeatCadence("daily"), "daily")
    XCTAssertEqual(HouseholdRules.choreRepeatCadence("weekly"), "weekly")
    XCTAssertNil(HouseholdRules.choreRepeatCadence("monthly"))
    XCTAssertEqual(HouseholdRules.choreRepeatOptions.compactMap(HouseholdRules.choreRepeatCadence), ["daily", "weekly"])
  }

  func testChoreScheduleLabelShowsCadenceOnlyForRepeatingChores() {
    let oneTime: Value = .object(["assignee": .string("shared"), "dueDate": .string("2026-10-30")])
    let weekly: Value = .object(["assignee": .string("guest"), "dueDate": .string("2026-10-30"), "repeatCadence": .string("weekly")])
    XCTAssertEqual(HouseholdRules.choreScheduleLabel(oneTime), "Shared · 2026-10-30")
    XCTAssertEqual(HouseholdRules.choreScheduleLabel(weekly), "Guest · 2026-10-30 · Repeats weekly")
  }
}
