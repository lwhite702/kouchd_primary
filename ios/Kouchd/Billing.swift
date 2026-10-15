import Foundation
import Observation
import RevenueCat
import SwiftUI

struct BillingPackage: Identifiable, Equatable, Sendable {
  let id: String
  let title: String
  let detail: String
  let price: String
}

enum BillingPurchaseResult: Equatable, Sendable {
  case purchased
  case cancelled
}

@MainActor protocol BillingClient: AnyObject {
  func updateIdentity(_ userID: String?) async throws
  func packages() async throws -> [BillingPackage]
  func purchase(packageID: String) async throws -> BillingPurchaseResult
  func restore() async throws
  func managementURL() async throws -> URL?
}

@MainActor final class RevenueCatBillingClient: BillingClient {
  static let shared = RevenueCatBillingClient()
  private var packagesByID: [String: Package] = [:]

  private init() {}

  func updateIdentity(_ userID: String?) async throws {
    guard AppConfig.purchasesEnabled else { return }
    let purchases = Purchases.shared
    guard let userID else {
      if !purchases.isAnonymous { _ = try await purchases.logOut() }
      packagesByID = [:]
      return
    }
    if purchases.appUserID == userID { return }
    if !purchases.isAnonymous { _ = try await purchases.logOut() }
    _ = try await purchases.logIn(userID)
    packagesByID = [:]
  }

  func packages() async throws -> [BillingPackage] {
    guard AppConfig.purchasesEnabled else { return [] }
    let available = (try await Purchases.shared.offerings().current?.availablePackages ?? []).filter {
      let productID = $0.storeProduct.productIdentifier
      return productID.hasPrefix("kouchd_plus") || productID.hasPrefix("kouchd_pro")
    }
    packagesByID = Dictionary(uniqueKeysWithValues: available.map { ($0.identifier, $0) })
    return available.map {
      BillingPackage(
        id: $0.identifier,
        title: $0.storeProduct.localizedTitle,
        detail: $0.storeProduct.localizedDescription,
        price: $0.localizedPriceString
      )
    }
  }

  func purchase(packageID: String) async throws -> BillingPurchaseResult {
    guard let package = packagesByID[packageID] else {
      throw BillingError.packageUnavailable
    }
    let result = try await Purchases.shared.purchase(package: package)
    return result.userCancelled ? .cancelled : .purchased
  }

  func restore() async throws {
    _ = try await Purchases.shared.restorePurchases()
  }

  func managementURL() async throws -> URL? {
    try await Purchases.shared.customerInfo().managementURL
  }
}

enum BillingError: LocalizedError {
  case packageUnavailable

  var errorDescription: String? {
    switch self {
    case .packageUnavailable: "That subscription option is no longer available. Refresh and try again."
    }
  }
}

@MainActor @Observable final class BillingModel {
  private let client: BillingClient
  var packages: [BillingPackage] = []
  var isLoading = false
  var activeOperation: String?
  var message = ""
  var error = ""

  init(client: BillingClient) {
    self.client = client
  }

  func updateIdentity(_ userID: String?) async {
    do {
      try await client.updateIdentity(userID)
      packages = []
    } catch {
      self.error = error.localizedDescription
    }
  }

  func load() async {
    guard activeOperation == nil else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      packages = try await client.packages()
      error = ""
    } catch {
      self.error = error.localizedDescription
    }
  }

  func purchase(_ package: BillingPackage) async {
    guard activeOperation == nil else { return }
    activeOperation = package.id
    defer { activeOperation = nil }
    do {
      let result = try await client.purchase(packageID: package.id)
      if result == .purchased {
        message = "Purchase received. Your household plan will update after Kouchd verifies it."
      }
      error = ""
    } catch {
      self.error = error.localizedDescription
    }
  }

  func restore() async {
    guard activeOperation == nil else { return }
    activeOperation = "restore"
    defer { activeOperation = nil }
    do {
      try await client.restore()
      message = "Purchases restored. Your household plan will update after Kouchd verifies them."
      error = ""
    } catch {
      self.error = error.localizedDescription
    }
  }

  func managementURL() async -> URL? {
    do { return try await client.managementURL() }
    catch {
      self.error = error.localizedDescription
      return nil
    }
  }
}

struct SubscriptionScreen: View {
  let store: KouchdStore
  @State private var billing = BillingModel(client: RevenueCatBillingClient.shared)
  @Environment(\.openURL) private var openURL

  var body: some View {
    Page(title: "Your subscription") {
      Card {
        Text("Household plan").font(.headline)
        DataRow(title: "Plan", detail: planName)
        DataRow(title: "Status", detail: statusName)
        if let periodEnd = periodEnd {
          DataRow(title: "Current period ends", detail: periodEnd.formatted(date: .abbreviated, time: .omitted))
        }
        Text("Kouchd verifies household access on the server. Store purchase status never unlocks features by itself.")
          .font(.footnote).foregroundStyle(Palette.muted)
      }

      if !store.subscriptionSummary["canManageSubscription"].flag {
        EmptyCard(title: "Guests stay free", message: "Only the household host manages a Kouchd subscription. Your agreements, records, ledger, chores, and participation remain available.")
      } else if !AppConfig.purchasesEnabled {
        EmptyCard(title: "Subscriptions are coming soon", message: "Purchase options will appear after Kouchd finishes App Store and plan verification.")
      } else {
        if billing.isLoading {
          ProgressView("Loading current prices")
        } else if billing.packages.isEmpty {
          EmptyCard(title: "No purchase options available", message: "Try again later or manage an existing subscription.")
        } else {
          ForEach(billing.packages) { package in
            Card {
              Text(package.title).font(.headline)
              Text(package.detail).foregroundStyle(Palette.muted)
              Text(package.price).font(.title3.bold())
              PrimaryButton(title: billing.activeOperation == package.id ? "Starting purchase…" : "Choose \(package.title)") {
                Task { await billing.purchase(package) }
              }
              .disabled(billing.activeOperation != nil)
            }
          }
        }
        Button("Restore purchases") { Task { await billing.restore() } }
          .disabled(billing.activeOperation != nil)
        Button("Manage subscription") {
          Task { if let url = await billing.managementURL() { openURL(url) } }
        }
        Button("Refresh options") { Task { await billing.load() } }
          .disabled(billing.activeOperation != nil)
      }

      if !billing.message.isEmpty {
        Text(billing.message).font(.footnote).foregroundStyle(Palette.forest)
      }
      if !billing.error.isEmpty {
        Text(billing.error).font(.footnote).foregroundStyle(.red)
      }
    }
    .task { if AppConfig.purchasesEnabled { await billing.load() } }
  }

  private var planName: String {
    switch store.subscriptionSummary["plan"].text {
    case "hostPlus": "Host Plus"
    case "householdPro": "Household Pro"
    default: "Starter"
    }
  }

  private var statusName: String {
    store.subscriptionSummary["status"].text.replacingOccurrences(of: "_", with: " ").capitalized
  }

  private var periodEnd: Date? {
    let value = store.subscriptionSummary["currentPeriodEndsAt"].double
    return value > 0 ? Date(timeIntervalSince1970: value / 1000) : nil
  }
}
