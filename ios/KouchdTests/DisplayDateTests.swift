import XCTest
@testable import Kouchd

final class DisplayDateTests: XCTestCase {
  private let us = Locale(identifier: "en_US")

  func testCalendarDaysReadAsFriendlyDates() {
    XCTAssertEqual(Display.dayDate("2026-10-04", locale: us), "Oct 4, 2026")
    XCTAssertEqual(Display.dayDate("2027-01-18", locale: us), "Jan 18, 2027")
  }

  func testDayNeverShiftsAcrossTimeZones() {
    // Days at the edges of the year stay on the stored day wherever the device is,
    // including the furthest zones behind (UTC-11) and ahead of (UTC+14) UTC.
    let original = NSTimeZone.default
    defer { NSTimeZone.default = original }
    for zone in ["Pacific/Pago_Pago", "America/Los_Angeles", "UTC", "Asia/Tokyo", "Pacific/Kiritimati"] {
      NSTimeZone.default = TimeZone(identifier: zone)!
      XCTAssertEqual(Display.dayDate("2026-12-31", locale: us), "Dec 31, 2026", zone)
      XCTAssertEqual(Display.dayDate("2027-01-01", locale: us), "Jan 1, 2027", zone)
    }
  }

  func testFollowsThePersonsLocale() {
    XCTAssertEqual(Display.dayDate("2026-10-04", locale: Locale(identifier: "en_GB")), "4 Oct 2026")
  }

  func testTextThatIsNotADayIsShownUnchanged() {
    XCTAssertEqual(Display.dayDate(""), "")
    XCTAssertEqual(Display.dayDate("Set a date"), "Set a date")
    XCTAssertEqual(Display.dayDate("2026-13-40"), "2026-13-40")
    XCTAssertEqual(Display.dayDate("2026-02-30"), "2026-02-30")
  }

  func testOnlyTheExactStoredShapeIsReformatted() {
    XCTAssertEqual(Display.dayDate("2026-1-4"), "2026-1-4")
    XCTAssertEqual(Display.dayDate(" 2026-10-04"), " 2026-10-04")
    XCTAssertEqual(Display.dayDate("2026-10-04 "), "2026-10-04 ")
    XCTAssertEqual(Display.dayDate("2026-10-04T09:00"), "2026-10-04T09:00")
  }

  private func value(_ fields: [String: String]) -> Value { .object(fields.mapValues { .string($0) }) }

  func testOnlyTheOccupiedNightsTitleHasItsDayReformatted() {
    XCTAssertEqual(Display.obligationTitle(value(["type": "occupancy", "title": "Occupied nights due 2026-11-05"]), locale: us),
                   "Occupied nights due Nov 5, 2026")
    // A title a host typed keeps their date as written.
    XCTAssertEqual(Display.obligationTitle(value(["type": "adhoc", "title": "Deposit due 2026-11-05"]), locale: us),
                   "Deposit due 2026-11-05")
    XCTAssertEqual(Display.obligationTitle(value(["type": "scheduled", "title": "Week of Oct 19"]), locale: us), "Week of Oct 19")
    XCTAssertEqual(Display.obligationTitle(value(["type": "adhoc", "title": ""]), locale: us), "Stay contribution")
  }

  func testOnlyTheServerAppendedDayInActivityIsReformatted() {
    XCTAssertEqual(Display.activityDetail(value(["action": "recurrence_scheduled", "detail": "Kitchen reset scheduled again for 2026-11-08"]), locale: us),
                   "Kitchen reset scheduled again for Nov 8, 2026")
    // The chore title is typed, so a date inside it stays as written.
    XCTAssertEqual(Display.activityDetail(value(["action": "recurrence_scheduled", "detail": "Clean 2026-01-01 mess scheduled again for 2026-11-08"]), locale: us),
                   "Clean 2026-01-01 mess scheduled again for Nov 8, 2026")
    XCTAssertEqual(Display.activityDetail(value(["action": "late_fee_waived", "detail": "Late fee waived for obligation due 2026-10-26"]), locale: us),
                   "Late fee waived for obligation due Oct 26, 2026")
    XCTAssertEqual(Display.activityDetail(value(["action": "created", "detail": "Alex added Move out 2026-12-01"]), locale: us),
                   "Alex added Move out 2026-12-01")
  }

  func testStayRangeJoinsBothDays() {
    XCTAssertEqual(Display.dayRange("2026-10-04", "2027-01-18", locale: us), "Oct 4, 2026 – Jan 18, 2027")
  }
}
