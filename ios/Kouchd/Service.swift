import ClerkKit
import Combine
import ConvexMobile
import Foundation
import Observation

enum AppConfig {
  static var clerkKey: String {
    Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String ?? ""
  }
  static var convexURL: String {
    Bundle.main.object(forInfoDictionaryKey: "CONVEX_URL") as? String ?? ""
  }
  static var isConfigured: Bool {
    clerkKey.hasPrefix("pk_") && convexURL.hasPrefix("https://")
      && !convexURL.contains("missing")
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
  var ledger: [Value] = []
  var contributions: [Value] = []
  var chores: [Value] = []
  var announcements: [Value] = []
  var activity: [Value] = []
  var schedule: [Value] = []
  var nights: [Value] = []
  var wallet: Value = .null
  var rules: [Value] = []
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
  private var adminSubscriptions: [String: [AnyCancellable]] = [:]

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
    watch("users:viewer", into: \.viewer, account: true)
    watch("stays:listMine", into: \.stays, account: true)
    watch("admin:canAccess", into: \.adminAccess, account: true)
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
    viewer = .null
    stays = []
    bundle = .null
    ledger = []
    contributions = []
    chores = []
    announcements = []
    activity = []
    schedule = []
    nights = []
    wallet = .null
    rules = []
    clearAdmin()
    adminAccess = .null
    selectedStayID = ""
    selectedGuestID = ""
    error = ""
    connectionError = ""
    isLoading = true
  }

  private func clearAdmin() {
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
    adminSubscriptions["overview"] = []
    watch("admin:getOverviewStats", into: \.adminStats, adminScope: "overview")
    watch("admin:listUsers", into: \.adminUsers, adminScope: "overview")
    watch("admin:listStays", into: \.adminStays, adminScope: "overview")
    watch("admin:listDisputesAndLedgers", into: \.adminFinancials, adminScope: "overview")
    watch("admin:listSmsComplianceEvents", into: \.adminSms, adminScope: "overview")
  }

  func loadAdminUser(_ id: String) {
    guard adminAccess.flag else { return }
    adminSubscriptions["user"] = []
    adminUserDetail = .null
    watch("admin:getUserDetail", args: ["userId": id], into: \.adminUserDetail, adminScope: "user")
  }

  func loadAdminStay(_ id: String) {
    guard adminAccess.flag else { return }
    adminSubscriptions["stay"] = []
    adminStayDetail = .null
    watch("admin:getStayDetail", args: ["stayId": id], into: \.adminStayDetail, adminScope: "stay")
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
    stayGeneration += 1
    financialGeneration += 1
    isStayLoading = true
    isFinancialLoading = false
    pendingFinancialQueries = []
    selectedStayID = id
    selectedGuestID = ""
    staySubscriptions.removeAll()
    financialSubscriptions.removeAll()
    bundle = .null
    ledger = []
    contributions = []
    chores = []
    announcements = []
    activity = []
    schedule = []
    nights = []
    wallet = .null
    rules = []
    let args: [String: ConvexEncodable?] = ["stayId": id]
    watch("stays:getBundle", args: args, into: \.bundle)
    watch("chores:list", args: args, into: \.chores)
    watch("announcements:list", args: args, into: \.announcements)
    watch("activity:list", args: args, into: \.activity)
    watch("paymentSchedule:list", args: args, into: \.schedule)
    watch("rewards:listRules", args: args, into: \.rules)
  }

  func selectGuest(_ id: String) {
    selectedGuestID = id
    loadGuestData()
  }

  private func loadGuestData() {
    guard !selectedStayID.isEmpty else { return }
    financialGeneration += 1
    pendingFinancialQueries = ["contributions:list", "occupancy:list", "rewards:getWallet", "obligations:list"]
    isFinancialLoading = true
    financialSubscriptions.removeAll()
    contributions = []
    ledger = []
    nights = []
    wallet = .null
    var args: [String: ConvexEncodable?] = ["stayId": selectedStayID]
    if !selectedGuestID.isEmpty { args["guestUserId"] = selectedGuestID }
    watch("contributions:list", args: args, into: \.contributions, financial: true)
    watch("occupancy:list", args: args, into: \.nights, financial: true)
    watch("rewards:getWallet", args: args, into: \.wallet, financial: true)
    args["asOfDate"] = Display.date()
    watch("obligations:list", args: args, into: \.ledger, financial: true)
  }

  private func watch<T: Decodable>(
    _ name: String,
    args: [String: ConvexEncodable?] = [:],
    into keyPath: ReferenceWritableKeyPath<KouchdStore, T>,
    account: Bool = false,
    financial: Bool = false,
    adminScope: String = ""
  ) {
    let generation = accountGeneration
    let stayEpoch = stayGeneration
    let financialEpoch = financialGeneration
    let stayID = selectedStayID
    let guestID = selectedGuestID
    let token = client.subscribe(to: name, with: args, yielding: T.self)
      .receive(on: DispatchQueue.main)
      .sink(receiveCompletion: { [weak self] result in
        guard let self, generation == self.accountGeneration else { return }
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
          if financial { self.finishFinancialQuery(name) }
        }
      }, receiveValue: { [weak self] value in
        guard let self, generation == self.accountGeneration else { return }
        if !account && adminScope.isEmpty && (stayID != self.selectedStayID || stayEpoch != self.stayGeneration) { return }
        if financial && (guestID != self.selectedGuestID || financialEpoch != self.financialGeneration) { return }
        self[keyPath: keyPath] = value
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
    if !adminScope.isEmpty { adminSubscriptions[adminScope, default: []].append(token) }
    else if account { accountSubscriptions.append(token) }
    else if financial { financialSubscriptions.append(token) }
    else { staySubscriptions.append(token) }
  }

  private func finishFinancialQuery(_ name: String) {
    pendingFinancialQueries.remove(name)
    isFinancialLoading = !pendingFinancialQueries.isEmpty
  }

  func mutateValue(_ name: String, _ args: [String: ConvexEncodable?]) async -> Value? {
    do {
      let result: Value = try await client.mutation(name, with: args)
      error = ""
      return result
    } catch {
      self.error = error.localizedDescription
      return nil
    }
  }

  func mutate(_ name: String, _ args: [String: ConvexEncodable?]) async -> Bool {
    if let _ = await mutateValue(name, args) { return true }
    return false
  }

  func joinOrCreateStay(_ name: String, _ args: [String: ConvexEncodable?]) async -> Bool {
    guard let result = await mutateValue(name, args) else { return false }
    let id = result.text.isEmpty ? result["stayId"].text : result.text
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
