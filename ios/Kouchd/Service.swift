import ClerkKit
import Combine
import ConvexMobile
import Foundation
import Observation
import PostHog

enum AppConfig {
  static var clerkKey: String {
    Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String ?? ""
  }
  static var convexURL: String {
    Bundle.main.object(forInfoDictionaryKey: "CONVEX_URL") as? String ?? ""
  }
  static var revenueCatPublicKey: String {
    Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_PUBLIC_SDK_KEY") as? String ?? ""
  }
  static var purchasesEnabled: Bool {
    let value = Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_PURCHASES_ENABLED") as? String
    return value == "YES" && revenueCatPublicKey.hasPrefix("appl_")
  }
  static var postHogApiKey: String {
    Bundle.main.object(forInfoDictionaryKey: "POSTHOG_API_KEY") as? String ?? ""
  }
  static var postHogHost: String {
    Bundle.main.object(forInfoDictionaryKey: "POSTHOG_HOST") as? String ?? "https://us.i.posthog.com"
  }
  static var analyticsEnabled: Bool {
    postHogApiKey.hasPrefix("phc_") && postHogHost.hasPrefix("https://")
  }
  static var posthogKey: String { postHogApiKey }
  static var posthogHost: String { postHogHost }
  static var posthogEnabled: Bool { analyticsEnabled }
  static var isConfigured: Bool {
    clerkKey.hasPrefix("pk_") && convexURL.hasPrefix("https://")
      && !convexURL.contains("missing")
  }
}

enum KouchdAnalytics {
  private static let screens: Set<String> = ["introduction", "welcome", "setup", "home"]

  static func configure() {
    guard AppConfig.analyticsEnabled else { return }
    let config = PostHogConfig(projectToken: AppConfig.postHogApiKey, host: AppConfig.postHogHost)
    config.captureApplicationLifecycleEvents = false
    config.captureScreenViews = false
    config.captureElementInteractions = false
    config.enableSwizzling = false
    config.sessionReplay = false
    PostHogSDK.shared.setup(config)
  }

  static func identify(_ userID: String?) {
    guard AppConfig.analyticsEnabled else { return }
    if let userID, !userID.isEmpty {
      PostHogSDK.shared.identify(userID)
    } else {
      PostHogSDK.shared.reset()
    }
  }

  static func screenViewed(_ screen: String) {
    guard AppConfig.analyticsEnabled, screens.contains(screen) else { return }
    PostHogSDK.shared.capture("screen_viewed", properties: ["screen": screen])
  }
}

private enum KouchdAuthError: LocalizedError {
  case clerkNotReady
  case noActiveSession
  case missingConvexToken

  var errorDescription: String? {
    switch self {
    case .clerkNotReady: "Clerk is still loading. Please try again."
    case .noActiveSession: "Your Clerk session is no longer active."
    case .missingConvexToken: "Clerk did not return the Convex access token."
    }
  }
}

/// Requests Clerk's Convex JWT template. The generic Clerk session token does
/// not carry the `aud = convex` claim required by Convex's auth configuration.
@MainActor private final class KouchdAuthProvider: AuthProvider {
  typealias T = String

  private var onIdToken: (@Sendable (String?) -> Void)?
  private var tokenRefreshTask: Task<Void, Never>?

  func login(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    try await authenticate(onIdToken: onIdToken)
  }

  func loginFromCache(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    try await authenticate(onIdToken: onIdToken)
  }

  func logout() async throws {
    tokenRefreshTask?.cancel()
    tokenRefreshTask = nil
    onIdToken?(nil)
    onIdToken = nil
    if Clerk.shared.user != nil { try await Clerk.shared.auth.signOut() }
  }

  nonisolated func extractIdToken(from authResult: String) -> String { authResult }

  private func authenticate(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    guard Clerk.shared.isLoaded else { throw KouchdAuthError.clerkNotReady }
    guard let session = Clerk.shared.session, session.status == .active else {
      throw KouchdAuthError.noActiveSession
    }
    guard let token = try await convexToken(for: session) else {
      throw KouchdAuthError.missingConvexToken
    }
    self.onIdToken = onIdToken
    startTokenRefreshListener()
    return token
  }

