import XCTest
@testable import Kouchd

final class LaunchContractTests: XCTestCase {
  func testAgreementContractKeepsLegacyOptionalFieldsCompatible() throws {
    let data = Data("""
    {"_id":"agreement","version":2,"startDate":"2026-10-22","endDate":"2026-11-01","cadence":"weekly","rateCents":1501,"futureField":true}
    """.utf8)
    let terms = try JSONDecoder().decode(AgreementRecord.self, from: data)
    XCTAssertEqual(terms.rateCents, 1501)
    XCTAssertNil(terms.billingBasis)
  }
  func testLedgerContractKeepsIntegerCentsAndDocumentIdentity() throws {
    let data = Data("""
    {"_id":"ledger-row","baseAmountCents":1501,"effectiveChargeCents":1501,"balanceCents":501,"dueDate":"2026-10-22","status":"due","futureField":true}
    """.utf8)
    let record = try JSONDecoder().decode(LedgerRecord.self, from: data)
    XCTAssertEqual(record.id, "ledger-row")
    XCTAssertEqual(record.balanceCents, 501)
  }

  func testCalendarUsesTheStayTimezoneAcrossMidnight() {
    let now = Date(timeIntervalSince1970: 1792639800) // 2026-10-22T03:30:00Z
    XCTAssertEqual(Display.date(now, timezone: "America/New_York"), "2026-10-21")
    XCTAssertEqual(Display.date(now, timezone: "UTC"), "2026-10-22")
  }

  func testSubscriptionContractAllowsAdditionalServerCapabilities() throws {
    let data = Data("""
    {"canManageSubscription":true,"plan":"hostPlus","status":"active","currentPeriodEndsAt":1800000000000,"capabilities":{"future":true}}
    """.utf8)
    XCTAssertEqual(try JSONDecoder().decode(AccountSubscriptionSummary.self, from: data).plan, "hostPlus")
  }
}
