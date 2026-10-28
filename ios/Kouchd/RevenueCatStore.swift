import Foundation
import Observation
import RevenueCat
import StoreKit

enum KouchdPurchaseError: LocalizedError {
  case productUnavailable
  case verificationFailed
  case pending

  var errorDescription: String? {
    switch self {
    case .productUnavailable: "This plan is not available right now."
    case .verificationFailed: "The App Store could not verify this purchase."
    case .pending: "This purchase is waiting for approval."
    }
  }
}

@MainActor
enum KouchdStorePurchase {
  static func purchase(_ package: Package, placement: String) async -> (userCancelled: Bool, error: Error?) {
    KouchdFunnel.mark(placement, .tap)
    do {
      guard let product = try await StoreKit.Product.products(
        for: [package.storeProduct.productIdentifier]
      ).first else {
        throw KouchdPurchaseError.productUnavailable
      }
      let result = try await product.purchase(options: [
        .appAccountToken(KouchdFunnel.token(placement))
      ])
      switch result {
      case .success(let verification):
        guard case .verified(let transaction) = verification else {
          throw KouchdPurchaseError.verificationFailed
        }
        await transaction.finish()
        try await Purchases.shared.syncPurchases()
        return (false, nil)
      case .userCancelled:
        return (true, nil)
      case .pending:
        return (false, KouchdPurchaseError.pending)
      @unknown default:
        return (false, KouchdPurchaseError.verificationFailed)
      }
    } catch {
      return (false, error)
    }
  }
}

@MainActor @Observable
final class KouchdPlusPurchaseModel {
  static let entitlementID = "kouchd_plus"

  var packages: [Package] = []
  var isLoading = false
  var isPurchasing = false
  var hasPlus = false
  var hasLoaded = false
  var message: String?

  func loadOfferings() async {
    guard AppConfig.revenueCatIsConfigured else {
      hasLoaded = true
      message = "Billing is unavailable in this build."
      return
    }

    isLoading = true
    defer { isLoading = false; hasLoaded = true }
    do {
      let offerings = try await Purchases.shared.offerings()
      packages = (offerings.current?.availablePackages ?? []).sorted { lhs, rhs in
        rank(lhs) < rank(rhs)
      }
      let customerInfo = try await Purchases.shared.customerInfo()
      updateEntitlement(from: customerInfo)
      if packages.isEmpty {
        message = "Plans are not available right now. Please try again shortly."
      } else {
        message = nil
      }
    } catch {
      packages = []
      message = "Plans are not available right now. Please try again shortly."
    }
  }

  func purchase(_ package: Package, placement: String = "kouchd_plus_paywall") async {
    guard !isPurchasing else { return }
    isPurchasing = true
    message = nil
    defer { isPurchasing = false }

    let purchaseResult = await KouchdStorePurchase.purchase(package, placement: placement)
    if purchaseResult.userCancelled { return }
    if let error = purchaseResult.error {
      if (error as NSError).code != ErrorCode.purchaseCancelledError.rawValue {
        message = error.localizedDescription
      }
      return
    }

    do {
      let customerInfo = try await Purchases.shared.customerInfo(fetchPolicy: .fetchCurrent)
      updateEntitlement(from: customerInfo)
      if !hasPlus {
        message = "The purchase completed, but Kouchd Plus is still being confirmed."
      }
    } catch {
      message = "The purchase completed, but Kouchd Plus is still being confirmed."
    }
  }

  func restore() async {
    guard !isPurchasing else { return }
    isPurchasing = true
    message = nil
    defer { isPurchasing = false }

    do {
      let customerInfo = try await Purchases.shared.restorePurchases()
      updateEntitlement(from: customerInfo)
      if !hasPlus {
        message = "No active Kouchd Plus purchase was found."
      }
    } catch {
      message = "We couldn't restore purchases. Please try again."
    }
  }

  private func updateEntitlement(from customerInfo: CustomerInfo) {
    hasPlus = customerInfo.entitlements.active[Self.entitlementID] != nil
  }

  private func rank(_ package: Package) -> Int {
    switch package.storeProduct.productIdentifier {
    case "kouchd_plus_yearly": return 0
    case "kouchd_plus_monthly": return 1
    case "kouchd_plus_lifetime": return 2
    default: return 2
    }
  }
}

enum KouchdRevenueCatIdentity {
  static func sync(userID: String?) async {
    guard AppConfig.revenueCatIsConfigured else { return }
    do {
      if let userID {
        _ = try await Purchases.shared.logIn(userID)
      } else if !Purchases.shared.isAnonymous {
        _ = try await Purchases.shared.logOut()
      }
    } catch {
      // The paywall remains usable anonymously if identity sync is unavailable.
    }
  }
}