  private func convexToken(for session: Session) async throws -> String? {
    try await session.getToken(.init(template: "convex"))
  }

  private func startTokenRefreshListener() {
    tokenRefreshTask?.cancel()
    tokenRefreshTask = Task { [weak self] in
      guard let self else { return }
      for await event in Clerk.shared.auth.events {
        guard !Task.isCancelled else { return }
        guard case .tokenRefreshed = event else { continue }
        guard let session = Clerk.shared.session, session.status == .active else {
          onIdToken?(nil)
          continue
        }
        onIdToken?(try? await convexToken(for: session))
      }
    }
  }
}

@MainActor @Observable final class KouchdStore {
  let client: ConvexClientWithAuth<String>
  var viewer: Value = .null
  var stays: [Value] = []
  var bundle: Value = .null
  var typedAgreement: AgreementRecord?
  var ledger: [Value] = []
  var ledgerSummary: Value = .null
  private var ledgerRecord: Value = .null
  var contributions: [Value] = []
  var chores: [Value] = []
  var announcements: [Value] = []
  var activity: [Value] = []
  var schedule: [Value] = []
  var nights: [Value] = []
  var wallet: Value = .null
  var rules: [Value] = []
  var shopping: [Value] = []
  var checkins: [Value] = []
  var subscriptionSummary: Value = .null
  var typedSubscriptionSummary: AccountSubscriptionSummary?
  private var planUsageValue: Value = .null
  /// Host-only guest spots; nil for guests and while loading.
  var planUsage: PlanUsage?
  /// Set when the backend refused a stay or guest for plan limits. Screens
  /// show their own copy for it instead of the generic error alert.
  var planLimit: PlanLimitError?
  var typedLedger: [LedgerRecord] = []
  var isSubscriptionSummaryLoading = true
  var subscriptionSummaryError = ""
  var adminAccess: Value = .null
  var adminStats: Value = .null
  var adminUsers: Value = .null
  var adminStays: Value = .null
  var adminUserDetail: Value = .null
  var adminStayDetail: Value = .null
  var adminFinancials: Value = .null
  var adminSms: [Value] = []
  var selectedStayID = ""
  var selectedGuestID = ""
  var error = ""
  var connectionError = ""
  var isLoading = true
  var isStayLoading = false
  var isFinancialLoading = false
  var financialError = ""
  private var stayGeneration = 0
  private var financialGeneration = 0
  private var pendingFinancialQueries: Set<String> = []
  private var accountGeneration = 0
  private var authSubscription: AnyCancellable?
  private var connectionTimeoutTask: Task<Void, Never>?
  private var hasAttemptedConnection = false
  private var convexAuthLoading = false
  private var isSyncingUser = false
  private var accountSubscriptions: [AnyCancellable] = []
  private var staySubscriptions: [AnyCancellable] = []
  private var financialSubscriptions: [AnyCancellable] = []
  private var featureSubscriptions: [StayFeature: [AnyCancellable]] = [:]
  private var featureMembers: [StayFeature: Set<UUID>] = [:]
  private var featureGeneration = 0
  private var featureVersions: [StayFeature: Int] = [:]
  var featureLoading: Set<StayFeature> = []
  private var adminSubscriptions: [String: [AnyCancellable]] = [:]
  private var adminVersions: [String: Int] = [:]
  #if DEBUG
  /// Set only by the layout test host. A seeded store never subscribes or mutates.
  private var isSeeded = false

  init(seed: (KouchdStore) -> Void) {
    client = ConvexClientWithAuth(deploymentUrl: "https://seed.invalid", authProvider: KouchdAuthProvider())
    isSeeded = true
    isLoading = false
    isSubscriptionSummaryLoading = false
    seed(self)
  }
  #endif

