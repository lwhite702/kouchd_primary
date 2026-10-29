import Foundation
import Observation
import RevenueCat
import SwiftUI

struct BillingPackage: Identifiable, Equatable, Sendable {
  let id: String
  let title: String
  let detail: String
  let price: String
  /// Renewal period in words, such as "month" or "year". Empty when unknown.
  var period = ""

  var priceWithPeriod: String { period.isEmpty ? price : "\(price) / \(period)" }
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
  private var desiredUserID: String?
  private var identityGeneration = 0
  private var identityTransition: Task<Void, Error>?

  private init() {}

  func updateIdentity(_ userID: String?) async throws {
    guard AppConfig.purchasesEnabled else { return }
    identityGeneration += 1
    let generation = identityGeneration
    desiredUserID = userID
    // Invalidate before the first suspension so another screen cannot purchase
    // a package fetched for the previous Clerk account.
    packagesByID = [:]
    let previous = identityTransition
    let transition = Task { @MainActor [weak self] in
      _ = try? await previous?.value
      guard let self, self.identityGeneration == generation else { return }
      try await self.applyIdentity(userID, generation: generation)
    }
    identityTransition = transition
    try await transition.value
  }

  func packages() async throws -> [BillingPackage] {
    guard AppConfig.purchasesEnabled else { return [] }
    let (purchases, userID, generation) = try await readyPurchases()
    let available = (try await purchases.offerings().current?.availablePackages ?? []).filter {
      let productID = $0.storeProduct.productIdentifier
      return ["kouchd_plus_monthly", "kouchd_plus_yearly"].contains(productID)
    }
    try verifyIdentity(userID, generation: generation)
    packagesByID = Dictionary(uniqueKeysWithValues: available.map { ($0.identifier, $0) })
    return available.map {
      BillingPackage(
        id: $0.identifier,
        title: $0.storeProduct.localizedTitle,
        detail: $0.storeProduct.localizedDescription,
        price: $0.localizedPriceString,
        period: Self.periodText($0.storeProduct.subscriptionPeriod)
      )
    }
  }

  private static func periodText(_ period: SubscriptionPeriod?) -> String {
    guard let period else { return "" }
    let unit = switch period.unit {
    case .day: "day"
    case .week: "week"
    case .month: "month"
    case .year: "year"
    @unknown default: ""
    }
    guard !unit.isEmpty else { return "" }
    return period.value == 1 ? unit : "\(period.value) \(unit)s"
  }

  func purchase(packageID: String) async throws -> BillingPurchaseResult {
    let (purchases, userID, generation) = try await readyPurchases()
    guard let package = packagesByID[packageID] else {
      throw BillingError.packageUnavailable
    }
    try verifyIdentity(userID, generation: generation)
    let result = try await purchases.purchase(package: package)
    return result.userCancelled ? .cancelled : .purchased
  }

  func restore() async throws {
    let (purchases, userID, generation) = try await readyPurchases()
    try verifyIdentity(userID, generation: generation)
    _ = try await purchases.restorePurchases()
  }

  func managementURL() async throws -> URL? {
    let (purchases, userID, generation) = try await readyPurchases()
    let url = try await purchases.customerInfo().managementURL
    try verifyIdentity(userID, generation: generation)
    return url
  }

  private func applyIdentity(_ userID: String?, generation: Int) async throws {
    let purchases = Purchases.shared
    guard let userID else {
      if !purchases.isAnonymous { _ = try await purchases.logOut() }
      return
    }
    if purchases.appUserID == userID { return }
    if !purchases.isAnonymous {
      _ = try await purchases.logOut()
      guard identityGeneration == generation else { return }
    }
    _ = try await purchases.logIn(userID)
    try verifyIdentity(userID, generation: generation)
  }

  private func readyPurchases() async throws -> (Purchases, String, Int) {
    if let identityTransition { _ = try? await identityTransition.value }
    guard let userID = desiredUserID else { throw BillingError.identityNotReady }
    let generation = identityGeneration
    if Purchases.shared.appUserID != userID {
      let previous = identityTransition
      let transition = Task { @MainActor [weak self] in
        _ = try? await previous?.value
        guard let self,
              self.identityGeneration == generation,
              self.desiredUserID == userID else {
          throw BillingError.identityNotReady
        }
        try await self.applyIdentity(userID, generation: generation)
      }
      identityTransition = transition
      try await transition.value
    }
    try verifyIdentity(userID, generation: generation)
    return (Purchases.shared, userID, generation)
  }

  private func verifyIdentity(_ userID: String, generation: Int) throws {
    guard identityGeneration == generation,
          desiredUserID == userID,
          Purchases.shared.appUserID == userID else {
      throw BillingError.identityNotReady
    }
  }
}

enum BillingError: LocalizedError {
  case packageUnavailable
  case identityNotReady

  var errorDescription: String? {
    switch self {
    case .packageUnavailable: "That subscription option is no longer available. Refresh and try again."
    case .identityNotReady: "Your subscription account is still switching. Please wait and try again."
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

      if store.typedSubscriptionSummary?.canManageSubscription != true {
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
              Text(package.priceWithPeriod).font(.title3.bold())
              PrimaryButton(title: billing.activeOperation == package.id ? "Starting purchase…" : "Choose \(package.title)") {
                Task { await billing.purchase(package) }
              }
              .disabled(billing.activeOperation != nil)
            }
          }
          Text("Subscriptions renew automatically at the price shown until you cancel. Payment is charged to your Apple account. Cancel at least 24 hours before the period ends in your Apple account settings or with Manage subscription below.")
            .font(.footnote).foregroundStyle(Palette.muted)
          HStack(spacing: 16) {
            Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
            Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
          }
          .font(.footnote.weight(.semibold))
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
    switch store.typedSubscriptionSummary?.plan ?? "starter" {
    case "hostPlus": "Host Plus"
    case "householdPro": "Household Pro"
    default: "Starter"
    }
  }

  private var statusName: String {
    (store.typedSubscriptionSummary?.status ?? "unknown").replacingOccurrences(of: "_", with: " ").capitalized
  }

  private var periodEnd: Date? {
    let value = store.typedSubscriptionSummary?.currentPeriodEndsAt ?? 0
    return value > 0 ? Date(timeIntervalSince1970: value / 1000) : nil
  }
}
