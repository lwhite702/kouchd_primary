import ConvexMobile
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

@MainActor final class PlusPurchaseTests: XCTestCase {
  private let monthly = BillingPackage(id: "$rc_monthly", title: "Plus Monthly", detail: "", price: "$4.99", period: "month",
                                       productID: BillingProduct.monthly, priceAmount: 4.99, freeTrialDays: 14)
  private let annual = BillingPackage(id: "$rc_annual", title: "Plus Yearly", detail: "", price: "$39.99", period: "year",
                                      productID: BillingProduct.annual, priceAmount: 39.99, freeTrialDays: 14)

  func testYearlyIsDefaultAndSavingsAreComputedFromStorePrices() async {
    let client = BillingClientMock()
    client.availablePackages = [monthly, annual]
    let model = BillingModel(client: client)
    await model.load()
    XCTAssertEqual(model.selectedPackage?.id, annual.id)
    XCTAssertEqual(model.annualSavingsPercent, 33)
  }

  func testSignedKouchdAnswerDecidesTrialWording() async {
    let client = BillingClientMock()
    client.availablePackages = [monthly, annual]
    let model = BillingModel(client: client) { productID, _ in
      (productID == BillingProduct.annual, "jws-\(productID)")
    }
    await model.load(kouchdTrialEligible: true)
    XCTAssertEqual(model.trialDays(for: annual), 14)
    XCTAssertNil(model.trialDays(for: monthly))
  }

  func testUsedTrialOnWebHidesTrialEvenWhenAppleWouldOfferIt() async {
    let client = BillingClientMock()
    client.availablePackages = [annual]
    client.appleEligibleIDs = [annual.id]
    let model = BillingModel(client: client) { _, _ in (nil, nil) }
    await model.load(kouchdTrialEligible: false)
    XCTAssertNil(model.trialDays(for: annual))
  }

  func testWithoutSignatureBothKouchdAndAppleMustAgree() async {
    let client = BillingClientMock()
    client.availablePackages = [monthly, annual]
    client.appleEligibleIDs = [annual.id]
    let model = BillingModel(client: client) { _, _ in (nil, nil) }
    await model.load(kouchdTrialEligible: true)
    XCTAssertEqual(model.trialDays(for: annual), 14)
    XCTAssertNil(model.trialDays(for: monthly))
  }

  func testPurchasePassesFreshSignedEligibility() async {
    let client = BillingClientMock()
    var askedTransactionIDs: [String?] = []
    let model = BillingModel(client: client) { productID, transactionID in
      askedTransactionIDs.append(transactionID)
      return (false, "signed-\(productID)")
    }
    await model.purchase(annual)
    XCTAssertEqual(client.purchasedJWS, ["signed-\(BillingProduct.annual)"])
    XCTAssertEqual(askedTransactionIDs, ["2000000123456789"])
  }

  func testSuccessWaitsForBackendToRecordPlus() async {
    let client = BillingClientMock()
    var backendHasPlus = false
    let model = BillingModel(client: client, isPlanConfirmed: { backendHasPlus }, confirmationTimeout: .seconds(5))
    let purchase = Task { await model.purchase(annual) }
    try? await Task.sleep(for: .milliseconds(200))
    XCTAssertTrue(model.isConfirming)
    XCTAssertTrue(model.message.isEmpty)
    backendHasPlus = true
    await purchase.value
    XCTAssertFalse(model.isConfirming)
    XCTAssertTrue(model.message.hasPrefix("You're on Plus"))
    XCTAssertNil(model.activeOperation)
  }

  func testUnconfirmedPurchaseFallsBackWithoutClaimingPlus() async {
    let client = BillingClientMock()
    let model = BillingModel(client: client, isPlanConfirmed: { false }, confirmationTimeout: .milliseconds(100))
    await model.purchase(annual)
    XCTAssertFalse(model.isConfirming)
    XCTAssertFalse(model.message.contains("You're on Plus"))
    XCTAssertTrue(model.message.contains("still confirming"))
  }

  func testPendingPurchaseSaysNothingWasCharged() async {
    let client = BillingClientMock()
    client.purchaseResult = .pending
    let model = BillingModel(client: client)
    await model.purchase(annual)
    XCTAssertTrue(model.message.contains("Nothing has been charged"))
    XCTAssertTrue(model.error.isEmpty)
  }

  func testPlanLimitErrorIsReadFromConvexErrorData() {
    let data = #"{"code":"plan_limit","dimension":"stay","plan":"free","limit":1,"atHighestPlan":false,"message":"Free includes 1 active stay."}"#
    let limit = KouchdStore.planLimit(from: ClientError.ConvexError(data: data))
    XCTAssertEqual(limit?.dimension, "stay")
    XCTAssertEqual(limit?.isGuest, false)
    XCTAssertNil(KouchdStore.planLimit(from: ClientError.ConvexError(data: #""Something else""#)))
    XCTAssertEqual(KouchdStore.message(for: ClientError.ConvexError(data: #"{"message":"Readable"}"#)), "Readable")
  }

  func testUsageCountsReadPlainly() {
    XCTAssertEqual(PlanCopy.count(.init(used: 1, limit: 5)), "1 of 5")
    XCTAssertEqual(PlanCopy.count(.init(used: 7, limit: nil)), "7 · no limit")
    XCTAssertTrue(PlanUsage.Count(used: 1, limit: 1).isFull)
  }
}

@MainActor private final class BillingClientMock: BillingClient {
  var availablePackages: [BillingPackage] = []
  var purchaseResult: BillingPurchaseResult = .purchased
  var failure: Error?
  var identities: [String?] = []
  var purchasedIDs: [String] = []
  var restoreCount = 0
  var purchasedJWS: [String?] = []
  var appleEligibleIDs: Set<String> = []
  var transactionID: String? = "2000000123456789"

  func updateIdentity(_ userID: String?) async throws { identities.append(userID) }
  func packages() async throws -> [BillingPackage] { availablePackages }
  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult {
    purchasedIDs.append(packageID)
    purchasedJWS.append(introductoryOfferEligibilityJWS)
    if let failure { throw failure }
    return purchaseResult
  }
  func appleTrialEligible(packageID: String) async -> Bool { appleEligibleIDs.contains(packageID) }
  func appTransactionID() async -> String? { transactionID }
  func restore() async throws { restoreCount += 1 }
  func managementURL() async throws -> URL? { URL(string: "https://apps.apple.com/account/subscriptions") }
}

private enum TestFailure: LocalizedError {
  case declined
  var errorDescription: String? { "Payment declined" }
}