  init() {
    client = ConvexClientWithAuth(
      deploymentUrl: AppConfig.convexURL,
      authProvider: KouchdAuthProvider()
    )
    authSubscription = client.authState
      .receive(on: DispatchQueue.main)
      .sink { [weak self] state in
        guard let self else { return }
        switch state {
        case .authenticated:
          self.convexAuthLoading = false
          self.connectionError = ""
          guard !self.isSyncingUser, self.accountSubscriptions.isEmpty else { return }
          Task { await self.syncUser(name: nil) }
        case .loading:
          self.hasAttemptedConnection = true
          self.convexAuthLoading = true
          self.isLoading = true
          self.connectionError = ""
          self.startConnectionTimeout()
        case .unauthenticated:
          self.convexAuthLoading = false
          self.connectionTimeoutTask?.cancel()
          if Clerk.shared.user == nil {
            self.reset()
          } else if self.hasAttemptedConnection {
            self.failConnection()
          }
        }
      }
  }

  /// Reconciles an already active Clerk session with Convex. This is also called
  /// explicitly when SwiftUI observes a signed-in user so startup does not depend
  /// on catching Clerk's session-change event at exactly the right moment.
  func connectAuthenticatedSession() async {
    guard Clerk.shared.user != nil, !convexAuthLoading else { return }
    hasAttemptedConnection = true
    isLoading = true
    connectionError = ""
    startConnectionTimeout()

    let result = await client.loginFromCache()
    if case .failure(let failure) = result, Clerk.shared.user != nil {
      connectionTimeoutTask?.cancel()
      convexAuthLoading = false
      failConnection(detail: failure.localizedDescription)
    }
  }

  func disconnectAuthenticatedSession() async {
    await client.logout()
    reset()
  }

  private func startConnectionTimeout() {
    connectionTimeoutTask?.cancel()
    connectionTimeoutTask = Task { [weak self] in
      try? await Task.sleep(for: .seconds(15))
      guard !Task.isCancelled, let self, Clerk.shared.user != nil else { return }
      self.convexAuthLoading = false
      self.failConnection()
    }
  }

  private func failConnection(detail: String = "") {
    isLoading = false
    connectionError = "Your account is signed in, but Kouchd couldn't load your stays. Check your connection and try again."
    if !detail.isEmpty { connectionError += "\n\n\(detail)" }
  }

  func loadAccount() {
    accountSubscriptions.removeAll()
    isSubscriptionSummaryLoading = true
    subscriptionSummaryError = ""
    watch("users:viewer", into: \.viewer, account: true)
    watch("stays:listMine", into: \.stays, account: true)
    watch("admin:canAccess", into: \.adminAccess, account: true)
    watch("subscriptions:currentAccountSummary", into: \.subscriptionSummary, account: true)
    watch("subscriptions:planUsage", into: \.planUsageValue, account: true)
  }

  func reset() {
    connectionTimeoutTask?.cancel()
    hasAttemptedConnection = false
    convexAuthLoading = false
    isSyncingUser = false
    accountGeneration += 1
    stayGeneration += 1
    financialGeneration += 1
    pendingFinancialQueries = []
    isStayLoading = false
    isFinancialLoading = false
    accountSubscriptions.removeAll()
    staySubscriptions.removeAll()
    financialSubscriptions.removeAll()
    featureSubscriptions.removeAll()
    featureMembers.removeAll()
    featureLoading.removeAll()
    featureGeneration += 1
    viewer = .null
    stays = []
    bundle = .null
    typedAgreement = nil
    ledger = []
    ledgerSummary = .null
    typedLedger = []
    contributions = []
    chores = []
    announcements = []
    activity = []
    schedule = []
    nights = []
    wallet = .null
    rules = []
    shopping = []
    checkins = []
    subscriptionSummary = .null
    typedSubscriptionSummary = nil
    planUsageValue = .null
    planUsage = nil
    planLimit = nil
    isSubscriptionSummaryLoading = true
    subscriptionSummaryError = ""
    clearAdmin()
    adminAccess = .null
    selectedStayID = ""
    selectedGuestID = ""
    error = ""
    connectionError = ""
    isLoading = true
  }

