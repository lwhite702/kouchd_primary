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
  func purchase(packageID: String) async throws -> BillingPurchaseResult {
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
