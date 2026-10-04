import ClerkConvex
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
  private var authSubscription: AnyCancellable?
  private var accountSubscriptions: [AnyCancellable] = []
  private var staySubscriptions: [AnyCancellable] = []
  private var financialSubscriptions: [AnyCancellable] = []
  private var adminSubscriptions: [String: [AnyCancellable]] = [:]

  init() {
    client = ConvexClientWithAuth(
      deploymentUrl: AppConfig.convexURL,
      authProvider: ClerkConvexAuthProvider()
    )
    authSubscription = client.authState
      .receive(on: DispatchQueue.main)
      .sink { [weak self] state in
        guard let self else { return }
        if case .authenticated = state {
          Task { await self.syncUser(name: nil) }
        } else if case .unauthenticated = state {
          self.reset()
        }
      }
  }

  func loadAccount() {
    accountSubscriptions.removeAll()
    watch("users:viewer", into: \.viewer, account: true)
    watch("stays:listMine", into: \.stays, account: true)
    watch("admin:canAccess", into: \.adminAccess, account: true)
  }

  func reset() {
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
    do {
      var args: [String: ConvexEncodable?] = [:]
      if let name, !name.isEmpty { args["clerkName"] = name }
      try await client.mutation("users:syncCurrent", with: args)
      loadAccount()
      isLoading = false
    } catch {
      self.error = error.localizedDescription
      isLoading = false
    }
  }

  func selectStay(_ id: String) {
    guard !id.isEmpty else { return }
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
    let token = client.subscribe(to: name, with: args, yielding: T.self)
      .receive(on: DispatchQueue.main)
      .sink(receiveCompletion: { [weak self] result in
        if case .failure(let failure) = result { self?.error = failure.localizedDescription }
      }, receiveValue: { [weak self] value in
        self?[keyPath: keyPath] = value
        if name == "admin:canAccess", let self, !self.adminAccess.flag { self.clearAdmin() }
        if name == "stays:getBundle", let self, self.financialSubscriptions.isEmpty {
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