  private func clearAdmin() {
    for scope in ["overview", "user", "stay", "financial", "sms"] { stopAdmin(scope) }
    adminSubscriptions.removeAll()
    adminStats = .null
    adminUsers = .null
    adminStays = .null
    adminUserDetail = .null
    adminStayDetail = .null
    adminFinancials = .null
    adminSms = []
  }

  func loadAdmin() {
    guard adminAccess.flag else { return }
    stopAdmin("overview")
    watch("admin:getOverviewStats", into: \.adminStats, adminScope: "overview")
    watch("admin:listUsers", into: \.adminUsers, adminScope: "overview")
    watch("admin:listStays", into: \.adminStays, adminScope: "overview")
    watch("admin:listDisputesAndLedgers", into: \.adminFinancials, adminScope: "overview")
    watch("admin:listSmsComplianceEvents", into: \.adminSms, adminScope: "overview")
  }

  func loadAdminUser(_ id: String) {
    guard adminAccess.flag else { return }
    stopAdmin("user")
    adminUserDetail = .null
    watch("admin:getUserDetail", args: ["userId": id], into: \.adminUserDetail, adminScope: "user")
  }

  func loadAdminStay(_ id: String) {
    guard adminAccess.flag else { return }
    stopAdmin("stay")
    adminStayDetail = .null
    watch("admin:getStayDetail", args: ["stayId": id], into: \.adminStayDetail, adminScope: "stay")
  }

  func stopAdmin(_ scope: String) {
    adminVersions[scope, default: 0] += 1
    adminSubscriptions[scope] = nil
  }

  func loadAdminFinancial() {
    guard adminAccess.flag else { return }
    stopAdmin("financial")
    watch("admin:listDisputesAndLedgers", into: \.adminFinancials, adminScope: "financial")
  }

  func loadAdminSMS() {
    guard adminAccess.flag else { return }
    stopAdmin("sms")
    watch("admin:listSmsComplianceEvents", into: \.adminSms, adminScope: "sms")
  }

  func syncUser(name: String?) async {
    guard !isSyncingUser else { return }
    isSyncingUser = true
    defer { isSyncingUser = false }
    let generation = accountGeneration
    do {
      var args: [String: ConvexEncodable?] = [:]
      if let name, !name.isEmpty { args["clerkName"] = name }
      try await client.mutation("users:syncCurrent", with: args)
      guard generation == accountGeneration else { return }
      connectionError = ""
      loadAccount()
    } catch {
      guard generation == accountGeneration else { return }
      connectionTimeoutTask?.cancel()
      failConnection(detail: error.localizedDescription)
    }
  }

  func selectStay(_ id: String) {
    guard !id.isEmpty else { return }
    #if DEBUG
    if isSeeded { selectedStayID = id; return }
    #endif
    stayGeneration += 1
    financialGeneration += 1
    isStayLoading = true
    isFinancialLoading = false
    pendingFinancialQueries = []
    selectedStayID = id
    selectedGuestID = ""
    staySubscriptions.removeAll()
    financialSubscriptions.removeAll()
    featureSubscriptions.removeAll()
    featureGeneration += 1
    bundle = .null
    typedAgreement = nil
    ledger = []
    ledgerSummary = .null
    typedLedger = []
    contributions = []
    chores = []
    announcements = []
    activity = []
    schedule = []
    nights = []
    wallet = .null
    rules = []
    shopping = []
    checkins = []
    let args: [String: ConvexEncodable?] = ["stayId": id]
    watch("stays:getBundle", args: args, into: \.bundle)
    watch("chores:list", args: args, into: \.chores)
    watch("announcements:list", args: args, into: \.announcements)
    watch("activity:list", args: args, into: \.activity)

  }

  func selectGuest(_ id: String) {
    selectedGuestID = id
    #if DEBUG
    if isSeeded { return }
    #endif
    loadGuestData()
  }

