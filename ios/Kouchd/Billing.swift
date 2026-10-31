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

  var priceWithPeriod: String { period.isEmpty ? price : "\(price)/\(period)" }
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
  /// Quietly re-sends this device's App Store purchases to RevenueCat, which notifies Kouchd.
  func syncPurchases() async throws
  func restore() async throws
  func managementURL() async throws -> URL?
}

extension BillingClient {
  func purchase(packageID: String) async throws -> BillingPurchaseResult {
    try await purchase(packageID: packageID, introductoryOfferEligibilityJWS: nil)
  }
  func appleTrialEligible(packageID: String) async -> Bool { false }
  func appTransactionID() async -> String? { nil }
  func syncPurchases() async throws {}
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

  func syncPurchases() async throws {
    let (purchases, userID, generation) = try await readyPurchases()
    try verifyIdentity(userID, generation: generation)
    _ = try await purchases.syncPurchases()
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

/// How a finished Apple sheet ended up. The Plus sheet moves on from this.
enum BillingOutcome: Equatable {
  /// The backend recorded Plus: "Plus is on" can open.
  case confirmed
  /// Still unconfirmed after the wait: close the sheet and keep trying in the background.
  case settingUp
  /// Ask to Buy or similar; nothing was charged yet.
  case awaitingApproval
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
  var outcome: BillingOutcome?
  /// False until the first load finishes, so an empty list isn't mistaken for "can't load".
  var hasLoaded = false
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
       isPlanConfirmed: (@MainActor () -> Bool)? = nil, confirmationTimeout: Duration = .seconds(10)) {
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
    NSDecimalRound(&whole, &saving, 0, .plain)
    let percent = NSDecimalNumber(decimal: whole).intValue
    return percent > 0 ? percent : nil
  }

  func trialDays(for package: BillingPackage) -> Int? {
    trialProductIDs.contains(package.productID) ? package.freeTrialDays : nil
  }

  static func live(store: KouchdStore) -> BillingModel {
    BillingModel(
      client: RevenueCatBillingClient.shared,
      eligibility: { [weak store] productID, transactionID in
        guard let store else { return (nil, nil) }
        return await store.introOfferEligibility(productID: productID, appTransactionID: transactionID)
      },
      isPlanConfirmed: { [weak store] in store?.typedSubscriptionSummary?.hasPlus == true }
    )
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
    defer {
      isLoading = false
      hasLoaded = true
    }
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
    // The free trial belongs to Annual only.
    for package in packages where package.isAnnual && package.freeTrialDays != nil && kouchdTrialEligible != false {
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
        outcome = confirmed ? .confirmed : .settingUp
        message = confirmed ? "" : PlanCopy.settingUp
      } else if result == .purchased {
        message = "Purchase received. Your household plan will update after Kouchd verifies it."
      } else if result == .pending {
        outcome = .awaitingApproval
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

  static let settingUp = "Plus is being set up. We'll unlock it here as soon as it's confirmed."
  static let notConfirmed = "Payment went through, but we couldn't confirm Plus yet."

  /// The host's total across stays, never a per-stay number.
  static func guestSpotsLine(_ guests: PlanUsage.Count) -> String {
    guard let limit = guests.limit else {
      return "\(guests.used) \(guests.used == 1 ? "guest" : "guests") across your stays"
    }
    return "\(guests.used) of \(limit) guest spots used across your stays"
  }

  /// What the invite screen says before sharing; nil when the plan has no limit.
  static func inviteSpotsLine(_ usage: PlanUsage, guestsInThisStay: Int) -> String? {
    guard let limit = usage.guests.limit, let left = usage.guests.left else { return nil }
    if left > 0 { return "\(left) guest \(left == 1 ? "spot" : "spots") left on \(usage.planLabel)" }
    guard usage.isPlus else {
      return "Your \(limit) guest \(limit == 1 ? "spot is" : "spots are") in use. You can still share this invite, but no one else can join until there's room."
    }
    return guestsInThisStay == 0
      ? "All \(limit) guest spots are in use in your other stays. Remove a guest there to invite someone here."
      : plusGuestCap(limit)
  }

  static func plusGuestCap(_ limit: Int) -> String {
    "Plus covers up to \(limit) guests across your stays. Remove a guest from any stay to make room."
  }

  /// Said on the plan screen before Plus ends: nothing is removed, adding just stops.
  static func downgradeNote(_ usage: PlanUsage) -> String? {
    var parts: [String] = []
    if usage.stays.used > freeStays {
      parts.append("When Plus ends, your \(usage.stays.used) stays stay open. You won't be able to add new ones until you're down to \(freeStays).")
    }
    if usage.guests.used > freeGuests {
      parts.append("\(parts.isEmpty ? "When Plus ends, your" : "Your") \(usage.guests.used) guests stay too. No one new can join until you're down to \(freeGuests).")
    }
    return parts.isEmpty ? nil : parts.joined(separator: " ")
  }

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

/// P5: Settings → Plan. Upgrading happens in the Plus sheet; managing happens here.
struct SubscriptionScreen: View {
  let store: KouchdStore
  @State private var billing: BillingModel
  @State private var showingAppleManage = false
  private let purchasesEnabled: Bool

  init(store: KouchdStore, billing: BillingModel? = nil, purchasesEnabled: Bool = AppConfig.purchasesEnabled) {
    self.store = store
    self.purchasesEnabled = purchasesEnabled
    _billing = State(initialValue: billing ?? BillingModel.live(store: store))
  }

  private var summary: AccountSubscriptionSummary? { store.typedSubscriptionSummary }
  private var boughtOnWeb: Bool { summary?.store == "web" }

  var body: some View {
    Page(title: "Your plan", navigationTitle: "Plan") {
      if summary?.canManageSubscription != true {
        EmptyCard(title: "Guests stay free", message: "Only the household host manages a Kouchd plan. Your agreements, records, ledger, chores, and participation remain available.")
      } else {
        currentPlanCard
        if !purchasesEnabled {
          EmptyCard(title: "Plus is coming soon", message: "Purchase options will appear after Kouchd finishes App Store and plan verification.")
        } else if summary?.hasPlus != true {
          PrimaryButton(title: "See Kouchd Plus") { store.plusEntry = .settings }
        }
        if let usage = store.planUsage { PlanUsageCard(store: store, usage: usage) }
        if summary?.hasPlus == true, let usage = store.planUsage, let note = PlanCopy.downgradeNote(usage) {
          Text(note).font(.footnote).foregroundStyle(Palette.muted)
        }
        if purchasesEnabled { manageCard }
      }

      if !billing.message.isEmpty {
        Text(billing.message).font(.footnote).foregroundStyle(Palette.forest)
      }
      if !billing.error.isEmpty {
        Text(billing.error).font(.footnote).foregroundStyle(.red)
      }
    }
    .tint(Palette.forest)
    .manageSubscriptionsSheet(isPresented: $showingAppleManage)
    // A trial's "then" price comes from the store, so only App Store trials need it.
    .task(id: summary?.isTrial) {
      if purchasesEnabled, summary?.isTrial == true, !boughtOnWeb {
        await billing.load(kouchdTrialEligible: false)
      }
    }
  }

  private var currentPlanCard: some View {
    Card {
      HStack {
        Text(PlanCopy.planName(summary)).font(Palette.section).foregroundStyle(Palette.ink)
        Spacer()
        if summary?.isTrial == true { Pill(text: "Free trial") }
      }
      if summary?.isTrial == true, let line = trialLine {
        Text(line).font(.subheadline).foregroundStyle(Palette.ink)
      }
      if summary?.hasPlus == true {
        if summary?.isTrial != true, let periodEnd = summary?.periodEnd {
          DataRow(title: periodEndTitle, detail: periodEnd.formatted(date: .abbreviated, time: .omitted))
        }
        if let bought = boughtOn { DataRow(title: "Bought", detail: bought) }
        if summary?.isTrial == true { TrialReminderToggle(store: store) }
      } else {
        Text("Host \(PlanCopy.freeStays) stay with \(PlanCopy.freeGuests) guest at a time.")
          .font(.subheadline).foregroundStyle(Palette.muted)
      }
      // Shown whatever the plan: a failed payment can already have moved the host to Free.
      if let status = statusNote { Text(status).font(.subheadline).foregroundStyle(Palette.muted) }
    }
  }

  /// "Free trial · ends <date> · then <store price>". The price is left out when the store
  /// hasn't given one or the trial won't renew: never a hard-coded amount.
  private var trialLine: String? {
    guard let end = summary?.periodEnd?.formatted(date: .abbreviated, time: .omitted) else { return nil }
    var line = "Free trial · ends \(end)"
    if summary?.willRenew != false,
       let package = billing.packages.first(where: { $0.productID == summary?.productId }) {
      line += " · then \(package.priceWithPeriod)"
    }
    return line
  }

  private var boughtOn: String? {
    switch summary?.store {
    case "app_store": "On iPhone"
    case "web": "On kouchd.com"
    case "other": "Another store"
    default: nil
    }
  }

  private var periodEndTitle: String {
    summary?.willRenew == false || summary?.status == "canceled" ? "Plus ends" : "Renews"
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

  private var manageCard: some View {
    Card {
      Text("Manage").font(.headline)
      if summary?.hasPlus == true {
        if boughtOnWeb {
          Text("You started Plus on the Kouchd website, so change or cancel it there.")
            .font(.subheadline).foregroundStyle(Palette.muted)
          Link("Manage on kouchd.com", destination: URL(string: "https://app.kouchd.com")!)
            .font(.subheadline.weight(.semibold))
        } else {
          Text("Change plans or cancel in your Apple account.")
            .font(.subheadline).foregroundStyle(Palette.muted)
          Button("Manage subscription") { showingAppleManage = true }
            .font(.subheadline.weight(.semibold))
        }
      }
      Button("Restore purchases") { Task { await billing.restore() } }
        .font(.subheadline.weight(.semibold))
      HStack(spacing: 16) {
        Link("Terms", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy", destination: URL(string: "https://kouchd.com/privacy")!)
      }
      .font(.footnote.weight(.semibold))
    }
    .disabled(billing.activeOperation != nil)
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
      Text(PlanCopy.guestSpotsLine(usage.guests)).font(.subheadline).foregroundStyle(Palette.ink)
      if !usage.guestSpots.isEmpty {
        Divider()
        GuestSpotsList(spots: usage.guestSpots)
      }
      Text("A guest with a pending agreement holds a spot. Ended stays and removed guests don't count.")
        .font(.footnote).foregroundStyle(Palette.muted)
      ForEach(usage.blockedJoins) { blocked in
        BlockedJoinCard(store: store, usage: usage, blocked: blocked)
      }
    }
  }
}

/// Shows plan limits: a calm "stay is full" note for a joining guest, the Plus sheet for a
/// host with somewhere to go, and a plain message at the Plus cap, where there's nothing to sell.
struct PlanLimitPresentation: ViewModifier {
  let store: KouchdStore
  var purchasesEnabled = AppConfig.purchasesEnabled
  var makeBilling: (@MainActor () -> BillingModel)?

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
        PlanLimitSheet(limit: limit)
      }
      .sheet(item: Binding(
        get: { store.plusEntry },
        set: { store.plusEntry = $0 }
      )) { entry in
        PlusSheet(store: store, entry: entry, billing: makeBilling?())
      }
      // Moved out of planLimit so a later mutation in the sheet can't close it.
      .onChange(of: store.planLimit, initial: true) { _, limit in
        guard let limit, !limit.isGuest, !limit.atHighestPlan, purchasesEnabled else { return }
        store.planLimit = nil
        store.plusEntry = .stayLimit
      }
  }
}

extension View {
  func planLimitPresentation(store: KouchdStore, purchasesEnabled: Bool = AppConfig.purchasesEnabled,
                             makeBilling: (@MainActor () -> BillingModel)? = nil) -> some View {
    modifier(PlanLimitPresentation(store: store, purchasesEnabled: purchasesEnabled, makeBilling: makeBilling))
  }
}

/// A plain answer with no upsell: at the Plus cap, or where purchases aren't available yet.
struct PlanLimitSheet: View {
  let limit: PlanLimitError
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      Page(title: limit.atHighestPlan ? "Every stay on Plus is in use" : "Your Free plan is full", navigationTitle: "") {
        Card {
          Image(systemName: "house.lodge").font(.title2).foregroundStyle(Palette.forest)
          Text(limit.message).font(.body).foregroundStyle(Palette.ink)
        }
      }
      .tint(Palette.forest)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("OK") { dismiss() }
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

  private func fakeBilling() -> BillingModel {
    BillingModel(client: FakeBillingClient()) { productID, _ in
      (scenario != "sheet-used-trial" && productID == BillingProduct.annual, "fake-jws-\(productID)")
    }
  }

  var body: some View {
    NavigationStack {
      if ready {
        switch scenario {
        case "invite":
          InviteForm(store: store, purchasesEnabled: true)
        case "spots", "spots-plus-cap":
          Page(title: "Your stay") {
            Card {
              Text("The people").font(.headline)
              if let usage = store.planUsage { GuestSpotsRow(usage: usage) }
            }
            if let usage = store.planUsage {
              ForEach(usage.blockedJoins) { BlockedJoinCard(store: store, usage: usage, blocked: $0, purchasesEnabled: true) }
            }
          }
        case _ where scenario.hasPrefix("limit") || scenario.hasPrefix("sheet") || scenario == "welcome-trial":
          Page(title: "Create stay") { Text("Behind the plan sheet.").foregroundStyle(Palette.muted) }
        case "setup-pending", "setup-stuck", "setup-confirmed":
          Page(title: "Your stay") { Text("Behind the banner.").foregroundStyle(Palette.muted) }
        default:
          SubscriptionScreen(store: store, billing: fakeBilling(), purchasesEnabled: true)
        }
      }
    }
    .planLimitPresentation(store: store, purchasesEnabled: true, makeBilling: fakeBilling)
    .plusSetupBanner(store.plusSetup)
    .task {
      // The signed-out store resets once Convex reports its auth state; seed after that.
      try? await Task.sleep(for: .milliseconds(600))
      seed()
      ready = true
      if scenario == "welcome-trial" {
        // Plus arriving from the backend while the sheet is open is what opens "Plus is on".
        try? await Task.sleep(for: .seconds(1))
        var summary = AccountSubscriptionSummary(canManageSubscription: true, plan: "hostPlus", status: "active",
                                                 currentPeriodEndsAt: Date().timeIntervalSince1970 * 1000 + 7 * 86_400_000)
        summary.planName = "plus"
        summary.isTrial = true
        summary.trialReminderEnabled = true
        store.typedSubscriptionSummary = summary
      }
    }
    .preferredColorScheme(arguments.contains("--ui-test-dark") ? .dark : .light)
    .dynamicTypeSize(arguments.contains("--ui-test-accessibility-text") ? .accessibility3 : .large)
  }

  private func seed() {
    let day = 86_400_000.0
    let now = Date().timeIntervalSince1970 * 1000
    let plus = scenario.hasPrefix("plus") || scenario == "web-plus" || scenario == "limit-host-plus" || scenario == "spots-plus-cap"
    var summary = AccountSubscriptionSummary(canManageSubscription: true, plan: plus ? "hostPlus" : "starter",
                                             status: plus ? "active" : "starter",
                                             currentPeriodEndsAt: plus ? now + 6 * day : nil)
    summary.planName = plus ? "plus" : "free"
    summary.isTrial = scenario == "plus-trial"
    summary.productId = BillingProduct.annual
    summary.willRenew = true
    summary.store = scenario == "web-plus" ? "web" : "app_store"
    summary.trialReminderEnabled = true
    summary.introOfferEligible = scenario != "sheet-used-trial"
    store.typedSubscriptionSummary = summary
    store.selectedStayID = "s1"
    let cap = scenario == "spots-plus-cap"
    store.planUsage = PlanUsage(
      plan: plus ? "plus" : "free", planConfigured: true,
      stays: .init(used: plus ? 2 : 1, limit: plus ? 3 : 1),
      guests: .init(used: cap ? 5 : plus ? 3 : 1, limit: plus ? 5 : 1),
      guestSpots: plus
        ? [.init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g1", guestName: "Jordan", pendingAgreement: false),
           .init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g2", guestName: "Riley", pendingAgreement: true),
           .init(stayId: "s2", stayName: "Garden flat", guestUserId: "g3", guestName: "Sam", pendingAgreement: false)]
        : [.init(stayId: "s1", stayName: "Maple Street room", guestUserId: "g1", guestName: "Jordan", pendingAgreement: true)],
      blockedJoins: plus && !cap ? [] : [.init(id: "b1", stayId: "s1", stayName: "Maple Street room", guestName: "Avery", attemptedAt: now - 2 * day)]
    )
    switch scenario {
    case "limit-host":
      store.planLimit = store.planUsage.flatMap(PlanLimitError.stayLimit)
    case "limit-host-plus":
      store.planLimit = PlanLimitError(code: "plan_limit", dimension: "stay", plan: "plus", limit: 3, atHighestPlan: true,
                                       message: "Plus covers up to 3 active stays. End a stay to start a new one.")
    case "limit-guest":
      store.planLimit = PlanLimitError(code: "plan_limit", dimension: "guest", plan: "free", limit: 1, atHighestPlan: false,
                                       message: "Host-facing text the guest must not see.")
    case "sheet-settings", "sheet-used-trial": store.plusEntry = .settings
    case "sheet-guest": store.plusEntry = .guestLimit
    case "sheet-stay", "welcome-trial": store.plusEntry = .stayLimit
    case "setup-pending": store.plusSetup.showForTesting(.settingUp)
    case "setup-stuck": store.plusSetup.showForTesting(.stuck)
    case "setup-confirmed": store.plusSetup.showForTesting(.confirmed)
    default: break
    }
  }
}

@MainActor private final class FakeBillingClient: BillingClient {
  func updateIdentity(_ userID: String?) async throws {}
  func packages() async throws -> [BillingPackage] {
    [
      BillingPackage(id: "$rc_monthly", title: "Kouchd Plus Monthly", detail: "", price: "$6.99", period: "month",
                     productID: BillingProduct.monthly, priceAmount: 6.99),
      BillingPackage(id: "$rc_annual", title: "Kouchd Plus Yearly", detail: "", price: "$69.99", period: "year",
                     productID: BillingProduct.annual, priceAmount: 69.99, freeTrialDays: 7),
    ]
  }
  func purchase(packageID: String, introductoryOfferEligibilityJWS: String?) async throws -> BillingPurchaseResult { .pending }
  func appleTrialEligible(packageID: String) async -> Bool { true }
  func appTransactionID() async -> String? { "2000000123456789" }
  func restore() async throws {}
  func managementURL() async throws -> URL? { nil }
}
#endif
