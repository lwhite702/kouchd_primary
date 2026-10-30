import Foundation
import Observation
import RevenueCat
import StoreKit
import SwiftUI

struct BillingPackage: Identifiable, Equatable, Sendable {
  let id: String
  let title: String
  let detail: String
  /// The store's localized price string. Never hard-code amounts.
  let price: String
  /// Renewal period in words, such as "month" or "year". Empty when unknown.
  var period = ""
  var productID = ""
  /// Raw store price, used only to compare plans (for example annual savings).
  var priceAmount: Decimal = 0
  /// Length of the product's free-trial introductory offer, in days; nil when it has none.
  var freeTrialDays: Int?

  var priceWithPeriod: String { period.isEmpty ? price : "\(price) / \(period)" }
  var isAnnual: Bool { productID == BillingProduct.annual }
}

enum BillingProduct {
  static let monthly = "kouchd_plus_monthly"
  static let annual = "kouchd_plus_yearly"
}

enum BillingPurchaseResult: Equatable, Sendable {
  case purchased
  case cancelled
  /// Ask to Buy or another approval is pending; nothing was charged yet.
  case pending
}

@MainActor protocol BillingClient: AnyObject {
  func updateIdentity(_ userID: String?) async throws
  func packages() async throws -> [BillingPackage]
  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult
  /// Apple's own trial eligibility for this App Store account (no web history).
  func appleTrialEligible(packageID: String) async -> Bool
  /// Any transaction ID of this App Store account, for Kouchd's trial signature.
  func appTransactionID() async -> String?
  func restore() async throws
  func managementURL() async throws -> URL?
}