  private func loadGuestData() {
    guard !selectedStayID.isEmpty else { return }
    financialGeneration += 1
    pendingFinancialQueries = ["contributions:list", "rewards:getWallet", "obligations:ledgerWithTotals"]
    isFinancialLoading = true
    financialError = ""
    financialSubscriptions.removeAll()
    contributions = []
    ledger = []
    ledgerSummary = .null
    typedLedger = []
    nights = []
    wallet = .null
    var args: [String: ConvexEncodable?] = ["stayId": selectedStayID]
    if !selectedGuestID.isEmpty { args["guestUserId"] = selectedGuestID }
    watch("contributions:list", args: args, into: \.contributions, financial: true)
    watch("rewards:getWallet", args: args, into: \.wallet, financial: true)
    args["asOfDate"] = Display.date(timezone: bundle["stay"]["timezone"].text)
    // One subscription computes the ledger once and returns its rows and totals together.
    watch("obligations:ledgerWithTotals", args: args, into: \.ledgerRecord, financial: true)
    reloadFeatures()
  }

  func retryFinancialData() { loadGuestData() }

  func beginFeature(_ feature: StayFeature, owner: UUID) {
    featureMembers[feature, default: []].insert(owner)
    if featureSubscriptions[feature] == nil { loadFeature(feature) }
  }

  func endFeature(_ feature: StayFeature, owner: UUID) {
    featureMembers[feature]?.remove(owner)
    if featureMembers[feature, default: []].isEmpty {
      featureSubscriptions.removeValue(forKey: feature)
      featureVersions[feature, default: 0] += 1
      featureLoading.remove(feature)
    }
  }

  private func reloadFeatures() {
    featureGeneration += 1
    featureSubscriptions.removeAll()
    for feature in StayFeature.allCases where !featureMembers[feature, default: []].isEmpty {
      loadFeature(feature)
    }
  }

  private func loadFeature(_ feature: StayFeature) {
    #if DEBUG
    if isSeeded { return }
    #endif
    guard !selectedStayID.isEmpty, !isStayLoading else { return }
    featureLoading.insert(feature)
    featureVersions[feature, default: 0] += 1
    var args: [String: ConvexEncodable?] = ["stayId": selectedStayID]
    switch feature {
    case .shopping:
      watch("shopping:list", args: args, into: \.shopping, feature: feature)
    case .checkins:
      watch("checkIns:list", args: args, into: \.checkins, feature: feature)
    case .schedule:
      watch("paymentSchedule:list", args: args, into: \.schedule, feature: feature)
    case .rewards:
      watch("rewards:listRules", args: args, into: \.rules, feature: feature)
    case .occupancy:
      if !selectedGuestID.isEmpty { args["guestUserId"] = selectedGuestID }
      watch("occupancy:list", args: args, into: \.nights, financial: true, feature: feature)
    }
  }

