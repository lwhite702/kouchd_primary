import XCTest
@testable import Kouchd

@MainActor final class BillingModelTests: XCTestCase {
  func testLoadsStoreProvidedPackages() async {
    let client = BillingClientMock()
    client.availablePackages = [.init(id: "plus", title: "Host Plus", detail: "For active hosts", price: "$4.99")]
    let model = BillingModel(client: client)
    await model.load()
    XCTAssertEqual(model.packages, client.availablePackages)
  }

  func testPriceIncludesRenewalPeriodWhenKnown() {
    let monthly = BillingPackage(id: "m", title: "Monthly", detail: "", price: "$4.99", period: "month")
    XCTAssertEqual(monthly.priceWithPeriod, "$4.99 / month")
    let unknown = BillingPackage(id: "u", title: "Plan", detail: "", price: "$4.99")
    XCTAssertEqual(unknown.priceWithPeriod, "$4.99")
  }

  func testPurchaseSuccessWaitsForServerVerification() async {
    let client = BillingClientMock()
    let package = BillingPackage(id: "plus", title: "Host Plus", detail: "", price: "$4.99")
    let model = BillingModel(client: client)
    await model.purchase(package)
    XCTAssertTrue(model.message.contains("verifies"))
    XCTAssertEqual(client.purchasedIDs, ["plus"])
  }

  func testCancellationIsNotAnError() async {
    let client = BillingClientMock()
    client.purchaseResult = .cancelled
    let model = BillingModel(client: client)
    await model.purchase(.init(id: "plus", title: "Host Plus", detail: "", price: "$4.99"))
    XCTAssertTrue(model.error.isEmpty)
    XCTAssertTrue(model.message.isEmpty)
  }

  func testPurchaseFailureIsShownAndOperationClears() async {
    let client = BillingClientMock()
    client.failure = TestFailure.declined
    let model = BillingModel(client: client)
    await model.purchase(.init(id: "plus", title: "Host Plus", detail: "", price: "$4.99"))
    XCTAssertEqual(model.error, "Payment declined")
    XCTAssertNil(model.activeOperation)
  }

  func testSecondPurchaseCannotStartWhileOperationIsActive() async {
    let client = BillingClientMock()
    let model = BillingModel(client: client)
    model.activeOperation = "existing"
    await model.purchase(.init(id: "plus", title: "Host Plus", detail: "", price: "$4.99"))
    XCTAssertTrue(client.purchasedIDs.isEmpty)
    XCTAssertEqual(model.activeOperation, "existing")
  }

  func testRestoreAndIdentitySwitch() async {
    let client = BillingClientMock()
    let model = BillingModel(client: client)
    await model.updateIdentity("user_one")
    await model.updateIdentity(nil)
    await model.updateIdentity("user_two")
    await model.restore()
    XCTAssertEqual(client.identities, ["user_one", nil, "user_two"])
    XCTAssertEqual(client.restoreCount, 1)
    XCTAssertTrue(model.message.contains("restored"))
  }

  func testP2PRoutingBuildsExpectedDeepLinksAndRewardsOffset() {
    let venmoURI = P2PRouting.buildURI(
      channel: .venmo,
      handle: "@johndoe",
      amountDollars: "45.00",
      memo: "Marketplace Order #991"
    )
    XCTAssertEqual(
      venmoURI,
      "venmo://paycharge?txn=pay&recipients=johndoe&amount=45.00&note=Marketplace%20Order%20%23991"
    )

    let cashAppURI = P2PRouting.buildURI(
      channel: .cashapp,
      handle: "$johndoe33",
      amountDollars: "45.00",
      memo: "House stay"
    )
    XCTAssertEqual(cashAppURI, "https://cash.app/$johndoe33/45.00")

    let chimeURI = P2PRouting.buildURI(
      channel: .chime,
      handle: "john-doe-chime",
      amountDollars: "45.00",
      memo: "House stay"
    )
    XCTAssertEqual(chimeURI, "https://app.chime.com/link/qr?u=john-doe-chime")

    let paypalURI = P2PRouting.buildURI(
      channel: .paypal,
      handle: "https://paypal.me/johndoe",
      amountDollars: "45.00",
      memo: "House stay"
    )
    XCTAssertEqual(paypalURI, "https://paypal.me/johndoe/45.00")
    XCTAssertEqual(P2PRouting.formattedHandle(channel: .paypal, rawHandle: "https://paypal.me/johndoe"), "paypal.me/johndoe")

    let offset = P2PRouting.calculateRewardsOffset(
      amountDollars: "45.00",
      pointsToApply: 15,
      availablePoints: 40,
      centsPerPoint: 100
    )
    XCTAssertEqual(offset.grossAmountCents, 4500)
    XCTAssertEqual(offset.pointsApplied, 15)
    XCTAssertEqual(offset.rewardCreditCents, 1500)
    XCTAssertEqual(offset.netPayableCents, 3000)
    XCTAssertEqual(offset.netPayableFormatted, "30.00")
  }
}

@MainActor private final class BillingClientMock: BillingClient {
  var availablePackages: [BillingPackage] = []
  var purchaseResult: BillingPurchaseResult = .purchased
  var failure: Error?
  var identities: [String?] = []
  var purchasedIDs: [String] = []
  var restoreCount = 0

  func updateIdentity(_ userID: String?) async throws { identities.append(userID) }
  func packages() async throws -> [BillingPackage] { availablePackages }
  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult {
    purchasedIDs.append(packageID)
    if let failure { throw failure }
    return purchaseResult
  }
  func restore() async throws { restoreCount += 1 }
  func managementURL() async throws -> URL? { URL(string: "https://apps.apple.com/account/subscriptions") }
}

private enum TestFailure: LocalizedError {
  case declined
  var errorDescription: String? { "Payment declined" }
}
