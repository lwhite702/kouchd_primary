import ClerkKit
import ClerkConvex
import Combine
import ConvexMobile
import Foundation
import Observation

/// Convex expects the Clerk JWT template named `convex`. The shared bridge
/// defaults to Clerk's session token, which authenticates Clerk but is not
/// accepted by Convex's issuer configuration.
@MainActor
final class KouchdConvexAuthProvider: AuthProvider {
  typealias T = String

  func login(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    try await token(onIdToken: onIdToken)
  }

  func loginFromCache(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    try await token(onIdToken: onIdToken)
  }

  func logout() async throws {
    try await Clerk.shared.auth.signOut()
  }

  nonisolated func extractIdToken(from authResult: String) -> String { authResult }

  private func token(onIdToken: @Sendable @escaping (String?) -> Void) async throws -> String {
    guard Clerk.shared.isLoaded else { throw ClerkConvexAuthError.clerkNotLoaded }
    guard let session = Clerk.shared.session else {
      throw ClerkConvexAuthError.noActiveSession
    }
    guard let token = try await session.getToken(.init(template: "convex")) else {
      throw ClerkConvexAuthError.tokenRetrievalFailed("Convex JWT template returned nil")
    }
    onIdToken(token)
    return token
  }
}

enum AppConfig {
  static var clerkKey: String {
    Bundle.main.object(forInfoDictionaryKey: "CLERK_PUBLISHABLE_KEY") as? String ?? ""
  }
  static var convexURL: String {
    Bundle.main.object(forInfoDictionaryKey: "CONVEX_URL") as? String ?? ""
  }
  static var revenueCatAPIKey: String {
    Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_IOS_API_KEY") as? String ?? ""
  }
  static var revenueCatIsConfigured: Bool {
    revenueCatAPIKey.hasPrefix("appl_")
  }
  static var isConfigured: Bool {
    clerkKey.hasPrefix("pk_") && convexURL.hasPrefix("https://")
      && !convexURL.contains("missing")
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
  var isLoading = true
  var isStayLoading = false
  var isFinancialLoading = false
  private var stayGeneration = 0
  private var financialGeneration = 0
  private var pendingFinancialQueries: Set<String> = []
  private var accountGeneration = 0
  private var authSubscription: AnyCancellable?
  private var accountSubscriptions: [AnyCancellable] = []
  private var staySubscriptions: [AnyCancellable] = []
  private var financialSubscriptions: [AnyCancellable] = []
  private var adminSubscriptions: [String: [AnyCancellable]] = [:]
  private var convexAuthStarted = false

  init() {
    client = ConvexClientWithAuth(
      deploymentUrl: AppConfig.convexURL,
      authProvider: KouchdConvexAuthProvider()
    )
    authSubscription = client.authState
      .receive(on: DispatchQueue.main)
      .sink { [weak self] state in
        guard let self else { return }
        if case .unauthenticated = state {
          self.reset()
        }
      }
  }

  /// Populates a fictional household for App Store captures. This is only
  /// reachable from DEBUG launch arguments handled by `RootView`.
  func loadScreenshotDemo(role: String) {
    let isHostDemo = role == "host"
    let viewerID = isHostDemo ? "demo-host" : "demo-guest"
    let viewerName = isHostDemo ? "Maya" : "Jordan"
    let stay = demoObject([
      "_id": .string("demo-stay"),
      "name": .string("Maple Street House"),
      "status": .string("active"),
      "nextCheckInDate": .string("Sunday, Nov 1"),
      "houseInfo": demoObject([
        "wifiNetwork": .string("Maple House Guest"),
        "parkingNotes": .string("Driveway or east side of Maple Street"),
        "trashDay": .string("Thursday morning")
      ]),
      "paymentOptions": .array([
        demoObject(["provider": .string("venmo"), "detail": .string("Coordinate with Maya")])
      ])
    ])
    let terms = demoObject([
      "_id": .string("demo-terms"),
      "version": .number(2),
      "startDate": .string("Oct 24, 2026"),
      "endDate": .string("Nov 21, 2026"),
      "cadence": .string("weekly"),
      "rateCents": .number(42500),
      "billingBasis": .string("fixed_period"),
      "houseNotes": .string("Quiet hours after 10 PM. Please reset shared spaces before bed."),
      "houseRules": .array([
        demoObject([
          "title": .string("Shared spaces"),
          "description": .string("Leave the kitchen and living room ready for the next person.")
        ])
      ])
    ])
    let hostMember = demoObject([
      "membership": demoObject([
        "role": .string("host"), "status": .string("active"),
        "acceptedTermsId": .string("demo-terms")
      ]),
      "person": demoObject(["id": .string("demo-host"), "name": .string("Maya Chen")])
    ])
    let guestMember = demoObject([
      "membership": demoObject([
        "role": .string("guest"), "status": .string("active"),
        "acceptedTermsId": .string("demo-terms")
      ]),
      "person": demoObject(["id": .string("demo-guest"), "name": .string("Jordan Lee")])
    ])

    viewer = demoObject(["id": .string(viewerID), "name": .string(viewerName)])
    stays = [demoObject([
      "stay": stay,
      "membership": demoObject(["role": .string(role), "status": .string("active")])
    ])]
    bundle = demoObject([
      "stay": stay,
      "terms": terms,
      "membership": demoObject([
        "role": .string(role), "status": .string("active"),
        "acceptedTermsId": .string("demo-terms")
      ]),
      "members": .array([hostMember, guestMember])
    ])
    ledger = [demoObject([
      "_id": .string("demo-ledger"),
      "title": .string("November household share"),
      "dueDate": .string("Nov 1, 2026"),
      "type": .string("cadence"),
      "effectiveChargeCents": .number(42500),
      "creditedCents": .number(15000),
      "balanceCents": .number(27500),
      "status": .string("due"),
      "lateFeeCents": .number(0),
      "lateFeeWaived": .bool(false)
    ])]
    contributions = [demoObject([
      "_id": .string("demo-contribution"),
      "type": .string("household contribution"),
      "status": .string("confirmed"),
      "amountCents": .number(15000),
      "date": .string("Oct 24, 2026"),
      "note": .string("First part of November household share"),
      "createdBy": .string("demo-guest")
    ])]
    chores = [
      demoObject([
        "_id": .string("demo-chore-1"),
        "title": .string("Take out recycling"),
        "assignee": .string("guest"),
        "assigneeUserId": .string("demo-guest"),
        "dueDate": .string("Thursday"),
        "note": .string("Bins go curbside Thursday evening."),
        "createdBy": .string("demo-host"),
        "completed": .bool(false),
        "voidedAt": .string("")
      ]),
      demoObject([
        "_id": .string("demo-chore-2"),
        "title": .string("Kitchen reset"),
        "assignee": .string("shared"),
        "dueDate": .string("Tonight"),
        "note": .string("Counters clear, dishwasher running."),
        "createdBy": .string("demo-host"),
        "completed": .bool(false),
        "voidedAt": .string("")
      ])
    ]
    announcements = [demoObject([
      "_id": .string("demo-announcement"),
      "title": .string("Sunday dinner at 7"),
      "body": .string("Add anything you want from the market to the house list.")
    ])]
    activity = [
      demoObject(["_id": .string("demo-activity-1"), "kind": .string("chore"), "detail": .string("Jordan added recycling to this week’s list")]),
      demoObject(["_id": .string("demo-activity-2"), "kind": .string("agreement"), "detail": .string("House notes were updated")])
    ]
    wallet = demoObject([
      "availablePoints": .number(80),
      "dollarEquivalentCents": .number(800),
      "settings": demoObject(["enabled": .bool(true), "coinName": .string("House points")]),
      "claims": .array([])
    ])
    rules = []
    schedule = []
    nights = []
    selectedStayID = "demo-stay"
    selectedGuestID = "demo-guest"
    isLoading = false
    isStayLoading = false
    isFinancialLoading = false
    error = ""
  }

  func connectAuthenticatedUser() async {
    guard !convexAuthStarted else { return }
    convexAuthStarted = true
    let result = await client.login()
    guard case .success = result else {
      convexAuthStarted = false
      isLoading = false
      return
    }
    await syncUser(name: nil)
  }

  func loadAccount() {
    accountSubscriptions.removeAll()
    watch("users:viewer", into: \.viewer, account: true)
    watch("stays:listMine", into: \.stays, account: true)
    watch("admin:canAccess", into: \.adminAccess, account: true)
  }

  func reset() {
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
    let generation = accountGeneration
    do {
      var args: [String: ConvexEncodable?] = [:]
      if let name, !name.isEmpty { args["clerkName"] = name }
      try await client.mutation("users:syncCurrent", with: args)
      guard generation == accountGeneration else { return }
      loadAccount()
    } catch {
      guard generation == accountGeneration else { return }
      self.error = error.localizedDescription
      isLoading = false
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
          self.error = failure.localizedDescription
          if name == "stays:listMine" { self.isLoading = false }
          if name == "stays:getBundle" { self.isStayLoading = false }
          if financial { self.finishFinancialQuery(name) }
        }
      }, receiveValue: { [weak self] value in
        guard let self, generation == self.accountGeneration else { return }
        if !account && adminScope.isEmpty && (stayID != self.selectedStayID || stayEpoch != self.stayGeneration) { return }
        if financial && (guestID != self.selectedGuestID || financialEpoch != self.financialGeneration) { return }
        self[keyPath: keyPath] = value
        if name == "stays:listMine" { self.isLoading = false }
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

private func demoObject(_ fields: [String: Value]) -> Value {
  .object(fields)
}