  private func watch<T: Decodable>(
    _ name: String,
    args: [String: ConvexEncodable?] = [:],
    into keyPath: ReferenceWritableKeyPath<KouchdStore, T>,
    account: Bool = false,
    financial: Bool = false,
    adminScope: String = "",
    feature: StayFeature? = nil
  ) {
    #if DEBUG
    if isSeeded { return }
    #endif
    let featureEpoch = featureGeneration
    let adminVersion = adminVersions[adminScope, default: 0]
    let featureVersion = feature.map { featureVersions[$0, default: 0] }
    let generation = accountGeneration
    let stayEpoch = stayGeneration
    let financialEpoch = financialGeneration
    let stayID = selectedStayID
    let guestID = selectedGuestID
    let token = client.subscribe(to: name, with: args, yielding: T.self)
      .receive(on: DispatchQueue.main)
      .sink(receiveCompletion: { [weak self] result in
        guard let self, generation == self.accountGeneration else { return }
        if !adminScope.isEmpty && adminVersion != self.adminVersions[adminScope, default: 0] { return }
        if let feature, featureEpoch != self.featureGeneration || featureVersion != self.featureVersions[feature, default: 0] || self.featureMembers[feature, default: []].isEmpty { return }
        if !account && adminScope.isEmpty && (stayID != self.selectedStayID || stayEpoch != self.stayGeneration) { return }
        if financial && (guestID != self.selectedGuestID || financialEpoch != self.financialGeneration) { return }
        if case .failure(let failure) = result {
          if name == "stays:listMine" {
            self.connectionTimeoutTask?.cancel()
            self.failConnection(detail: failure.localizedDescription)
          } else {
            self.error = failure.localizedDescription
          }
          if name == "stays:getBundle" { self.isStayLoading = false }
          if name == "subscriptions:currentAccountSummary" {
            self.isSubscriptionSummaryLoading = false
            self.subscriptionSummaryError = failure.localizedDescription
          }
          if financial { self.finishFinancialQuery(name) }
          if financial { self.financialError = "Kouchd couldn't load the complete shared record. Please try again." }
          if let feature { self.featureLoading.remove(feature) }
        }
      }, receiveValue: { [weak self] value in
        guard let self, generation == self.accountGeneration else { return }
        if !adminScope.isEmpty && adminVersion != self.adminVersions[adminScope, default: 0] { return }
        if let feature, featureEpoch != self.featureGeneration || featureVersion != self.featureVersions[feature, default: 0] || self.featureMembers[feature, default: []].isEmpty { return }
        if !account && adminScope.isEmpty && (stayID != self.selectedStayID || stayEpoch != self.stayGeneration) { return }
        if financial && (guestID != self.selectedGuestID || financialEpoch != self.financialGeneration) { return }
        self[keyPath: keyPath] = value
        if name == "stays:getBundle", let bundle = value as? Value {
          self.typedAgreement = bundle["terms"].decoded(AgreementRecord.self)
        }
        if name == "subscriptions:currentAccountSummary", let summary = value as? Value {
          self.typedSubscriptionSummary = summary.decoded(AccountSubscriptionSummary.self)
        }
        if name == "subscriptions:planUsage", let usage = value as? Value {
          self.planUsage = usage.decoded(PlanUsage.self)
        }
        if name == "obligations:ledgerWithTotals", let record = value as? Value {
          let rows = record["rows"].items
          self.ledger = rows
          self.ledgerSummary = record["totals"]
          if let decoded = Value.array(rows).decoded([LedgerRecord].self) {
            self.typedLedger = decoded
          } else {
            self.financialError = "Kouchd couldn't read the complete ledger. Please try again."
          }
        }
        if let feature { self.featureLoading.remove(feature) }
        if name == "subscriptions:currentAccountSummary" {
          self.isSubscriptionSummaryLoading = false
          self.subscriptionSummaryError = ""
        }
        if name == "stays:listMine" {
          self.connectionTimeoutTask?.cancel()
          self.isLoading = false
        }
        if name == "stays:getBundle" { self.isStayLoading = false }
        if financial { self.finishFinancialQuery(name) }
        if name == "admin:canAccess", !self.adminAccess.flag { self.clearAdmin() }
        if name == "stays:getBundle", self.financialSubscriptions.isEmpty {
          if self.isHost {
            self.selectedGuestID = self.guests.first?["person"]["id"].text ?? ""
          }
          self.loadGuestData()
        }
      })
    if let feature { featureSubscriptions[feature, default: []].append(token) }
    else if !adminScope.isEmpty { adminSubscriptions[adminScope, default: []].append(token) }
    else if account { accountSubscriptions.append(token) }
    else if financial { financialSubscriptions.append(token) }
    else { staySubscriptions.append(token) }
  }

  private func finishFinancialQuery(_ name: String) {
    pendingFinancialQueries.remove(name)
    isFinancialLoading = !pendingFinancialQueries.isEmpty
  }

