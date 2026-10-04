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
    adminAccess = .null
    adminStats = .null
    adminUsers = .null
    adminStays = .null
    adminUserDetail = .null
    adminStayDetail = .null
    adminFinancials = .null
    adminSms = []
    selectedStayID = ""
    selectedGuestID = ""
    error = ""
    isLoading = true
  }

  func loadAdmin() {
    guard adminAccess.flag else { return }
    watch("admin:getOverviewStats", into: \.adminStats)
    watch("admin:listUsers", into: \.adminUsers)
    watch("admin:listStays", into: \.adminStays)
    watch("admin:listDisputesAndLedgers", into: \.adminFinancials)
    watch("admin:listSmsComplianceEvents", into: \.adminSms)
  }

  func loadAdminUser(_ id: String) {
    guard adminAccess.flag else { return }
    watch("admin:getUserDetail", args: ["userId": id], into: \.adminUserDetail)
  }

  func loadAdminStay(_ id: String) {
    guard adminAccess.flag else { return }
    watch("admin:getStayDetail", args: ["stayId": id], into: \.adminStayDetail)
  }

  func syncUser(name: String?) async {
    do {
      var args: [String: ConvexEncodable?] = [:]
      if let name, !name.isEmpty { args["name"] = name }
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
    financial: Bool = false
  ) {
    let token = client.subscribe(to: name, with: args, yielding: T.self)
      .receive(on: DispatchQueue.main)
      .sink(receiveCompletion: { [weak self] result in
        if case .failure(let failure) = result { self?.error = failure.localizedDescription }
      }, receiveValue: { [weak self] value in
        self?[keyPath: keyPath] = value
        if name == "stays:getBundle", let self, self.financialSubscriptions.isEmpty {
          if self.isHost {
            self.selectedGuestID = self.guests.first?["person"]["id"].text ?? ""
          }
          self.loadGuestData()
        }
      })
    if account { accountSubscriptions.append(token) }
    else if financial { financialSubscriptions.append(token) }
    else { staySubscriptions.append(token) }
  }

  func mutate(_ name: String, _ args: [String: ConvexEncodable?]) async -> Bool {
    do {
      try await client.mutation(name, with: args)
      error = ""
      return true
    } catch {
      self.error = error.localizedDescription
      return false
    }
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
