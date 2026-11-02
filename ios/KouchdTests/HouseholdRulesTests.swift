import XCTest
@testable import Kouchd

final class HouseholdRulesTests: XCTestCase {
  private func item(visibility: String, createdBy: String) -> Value {
    .object(["_id": .string("item"), "visibility": .string(visibility), "createdBy": .string(createdBy)])
  }

  func testAnyMemberCanEditSharedShoppingItems() {
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(item(visibility: "shared", createdBy: "guest-a"), viewerID: "guest-b"))
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(item(visibility: "shared", createdBy: "guest-a"), viewerID: "host"))
  }

  func testPersonalShoppingItemsAreEditableOnlyByTheirCreator() {
    let personal = item(visibility: "personal", createdBy: "guest-a")
    XCTAssertTrue(HouseholdRules.canEditShoppingItem(personal, viewerID: "guest-a"))
    XCTAssertFalse(HouseholdRules.canEditShoppingItem(personal, viewerID: "host"), "Hosts get no access to a guest's personal item")
    XCTAssertFalse(HouseholdRules.canEditShoppingItem(personal, viewerID: "guest-b"))
  }

  func testMissingViewerIsNotTreatedAsCreator() {
    XCTAssertFalse(HouseholdRules.canEditShoppingItem(item(visibility: "personal", createdBy: ""), viewerID: ""))
  }

  func testOnlyTheCreatorCanMakeAnItemPersonal() {
    let shared = item(visibility: "shared", createdBy: "guest-a")
    XCTAssertTrue(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "guest-a"))
    XCTAssertFalse(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "host"))
    XCTAssertFalse(HouseholdRules.canSetShoppingItemPersonal(shared, viewerID: "guest-b"))
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