  func mutateValue(_ name: String, _ args: [String: ConvexEncodable?]) async -> Value? {
    #if DEBUG
    if isSeeded { return .null }
    #endif
    let accountEpoch = accountGeneration
    let stayEpoch = stayGeneration
    let guestEpoch = financialGeneration
    let scoped = !name.hasPrefix("users:") && !name.hasPrefix("admin:") &&
      !["stays:create", "referral:joinWithCode", "invites:accept"].contains(name)
    planLimit = nil
    do {
      let result: Value = try await client.mutation(name, with: args)
      guard accountEpoch == accountGeneration, !scoped || (stayEpoch == stayGeneration && guestEpoch == financialGeneration) else { return nil }
      error = ""
      return result
    } catch {
      guard accountEpoch == accountGeneration, !scoped || (stayEpoch == stayGeneration && guestEpoch == financialGeneration) else { return nil }
      if let limit = Self.planLimit(from: error) {
        planLimit = limit
      } else {
        self.error = Self.message(for: error)
      }
      return nil
    }
  }

  /// Reads the stable `plan_limit` code the backend attaches to limit refusals.
  nonisolated static func planLimit(from error: Error) -> PlanLimitError? {
    guard case ClientError.ConvexError(let data) = error,
          let limit = try? JSONDecoder().decode(PlanLimitError.self, from: Data(data.utf8)),
          limit.code == "plan_limit" else { return nil }
    return limit
  }

  /// Prefers the readable message inside `ConvexError` data over its raw JSON.
  nonisolated static func message(for error: Error) -> String {
    if case ClientError.ConvexError(let data) = error {
      if let object = try? JSONSerialization.jsonObject(with: Data(data.utf8)) as? [String: Any],
         let message = object["message"] as? String { return message }
      if let text = try? JSONDecoder().decode(String.self, from: Data(data.utf8)) { return text }
    }
    return error.localizedDescription
  }

  /// Notes a refused join so the host can see it. Errors are ignored: it is not the guest's problem.
  func recordBlockedJoin(_ args: [String: ConvexEncodable?]) async {
    _ = try? await client.mutation("subscriptions:recordBlockedJoin", with: args) as Value
  }

  /// Kouchd's cross-platform trial answer plus Apple's signed JWS for it.
  /// `eligible == nil` means the backend could not answer.
  func introOfferEligibility(productID: String, appTransactionID: String?) async -> (eligible: Bool?, jws: String?) {
    var args: [String: ConvexEncodable?] = ["productId": productID]
    if let appTransactionID { args["appTransactionId"] = appTransactionID }
    guard let result: Value = try? await client.action("introOffer:signEligibility", with: args) else {
      return (nil, nil)
    }
    let jws = result["jws"].text
    switch result["eligible"] {
    case .bool(let eligible): return (eligible, jws.isEmpty ? nil : jws)
    default: return (nil, nil)
    }
  }

  func mutate(_ name: String, _ args: [String: ConvexEncodable?]) async -> Bool {
    if let _ = await mutateValue(name, args) { return true }
    return false
  }

  func joinOrCreateStay(_ name: String, _ args: [String: ConvexEncodable?]) async -> Bool {
    let stayEpoch = stayGeneration
    guard let result = await mutateValue(name, args) else {
      // A guest's refused join rolls back, so note it for the host separately.
      if planLimit?.isGuest == true, name != "stays:create" {
        var attempt: [String: ConvexEncodable?] = [:]
        if let code = args["referralCode"] { attempt["referralCode"] = code }
        if let hash = args["tokenHash"] { attempt["tokenHash"] = hash }
        await recordBlockedJoin(attempt)
      }
      return false
    }
    let id = result.text.isEmpty ? result["stayId"].text : result.text
    guard stayEpoch == stayGeneration || selectedStayID == id else { return false }
    if !id.isEmpty { selectStay(id) }
    return true
  }

  var isHost: Bool { bundle["membership"]["role"].text == "host" }
  var isEnded: Bool { bundle["stay"]["status"].text == "ended" }
  var members: [Value] { bundle["members"].items }
  var guests: [Value] { members.filter { $0["membership"]["role"].text == "guest" } }
  var stayName: String {
    let value = bundle["stay"]["name"].text
    return value.isEmpty ? "Shared stay" : value
  }
}