extension BillingClient {
  func purchase(packageID: String) async throws -> BillingPurchaseResult {
    try await purchase(packageID: packageID, introductoryOfferEligibilityJWS: nil)
  }
  func appleTrialEligible(packageID: String) async -> Bool { false }
  func appTransactionID() async -> String? { nil }
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
      return [BillingProduct.monthly, BillingProduct.annual].contains(productID)
    }
    try verifyIdentity(userID, generation: generation)
    packagesByID = Dictionary(uniqueKeysWithValues: available.map { ($0.identifier, $0) })
    return available.map {
      BillingPackage(
        id: $0.identifier,
        title: $0.storeProduct.localizedTitle,
        detail: $0.storeProduct.localizedDescription,
        price: $0.localizedPriceString,
        period: Self.periodText($0.storeProduct.subscriptionPeriod),
        productID: $0.storeProduct.productIdentifier,
        priceAmount: $0.storeProduct.price,
        freeTrialDays: Self.freeTrialDays($0.storeProduct.introductoryDiscount)
      )
    }
  }

  private static func freeTrialDays(_ discount: RevenueCat.StoreProductDiscount?) -> Int? {
    guard let discount, discount.paymentMode == .freeTrial else { return nil }
    let period = discount.subscriptionPeriod
    let perUnit = switch period.unit {
    case .day: 1
    case .week: 7
    case .month: 30
    case .year: 365
    @unknown default: 0
    }
    let days = perUnit * period.value * max(1, discount.numberOfPeriods)
    return days > 0 ? days : nil
  }

  private static func periodText(_ period: RevenueCat.SubscriptionPeriod?) -> String {
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

  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult {
    let (purchases, userID, generation) = try await readyPurchases()
    guard let package = packagesByID[packageID] else {
      throw BillingError.packageUnavailable
    }
    try verifyIdentity(userID, generation: generation)
    // Kouchd's signed answer makes Apple's sheet honor one trial per host
    // billing account across web and iPhone, not just this App Store account.
    let builder = PurchaseParams.Builder(package: package)
    if let introductoryOfferEligibilityJWS {
      _ = builder.with(introductoryOfferEligibilityJWS: introductoryOfferEligibilityJWS)
    }
    do {
      let result = try await purchases.purchase(builder.build())
      return result.userCancelled ? .cancelled : .purchased
    } catch let error as RevenueCat.ErrorCode where error == .paymentPendingError {
      return .pending
    } catch let error as NSError where error.domain == RevenueCat.ErrorCode.errorDomain
      && error.code == RevenueCat.ErrorCode.paymentPendingError.rawValue {
      return .pending
    }
  }

  func appleTrialEligible(packageID: String) async -> Bool {
    guard let package = packagesByID[packageID] else { return false }
    let status = await Purchases.shared.checkTrialOrIntroDiscountEligibility(product: package.storeProduct)
    return status == .eligible
  }

  func appTransactionID() async -> String? {
    guard let result = try? await StoreKit.AppTransaction.shared else { return nil }
    switch result {
    case .verified(let transaction): return transaction.appTransactionID
    case .unverified: return nil
    }
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

/// Kouchd's signed trial answer for a product: `eligible == nil` when Kouchd could not answer.
typealias TrialEligibilityLookup = @MainActor (_ productID: String, _ appTransactionID: String?) async -> (eligible: Bool?, jws: String?)

@MainActor @Observable final class BillingModel {
  private let client: BillingClient
  private let eligibility: TrialEligibilityLookup?
  /// True once Kouchd's backend reports Plus. A store receipt alone is not confirmation.
  private let isPlanConfirmed: (@MainActor () -> Bool)?
  private let confirmationTimeout: Duration
  var packages: [BillingPackage] = []
  /// Waiting for the backend to record a completed purchase.
  var isConfirming = false
  /// Product IDs whose free trial this host can start. Trial wording shows only for these.
  var trialProductIDs: Set<String> = []
  var selectedPackageID: String?
  /// The summary's cross-platform trial answer from the last load; nil while unknown.
  private var kouchdTrialEligible: Bool?
  var isLoading = false
  var activeOperation: String?
  var message = ""
  var error = ""

  init(client: BillingClient, eligibility: TrialEligibilityLookup? = nil,
       isPlanConfirmed: (@MainActor () -> Bool)? = nil, confirmationTimeout: Duration = .seconds(60)) {
    self.client = client
    self.eligibility = eligibility
    self.isPlanConfirmed = isPlanConfirmed
    self.confirmationTimeout = confirmationTimeout
  }

  /// Yearly first, so the plan with the better price is the default.
  var sortedPackages: [BillingPackage] {
    packages.sorted { $0.isAnnual && !$1.isAnnual }
  }

  var selectedPackage: BillingPackage? {
    packages.first { $0.id == selectedPackageID } ?? sortedPackages.first
  }

  /// Whole-percent saving of the yearly plan over twelve monthly payments; nil when there is none.
  var annualSavingsPercent: Int? {
    guard let annual = packages.first(where: \.isAnnual),
          let monthly = packages.first(where: { $0.productID == BillingProduct.monthly }),
          monthly.priceAmount > 0 else { return nil }
    let yearOfMonthly = monthly.priceAmount * 12
    var saving = (yearOfMonthly - annual.priceAmount) / yearOfMonthly * 100
    var whole = Decimal()
    // Round first: NSNumber's intValue is unreliable for long decimal mantissas.
    NSDecimalRound(&whole, &saving, 0, .down)
    let percent = NSDecimalNumber(decimal: whole).intValue
    return percent > 0 ? percent : nil
  }

  func trialDays(for package: BillingPackage) -> Int? {
    trialProductIDs.contains(package.productID) ? package.freeTrialDays : nil
  }

  func updateIdentity(_ userID: String?) async {
    do {
      try await client.updateIdentity(userID)
      packages = []
      trialProductIDs = []
    } catch {
      self.error = error.localizedDescription
    }
  }

  /// `kouchdTrialEligible` is the summary's cross-platform answer; nil while unknown.
  func load(kouchdTrialEligible: Bool? = nil) async {
    guard activeOperation == nil else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      packages = try await client.packages()
      error = ""
    } catch {
      self.error = error.localizedDescription
      return
    }
    await refreshTrialEligibility(kouchdTrialEligible: kouchdTrialEligible)
  }

  /// Shows trial wording only when Kouchd and the Apple sheet will agree. Kouchd's signed
  /// answer wins because it is passed to Apple; without it, both must say yes.
  func refreshTrialEligibility(kouchdTrialEligible: Bool?) async {
    self.kouchdTrialEligible = kouchdTrialEligible
    var eligibleIDs: Set<String> = []
    let transactionID = eligibility == nil ? nil : await client.appTransactionID()
    for package in packages where package.freeTrialDays != nil && kouchdTrialEligible != false {
      if let eligibility, let signed = await eligibility(package.productID, transactionID).eligible {
        if signed { eligibleIDs.insert(package.productID) }
      } else if kouchdTrialEligible == true, await client.appleTrialEligible(packageID: package.id) {
        eligibleIDs.insert(package.productID)
      }
    }
    trialProductIDs = eligibleIDs
  }

  func purchase(_ package: BillingPackage) async {
    guard activeOperation == nil else { return }
    activeOperation = package.id
    defer { activeOperation = nil }
    do {
      // A fresh signature for every purchase, so the Apple sheet follows Kouchd's
      // one-trial-per-host rule even when this App Store account never had a trial.
      var jws: String?
      if let eligibility, !package.productID.isEmpty {
        jws = await eligibility(package.productID, await client.appTransactionID()).jws
        if jws == nil, !(await canPurchaseWithoutSignature(package)) {
          error = "Kouchd couldn't confirm your free-trial eligibility, so nothing was charged. Try again in a moment."
          await refreshTrialEligibility(kouchdTrialEligible: kouchdTrialEligible)
          return
        }
      }
      let result = try await client.purchase(packageID: package.id, introductoryOfferEligibilityJWS: jws)
      if result == .purchased, let isPlanConfirmed {
        message = ""
        isConfirming = true
        let confirmed = await waitUntil(isPlanConfirmed)
        isConfirming = false
        message = confirmed
          ? "You're on Plus. You can now host up to \(PlanCopy.plusStays) stays and \(PlanCopy.plusGuests) guests at once."
          : "Purchase received. Kouchd is still confirming it, and your plan will update here when it does."
      } else if result == .purchased {
        message = "Purchase received. Your household plan will update after Kouchd verifies it."
      } else if result == .pending {
        message = "Your purchase is waiting for approval. Nothing has been charged yet."
      }
      error = ""
    } catch {
      self.error = error.localizedDescription
    }
  }

  /// Without Kouchd's signature, Apple decides the trial alone. That is safe only when
  /// Kouchd allows a trial and Apple's answer matches the terms the paywall showed.
  private func canPurchaseWithoutSignature(_ package: BillingPackage) async -> Bool {
    guard package.freeTrialDays != nil else { return true }
    guard kouchdTrialEligible == true else { return false }
    let shownTrial = trialProductIDs.contains(package.productID)
    return await client.appleTrialEligible(packageID: package.id) == shownTrial
  }

  /// Checks twice a second; the store's live Convex subscription updates the answer.
  private func waitUntil(_ check: @MainActor () -> Bool) async -> Bool {
    let clock = ContinuousClock()
    let deadline = clock.now + confirmationTimeout
    while clock.now < deadline {
      if check() { return true }
      try? await Task.sleep(for: .milliseconds(500))
    }
    return check()
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

/// Host-facing plan wording. Guests never see plan names, prices, or Plus.
enum PlanCopy {
  static let stayFull = "This stay is full right now. Ask your host to make room."
  static let freeStays = 1, freeGuests = 1, plusStays = 3, plusGuests = 5

  static func planName(_ summary: AccountSubscriptionSummary?) -> String {
    switch summary?.planName {
    case "plus": "Plus"
    case "pro": "Pro"
    default: summary?.hasPlus == true ? "Plus" : "Free"
    }
  }

  static func count(_ count: PlanUsage.Count) -> String {
    guard let limit = count.limit else { return "\(count.used) · no limit" }
    return "\(count.used) of \(limit)"
  }

  static func trialEnd(days: Int, from start: Date = .now) -> Date {
    Calendar.current.date(byAdding: .day, value: days, to: start) ?? start
  }
}

extension PlanLimitError: Identifiable {
  var id: String { "\(dimension)-\(plan)-\(limit)" }
}

struct SubscriptionScreen: View {
  let store: KouchdStore
  @State private var billing: BillingModel
  @State private var reminderBusy = false
  @Environment(\.openURL) private var openURL
  private let purchasesEnabled: Bool

  init(store: KouchdStore, billing: BillingModel? = nil, purchasesEnabled: Bool = AppConfig.purchasesEnabled) {
    self.store = store
    self.purchasesEnabled = purchasesEnabled
    _billing = State(initialValue: billing ?? BillingModel(
      client: RevenueCatBillingClient.shared,
      eligibility: { [weak store] productID, transactionID in
        guard let store else { return (nil, nil) }
        return await store.introOfferEligibility(productID: productID, appTransactionID: transactionID)
      },
      isPlanConfirmed: { [weak store] in store?.typedSubscriptionSummary?.hasPlus == true }
    ))
  }

  private var summary: AccountSubscriptionSummary? { store.typedSubscriptionSummary }

  var body: some View {
    Page(title: "Your plan", navigationTitle: "Subscription") {
      if summary?.canManageSubscription != true {
        EmptyCard(title: "Guests stay free", message: "Only the household host manages a Kouchd subscription. Your agreements, records, ledger, chores, and participation remain available.")
      } else {
        currentPlanCard
        // On Free, the offer comes before usage; on Plus, usage comes first.
        if !purchasesEnabled {
          EmptyCard(title: "Subscriptions are coming soon", message: "Purchase options will appear after Kouchd finishes App Store and plan verification.")
        } else if summary?.hasPlus != true {
          offerCard
        }
        if let usage = store.planUsage { PlanUsageCard(store: store, usage: usage) }
        if purchasesEnabled, summary?.hasPlus == true { manageCard }
      }

      if billing.isConfirming {
        ProgressView("Confirming your plan with Kouchd…").font(.footnote)
      }
      if !billing.message.isEmpty {
        Text(billing.message).font(.footnote).foregroundStyle(Palette.forest)
      }
      if !billing.error.isEmpty {
        Text(billing.error).font(.footnote).foregroundStyle(.red)
      }
    }
    .tint(Palette.forest)
    .task(id: summary?.introOfferEligible) {
      if purchasesEnabled, summary?.hasPlus != true {
        await billing.load(kouchdTrialEligible: summary?.introOfferEligible)
      }
    }
  }

  // MARK: Current plan

  private var currentPlanCard: some View {
    Card {
      HStack {
        Text(PlanCopy.planName(summary)).font(Palette.section).foregroundStyle(Palette.ink)
        Spacer()
        if summary?.isTrial == true { Pill(text: "Free trial") }
      }
      if summary?.hasPlus == true {
        if let periodEnd = summary?.periodEnd {
          DataRow(title: periodEndTitle, detail: periodEnd.formatted(date: .abbreviated, time: .omitted))
        }
        if summary?.isTrial == true {
          Toggle("Email me 2 days before my trial ends", isOn: Binding(
            get: { summary?.trialReminderEnabled ?? true },
            set: { enabled in
              reminderBusy = true
              Task {
                _ = await store.mutate("subscriptions:setTrialReminder", ["enabled": enabled])
                reminderBusy = false
              }
            }
          ))
          .font(.subheadline)
          .disabled(reminderBusy)
        }
      } else {
        Text("Host \(PlanCopy.freeStays) stay with \(PlanCopy.freeGuests) guest at a time.")
          .font(.subheadline).foregroundStyle(Palette.muted)
      }
      // Shown whatever the plan: a failed payment can already have moved the host to Free.
      if let status = statusNote { Text(status).font(.subheadline).foregroundStyle(Palette.muted) }
      Text("Kouchd checks your plan on its own servers. A store purchase alone never changes what your household can do.")
        .font(.footnote).foregroundStyle(Palette.muted)
    }
  }

  private var periodEndTitle: String {
    if summary?.isTrial == true { return "Trial ends" }
    return summary?.willRenew == false || summary?.status == "canceled" ? "Plus ends" : "Renews"
  }

  private var statusNote: String? {
    switch summary?.status {
    case "grace_period": "There's a problem with your payment. Update it in your store account to keep Plus."
    case "billing_retry": summary?.hasPlus == true
      ? "There's a problem with your payment. Update it in your store account to keep Plus."
      : "Plus is paused because a payment didn't go through. Update your payment in your store account to turn it back on."
    case "canceled": "Your plan won't renew. Plus stays on until the date above."
    case "refunded": "This purchase was refunded."
    default: nil
    }
  }

  // MARK: Plus offer

  @ViewBuilder private var offerCard: some View {
    Card {
      Pill(text: "Kouchd Plus")
      Text("Room for more of the people you host").font(Palette.section).foregroundStyle(Palette.ink)
      VStack(alignment: .leading, spacing: 10) {
        benefit("house", "Up to \(PlanCopy.plusStays) active stays at once")
        benefit("person.2", "Up to \(PlanCopy.plusGuests) guests across your stays")
        benefit("checkmark.seal", "Everything you use on Free stays the same")
      }

      if billing.isLoading && billing.packages.isEmpty {
        ProgressView("Loading current prices")
      } else if billing.packages.isEmpty {
        Text("No purchase options are available right now. Try again later.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Button("Refresh options") {
          Task { await billing.load(kouchdTrialEligible: summary?.introOfferEligible) }
        }.disabled(billing.activeOperation != nil)
      } else {
        VStack(spacing: 10) {
          ForEach(billing.sortedPackages) { package in
            PlanOptionRow(
              package: package,
              trialDays: billing.trialDays(for: package),
              savingsPercent: package.isAnnual ? billing.annualSavingsPercent : nil,
              selected: billing.selectedPackage?.id == package.id
            ) { billing.selectedPackageID = package.id }
          }
        }
        if let package = billing.selectedPackage {
          let trialDays = billing.trialDays(for: package)
          PrimaryButton(title: ctaTitle(package, trialDays: trialDays)) {
            Task { await billing.purchase(package) }
          }
          .disabled(billing.activeOperation != nil)
          Text(termsLine(package, trialDays: trialDays))
            .font(.footnote).foregroundStyle(Palette.muted)
        }
      }
    }

    VStack(alignment: .leading, spacing: 12) {
      Text("Subscriptions renew automatically at the price shown until you cancel. Payment is charged to your Apple account. Cancel at least 24 hours before the period ends in your Apple account settings or with Manage subscription.")
        .font(.footnote).foregroundStyle(Palette.muted)
      HStack(spacing: 16) {
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
      }
      .font(.footnote.weight(.semibold))
      HStack(spacing: 16) {
        Button("Restore purchases") { Task { await billing.restore() } }
        Button("Manage subscription") { openManagement() }
      }
      .font(.footnote.weight(.semibold))
      .disabled(billing.activeOperation != nil)
    }
  }

  private func benefit(_ symbol: String, _ text: String) -> some View {
    Label {
      Text(text).font(.subheadline).foregroundStyle(Palette.ink)
    } icon: {
      Image(systemName: symbol).foregroundStyle(Palette.forest)
        .frame(width: 28)
    }
  }

  private func ctaTitle(_ package: BillingPackage, trialDays: Int?) -> String {
    if billing.isConfirming { return "Confirming your plan…" }
    if billing.activeOperation == package.id { return "Starting purchase…" }
    if let trialDays { return "Start \(trialDays)-day free trial" }
    return "Subscribe for \(package.priceWithPeriod)"
  }

  private func termsLine(_ package: BillingPackage, trialDays: Int?) -> String {
    guard let trialDays else {
      return "Billed \(package.priceWithPeriod) and renews automatically. Cancel anytime."
    }
    let end = PlanCopy.trialEnd(days: trialDays).formatted(date: .abbreviated, time: .omitted)
    return "Free until \(end), then \(package.priceWithPeriod), renewing automatically. Cancel before then and you won't be charged."
  }

  // MARK: Manage

  private var manageCard: some View {
    Card {
      Text("Manage Plus").font(.headline)
      if summary?.store == "web" {
        Text("You started Plus on the Kouchd website, so change or cancel it there.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Link("Open kouchd.com", destination: URL(string: "https://kouchd.com")!)
          .font(.subheadline.weight(.semibold))
      } else {
        Text("Change plans or cancel in your Apple account.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Button("Manage subscription") { openManagement() }
          .font(.subheadline.weight(.semibold))
        Button("Restore purchases") { Task { await billing.restore() } }
          .font(.subheadline.weight(.semibold))
      }
    }
    .disabled(billing.activeOperation != nil)
  }

  private func openManagement() {
    Task {
      if let url = await billing.managementURL() {
        openURL(url)
      } else if let fallback = URL(string: "https://apps.apple.com/account/subscriptions") {
        openURL(fallback)
      }
    }
  }
}

private struct PlanOptionRow: View {
  let package: BillingPackage
  let trialDays: Int?
  let savingsPercent: Int?
  let selected: Bool
  let select: () -> Void

  var body: some View {
    Button(action: select) {
      HStack(alignment: .center, spacing: 14) {
        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
          .font(.title3)
          .foregroundStyle(selected ? Palette.forest : Palette.muted)
        VStack(alignment: .leading, spacing: 4) {
          HStack(spacing: 8) {
            Text(package.isAnnual ? "Yearly" : "Monthly").font(.headline).foregroundStyle(Palette.ink)
            if let savingsPercent { Pill(text: "Save \(savingsPercent)%") }
          }
          Text(package.priceWithPeriod).font(.subheadline).foregroundStyle(Palette.ink)
          if let trialDays {
            Text("\(trialDays)-day free trial").font(.footnote).foregroundStyle(Palette.muted)
          }
        }
        Spacer(minLength: 0)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Palette.cream, in: RoundedRectangle(cornerRadius: 18))
      .overlay(
        RoundedRectangle(cornerRadius: 18)
          .strokeBorder(selected ? Palette.forest : Palette.line, lineWidth: selected ? 2 : 1)
      )
      .contentShape(RoundedRectangle(cornerRadius: 18))
    }
    .buttonStyle(.plain)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }
}

/// Host-only: who holds each guest spot, and who could not join while spots were full.
struct PlanUsageCard: View {
  let store: KouchdStore
  let usage: PlanUsage

  var body: some View {
    Card {
      Text("What you're using").font(.headline)
      DataRow(title: "Active stays", detail: PlanCopy.count(usage.stays))
      DataRow(title: "Guests across your stays", detail: PlanCopy.count(usage.guests))
      if !usage.guestSpots.isEmpty {
        Divider()
        ForEach(usage.guestSpots) { spot in
          VStack(alignment: .leading, spacing: 2) {
            Text(spot.guestName).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
            Text(spot.pendingAgreement ? "\(spot.stayName) · agreement pending" : spot.stayName)
              .font(.footnote).foregroundStyle(Palette.muted)
          }
          .accessibilityElement(children: .combine)
        }
      }
      Text("A guest with a pending agreement holds a spot. Ended stays and removed guests don't count.")
        .font(.footnote).foregroundStyle(Palette.muted)
      ForEach(usage.blockedJoins) { blocked in
        VStack(alignment: .leading, spacing: 8) {
          Text("\(blocked.guestName) tried to join \(blocked.stayName) on \(Date(timeIntervalSince1970: blocked.attemptedAt / 1000).formatted(date: .abbreviated, time: .omitted)), but every guest spot was taken.")
            .font(.subheadline).foregroundStyle(Palette.ink)
          Button("Dismiss") {
            Task { _ = await store.mutate("subscriptions:dismissBlockedJoin", ["blockedJoinId": blocked.id]) }
          }
          .font(.footnote.weight(.semibold))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.lime.opacity(0.22), in: RoundedRectangle(cornerRadius: 16))
      }
    }
  }
}

/// Shows plan-limit refusals: a calm "stay is full" note for a joining guest, and
/// for a host the reason plus a way to Plus when there is a higher plan.
struct PlanLimitPresentation: ViewModifier {
  let store: KouchdStore
  var purchasesEnabled = AppConfig.purchasesEnabled

  func body(content: Content) -> some View {
    content
      .alert("This stay is full", isPresented: Binding(
        get: { store.planLimit?.isGuest == true },
        set: { if !$0 { store.planLimit = nil } }
      )) {
        Button("OK") { store.planLimit = nil }
      } message: { Text(PlanCopy.stayFull) }
      .sheet(item: Binding(
        get: { store.planLimit?.isGuest == false ? store.planLimit : nil },
        set: { if $0 == nil { store.planLimit = nil } }
      )) { limit in
        PlanLimitSheet(store: store, limit: limit, purchasesEnabled: purchasesEnabled)
      }
  }
}

extension View {
  func planLimitPresentation(store: KouchdStore, purchasesEnabled: Bool = AppConfig.purchasesEnabled) -> some View {
    modifier(PlanLimitPresentation(store: store, purchasesEnabled: purchasesEnabled))
  }
}

struct PlanLimitSheet: View {
  let store: KouchdStore
  let limit: PlanLimitError
  var purchasesEnabled = AppConfig.purchasesEnabled
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      Page(title: limit.atHighestPlan ? "You're using every stay on Plus" : "Your Free plan is full", navigationTitle: "") {
        Card {
          Image(systemName: "house.lodge").font(.title2).foregroundStyle(Palette.forest)
          Text(limit.message).font(.body).foregroundStyle(Palette.ink)
          if !limit.atHighestPlan && purchasesEnabled {
            NavigationLink(value: KouchdRoute.subscription) {
              Text("See Kouchd Plus").font(.headline).foregroundStyle(.white)
                .frame(maxWidth: .infinity).padding(.vertical, 15)
            }
            .kouchdPrimaryButtonStyle()
          }
        }
      }
      .navigationDestination(for: KouchdRoute.self) { route in
        if route == .subscription { SubscriptionScreen(store: store, purchasesEnabled: purchasesEnabled) }
      }
      .tint(Palette.forest)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Not now") { dismiss() }
        }
      }
    }
    .presentationDetents([.medium, .large])
  }
}

#if DEBUG
/// Shows the plan screens with synthetic data and a fake store, without Clerk,
/// Convex data, or RevenueCat. Launch with `--ui-test-plan=<scenario>`; absent from Release.
struct PlanScreensTestHost: View {
  static var scenario: String? {
    ProcessInfo.processInfo.arguments.first { $0.hasPrefix("--ui-test-plan=") }?
      .replacingOccurrences(of: "--ui-test-plan=", with: "")
  }
  let scenario: String
  @State private var store = KouchdStore()
  @State private var ready = false
  private var arguments: [String] { ProcessInfo.processInfo.arguments }

  var body: some View {
    NavigationStack {
      if ready {
        switch scenario {
        case "limit-host", "limit-host-plus", "limit-guest":
          Page(title: "Create stay") { Text("Add the stay name, dates and the people joining.").foregroundStyle(Palette.muted) }
        default:
          SubscriptionScreen(store: store, billing: BillingModel(client: FakeBillingClient()) { productID, _ in
            (scenario != "free-used-trial", "fake-jws-\(productID)")
          }, purchasesEnabled: true)
        }
      }
    }
    .planLimitPresentation(store: store, purchasesEnabled: true)
    .task {
      // The signed-out store resets once Convex reports its auth state; seed after that.
      try? await Task.sleep(for: .milliseconds(600))
      seed()
      ready = true
    }
    .preferredColorScheme(arguments.contains("--ui-test-dark") ? .dark : .light)
    .dynamicTypeSize(arguments.contains("--ui-test-accessibility-text") ? .accessibility3 : .large)
  }

  private func seed() {
    let day = 86_400_000.0
    let now = Date().timeIntervalSince1970 * 1000
    let plus = scenario.hasPrefix("plus") || scenario == "web-plus" || scenario == "limit-host-plus"
    var summary = AccountSubscriptionSummary(canManageSubscription: true, plan: plus ? "hostPlus" : "starter",
                                             status: plus ? "active" : "starter",
                                             currentPeriodEndsAt: plus ? now + 9 * day : nil)
    summary.planName = plus ? "plus" : "free"
    summary.isTrial = scenario == "plus-trial"
    summary.willRenew = true
    summary.store = scenario == "web-plus" ? "web" : "app_store"
    summary.trialReminderEnabled = true
    summary.introOfferEligible = scenario != "free-used-trial"
    store.typedSubscriptionSummary = summary
    store.planUsage = PlanUsage(
      plan: plus ? "plus" : "free", planConfigured: true,
      stays: .init(used: plus ? 2 : 1, limit: plus ? 3 : 1),
      guests: .init(used: plus ? 3 : 1, limit: plus ? 5 : 1),
      guestSpots: plus
        ? [.init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g1", guestName: "Jordan", pendingAgreement: false),
           .init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g2", guestName: "Riley", pendingAgreement: true),
           .init(stayId: "s2", stayName: "Garden flat", guestUserId: "g3", guestName: "Sam", pendingAgreement: false)]
        : [.init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g1", guestName: "Jordan", pendingAgreement: false)],
      blockedJoins: plus ? [] : [.init(id: "b1", stayId: "s1", stayName: "Maple Street room", guestName: "Avery", attemptedAt: now - 2 * day)]
    )
    switch scenario {
    case "limit-host":
      store.planLimit = PlanLimitError(code: "plan_limit", dimension: "stay", plan: "free", limit: 1, atHighestPlan: false,
                                       message: "Free includes 1 active stay. End your current stay or move to Plus to host up to 3 at once.")
    case "limit-host-plus":
      store.planLimit = PlanLimitError(code: "plan_limit", dimension: "stay", plan: "plus", limit: 3, atHighestPlan: true,
                                       message: "Plus covers up to 3 active stays. End a stay to start a new one.")
    case "limit-guest":
      store.planLimit = PlanLimitError(code: "plan_limit", dimension: "guest", plan: "free", limit: 1, atHighestPlan: false,
                                       message: "Host-facing text the guest must not see.")
    default: break
    }
  }
}

@MainActor private final class FakeBillingClient: BillingClient {
  func updateIdentity(_ userID: String?) async throws {}
  func packages() async throws -> [BillingPackage] {
    [
      BillingPackage(id: "$rc_monthly", title: "Kouchd Plus Monthly", detail: "", price: "$4.99", period: "month",
                     productID: BillingProduct.monthly, priceAmount: 4.99, freeTrialDays: 14),
      BillingPackage(id: "$rc_annual", title: "Kouchd Plus Yearly", detail: "", price: "$39.99", period: "year",
                     productID: BillingProduct.annual, priceAmount: 39.99, freeTrialDays: 14),
    ]
  }
  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult { .pending }
  func appleTrialEligible(packageID: String) async -> Bool { true }
  func appTransactionID() async -> String? { "2000000123456789" }
  func restore() async throws {}
  func managementURL() async throws -> URL? { nil }
}
#endif
