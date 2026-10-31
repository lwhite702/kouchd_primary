import SwiftUI

enum AppTab: String, CaseIterable {
  case home = "Home", ledger = "Ledger", chores = "Chores", stay = "Stay", more = "More"
  var symbol: String {
    switch self {
    case .home: "house.fill"
    case .ledger: "list.bullet.rectangle"
    case .chores: "checkmark.circle"
    case .stay: "bed.double"
    case .more: "ellipsis.circle"
    }
  }
}

/// A place in the sidebar. Everyday sections match the tabs; the rest live under More on iPhone.
enum ShellSection: Hashable {
  case home, ledger, chores, stay
  case tool(KouchdRoute)
}

/// One navigation state for both layouts, so a resized window stays on the same screen.
@MainActor @Observable final class ShellNavigator {
  private(set) var section: ShellSection = .home
  private(set) var tab: AppTab = .home
  var morePath: [KouchdRoute] = []
  var detailPath: [KouchdRoute] = []
  /// Pushed screens for each everyday tab, kept so a resize can carry them over.
  var tabPaths: [AppTab: [KouchdRoute]] = [:]

  /// Screens that finish by dismissing themselves, so they must be pushed rather than be a root.
  static let pushedWorkflows: Set<KouchdRoute> = [.createStay, .joinCode, .householdGuide]

  func select(_ section: ShellSection) {
    if case .tool(let route) = section, Self.pushedWorkflows.contains(route) {
      self.section = .home
      tab = .home
      detailPath = [route]
      return
    }
    self.section = section
    detailPath = []
    switch section {
    case .home: tab = .home
    case .ledger: tab = .ledger
    case .chores: tab = .chores
    case .stay: tab = .stay
    case .tool(let route):
      tab = .more
      morePath = [route]
    }
  }

  func selectTab(_ tab: AppTab) {
    self.tab = tab
    switch tab {
    case .home: section = .home
    case .ledger: section = .ledger
    case .chores: section = .chores
    case .stay: section = .stay
    case .more: break
    }
  }

  func openMore(_ route: KouchdRoute? = nil) {
    if let route {
      select(.tool(route))
    } else {
      morePath = []
      tab = .more
    }
  }

  func openActivity(_ kind: String, action: String = "") {
    switch kind {
    case "contribution", "obligation": select(.ledger)
    case "chore": select(.chores)
    case "check_in": openMore(.checkins)
    case "shopping": openMore(.shopping)
    case "reward": openMore(.rewards)
    case "terms": openMore(action.hasPrefix("payment_schedule_") ? .schedule : .agreement)
    case "stay", "invite": select(.stay)
    case "announcement": select(.home)
    default: openMore(.activity)
    }
  }

  /// Carries the screen across when the window crosses between tabs and the sidebar.
  func syncLayout(toSidebar: Bool) {
    if toSidebar {
      guard tab == .more else {
        detailPath = tabPaths[tab] ?? []
        return
      }
      guard let root = morePath.first else { return }
      if Self.pushedWorkflows.contains(root) {
        section = .home
        tab = .home
        detailPath = morePath
      } else {
        section = .tool(root)
        detailPath = Array(morePath.dropFirst())
      }
    } else if case .tool(let route) = section {
      tab = .more
      morePath = [route] + detailPath
    } else {
      tabPaths[tab] = detailPath
    }
  }

  /// Pushed screens and tools belong to the stay they opened for, so a switch leaves them.
  func stayDidChange() {
    detailPath = []
    morePath = []
    tabPaths = [:]
    if case .tool = section { select(.home) }
  }

  /// Leaves a tool the person can no longer use, such as Host controls after a stay ends.
  func closeUnavailableTools(in context: StayTool.Context) {
    func isUnavailable(_ route: KouchdRoute) -> Bool {
      StayTool.allCases.contains { $0.route == route && !$0.isVisible(in: context) }
    }
    if let root = morePath.first, isUnavailable(root) { morePath = [] }
    if case .tool(let route) = section, isUnavailable(route) { select(.home) }
  }

  func tabPath(_ tab: AppTab) -> Binding<[KouchdRoute]> {
    Binding(get: { self.tabPaths[tab] ?? [] }, set: { self.tabPaths[tab] = $0 })
  }
}

/// Who sees which stay tool. Both the More screen and the sidebar read these rules.
enum StayTool: CaseIterable, Hashable {
  case hostControls, agreement, schedule, occupancy, rewards, activity
  case shopping, checkins
  case settings, guide, about, help
  case createStay, joinStay
  case admin

  struct Context: Equatable {
    var isHost: Bool
    var isEnded: Bool
    var usesOccupiedNights: Bool
    var isAdmin: Bool
  }

  func isVisible(in context: Context) -> Bool {
    switch self {
    case .hostControls: context.isHost && !context.isEnded
    case .agreement: !context.isHost
    case .occupancy: context.usesOccupiedNights
    case .admin: context.isAdmin
    default: true
    }
  }

  var route: KouchdRoute? {
    switch self {
    case .hostControls: .hostControls
    case .agreement: .agreement
    case .schedule: .schedule
    case .occupancy: .occupancy
    case .rewards: .rewards
    case .activity: .activity
    case .shopping: .shopping
    case .checkins: .checkins
    case .settings: .settings
    case .guide: .householdGuide
    case .about: .about
    case .help: nil
    case .createStay: .createStay
    case .joinStay: .joinCode
    case .admin: .admin
    }
  }

  var title: String {
    switch self {
    case .hostControls: "Host controls"
    case .agreement: "Guest agreement"
    case .schedule: "Schedule requests"
    case .occupancy: "Occupied nights"
    case .rewards: "Contribution rewards"
    case .activity: "Household activity"
    case .shopping: "Shopping list"
    case .checkins: "Check-ins"
    case .settings: "Profile & reminders"
    case .guide: "Household guide"
    case .about: "About Kouchd"
    case .help: "Help center"
    case .createStay: "Create a stay"
    case .joinStay: "Join a stay"
    case .admin: "Platform administration"
    }
  }

  var symbol: String {
    switch self {
    case .hostControls: "slider.horizontal.3"
    case .agreement: "doc.text"
    case .schedule: "calendar"
    case .occupancy: "moon"
    case .rewards: "sparkles"
    case .activity: "clock.arrow.circlepath"
    case .shopping: "basket"
    case .checkins: "bubble.left.and.bubble.right"
    case .settings: "person.crop.circle"
    case .guide: "book.closed"
    case .about: "info.circle"
    case .help: "questionmark.circle"
    case .createStay: "plus.circle"
    case .joinStay: "person.badge.plus"
    case .admin: "shield.lefthalf.filled"
    }
  }

  func detail(isHost: Bool) -> String {
    switch self {
    case .hostControls: "Edit the agreement, house details, and contribution options."
    case .agreement: "Read the shared expectations and review any changes."
    case .schedule: isHost ? "Review requests to change the contribution rhythm." : "Ask your host to change the contribution rhythm."
    case .occupancy: isHost ? "Record or review nights included in the agreement." : "Review nights recorded for this stay."
    case .rewards: isHost ? "Review submitted contributions and reward points." : "Submit contributions for review or use available points."
    case .activity: "See recent changes and shared updates."
    case .shopping: "Keep shared items and your own list together."
    case .checkins: "Share updates and follow up with your host or guest."
    case .settings: "Update your name, phone number, and notifications."
    case .guide: "Learn how shared stay tools work."
    case .about: "See what Kouchd helps hosts and guests manage."
    case .help: "Find answers and contact support."
    case .createStay: "Set up a new shared stay and its agreement."
    case .joinStay: "Enter an invitation code from your host."
    case .admin: "Review platform tools and audit records."
    }
  }

  static func visible(_ tools: [StayTool], in context: Context) -> [StayTool] {
    tools.filter { $0.isVisible(in: context) }
  }

  static let helpURL = URL(string: "https://help.kouchd.com")!
}

extension KouchdStore {
  var toolContext: StayTool.Context {
    StayTool.Context(
      isHost: isHost,
      isEnded: isEnded,
      usesOccupiedNights: bundle["terms"]["billingBasis"].text == "occupied_nights",
      isAdmin: adminAccess.flag
    )
  }
}

/// Tabs on compact widths, sidebar on regular widths.
struct AuthenticatedShell: View {
  let store: KouchdStore
  @Bindable var navigator: ShellNavigator
  @Environment(\.horizontalSizeClass) private var sizeClass
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var columnVisibility: NavigationSplitViewVisibility = .all
  @State private var pinsSidebar = true

  private var usesSidebar: Bool {
    #if DEBUG
    if ProcessInfo.processInfo.arguments.contains("--ui-test-tabs") { return false }
    #endif
    return sizeClass == .regular
  }

  var body: some View {
    Group {
      if usesSidebar { sidebarLayout } else { tabLayout }
    }
    .tint(Palette.forest)
    .focusedSceneValue(\.shellNavigator, navigator)
    .onChange(of: usesSidebar) { _, toSidebar in navigator.syncLayout(toSidebar: toSidebar) }
    // A pinned sidebar would squeeze smaller windows, so there it stays closed until asked for.
    // Changing visibility, not the split view's style, keeps open screens and their edits.
    .onGeometryChange(for: Bool.self) { $0.size.width >= 1000 } action: { pinned in
      pinsSidebar = pinned
      // The split view ignores a change made while it is first being laid out.
      Task { @MainActor in columnVisibility = pinned ? .all : .detailOnly }
    }
    .onChange(of: navigator.section) { _, _ in
      if !pinsSidebar { columnVisibility = .detailOnly }
    }
    .onChange(of: store.toolContext) { _, context in
      // Role and status are unknown while a stay loads, so wait for its data.
      if !store.isStayLoading { navigator.closeUnavailableTools(in: context) }
    }
    .onChange(of: store.isStayLoading) { _, loading in
      if !loading { navigator.closeUnavailableTools(in: store.toolContext) }
    }
  }

  private var sidebarLayout: some View {
    NavigationSplitView(columnVisibility: $columnVisibility) {
      StaySidebar(store: store, navigator: navigator)
        .navigationSplitViewColumnWidth(min: 240, ideal: typeSize.isAccessibilitySize ? 380 : 280, max: 420)
    } detail: {
      NavigationStack(path: $navigator.detailPath) {
        sectionContent(navigator.section)
          .id(navigator.section)
          // Screens keep local edits, so each stay gets fresh ones.
          .id(store.selectedStayID)
          .kouchdDestinations(store: store)
      }
    }
    .navigationSplitViewStyle(.balanced)
  }

  private var tabLayout: some View {
    TabView(selection: Binding(get: { navigator.tab }, set: { navigator.selectTab($0) })) {
      NavigationStack(path: navigator.tabPath(.home)) {
        sectionContent(.home).kouchdDestinations(store: store)
      }
      .tabItem { Label(AppTab.home.rawValue, systemImage: AppTab.home.symbol) }.tag(AppTab.home)
      NavigationStack(path: navigator.tabPath(.ledger)) {
        sectionContent(.ledger).kouchdDestinations(store: store)
      }
      .tabItem { Label(AppTab.ledger.rawValue, systemImage: AppTab.ledger.symbol) }.tag(AppTab.ledger)
      NavigationStack(path: navigator.tabPath(.chores)) {
        sectionContent(.chores).kouchdDestinations(store: store)
      }
      .tabItem { Label(AppTab.chores.rawValue, systemImage: AppTab.chores.symbol) }.tag(AppTab.chores)
      NavigationStack(path: navigator.tabPath(.stay)) {
        sectionContent(.stay).kouchdDestinations(store: store)
      }
      .tabItem { Label(AppTab.stay.rawValue, systemImage: AppTab.stay.symbol) }.tag(AppTab.stay)
      NavigationStack(path: $navigator.morePath) {
        LoadedStayContent(loading: store.isStayLoading) {
          MoreScreen(store: store)
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(AppTab.more.rawValue, systemImage: AppTab.more.symbol) }.tag(AppTab.more)
    }
  }

  @ViewBuilder private func sectionContent(_ section: ShellSection) -> some View {
    switch section {
    case .home:
      LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
        HomeScreen(
          store: store,
          openLedger: { navigator.select(.ledger) },
          openChores: { navigator.select(.chores) },
          openMore: { navigator.openMore($0) },
          openActivity: { navigator.openActivity($0, action: $1) }
        )
      }
    case .ledger:
      LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
        LedgerScreen(store: store)
      }
    case .chores:
      LoadedStayContent(loading: store.isStayLoading) { ChoresScreen(store: store) }
    case .stay:
      LoadedStayContent(loading: store.isStayLoading) { StayScreen(store: store) }
    case .tool(let route):
      LoadedStayContent(loading: store.isStayLoading) { KouchdRouteView(route: route, store: store) }
    }
  }
}

private struct StaySidebar: View {
  let store: KouchdStore
  let navigator: ShellNavigator

  private var selection: Binding<ShellSection?> {
    Binding(get: { navigator.section }, set: { if let section = $0 { navigator.select(section) } })
  }

  var body: some View {
    List(selection: selection) {
      Section {
        row("Home", symbol: AppTab.home.symbol, section: .home)
        row("Ledger", symbol: AppTab.ledger.symbol, section: .ledger)
        row("Chores", symbol: AppTab.chores.symbol, section: .chores)
        row("Stay", symbol: AppTab.stay.symbol, section: .stay)
      }
      toolSection("Household", [.shopping, .checkins, .activity])
      toolSection("This stay", [.agreement, .hostControls, .schedule, .occupancy, .rewards])
      toolSection("Account & help", [.settings, .guide, .about, .help])
      toolSection("Another stay", [.createStay, .joinStay])
      toolSection("Administration", [.admin])
    }
    .listStyle(.sidebar)
    // Selection stays dark forest with white text; lime would lose contrast in dark mode.
    .tint(Palette.brandForest)
    .navigationTitle("Kouchd")
    .navigationBarTitleDisplayMode(.inline)
    .safeAreaInset(edge: .top, spacing: 0) { staySwitcher }
  }

  private func row(_ title: String, symbol: String, section: ShellSection) -> some View {
    Label(title, systemImage: symbol).tag(section).listItemTint(Palette.forest)
  }

  @ViewBuilder private func toolSection(_ title: String, _ tools: [StayTool]) -> some View {
    let visible = StayTool.visible(tools, in: store.toolContext)
    if !visible.isEmpty {
      Section(title) {
        ForEach(visible, id: \.self) { tool in
          if let route = tool.route {
            row(tool.title, symbol: tool.symbol, section: .tool(route))
          } else {
            Link(destination: StayTool.helpURL) { Label(tool.title, systemImage: tool.symbol) }
              .foregroundStyle(Palette.ink).listItemTint(Palette.forest)
          }
        }
      }
    }
  }

  private var staySwitcher: some View {
    Menu {
      ForEach(store.stays.indices, id: \.self) { index in
        let stay = store.stays[index]["stay"]
        Button(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text) {
          guard stay["_id"].text != store.selectedStayID else { return }
          navigator.stayDidChange()
          store.selectStay(stay["_id"].text)
        }
      }
    } label: {
      HStack(spacing: 8) {
        VStack(alignment: .leading, spacing: 2) {
          Text(store.stayName).font(.headline).foregroundStyle(Palette.forest).lineLimit(2)
          Text(store.isHost ? "Hosting" : "Guest").font(.caption).foregroundStyle(Palette.muted)
        }
        Spacer(minLength: 8)
        Image(systemName: "chevron.up.chevron.down").font(.caption.bold()).foregroundStyle(Palette.muted)
      }
      .padding(12)
      .background(Palette.surface, in: RoundedRectangle(cornerRadius: 14))
      .contentShape(Rectangle())
    }
    .padding(.horizontal, 16).padding(.vertical, 8)
    .accessibilityLabel("Switch stay, current stay: \(store.stayName)")
    .hoverEffect(.highlight)
  }
}

private struct ShellNavigatorKey: FocusedValueKey {
  typealias Value = ShellNavigator
}

extension FocusedValues {
  var shellNavigator: ShellNavigator? {
    get { self[ShellNavigatorKey.self] }
    set { self[ShellNavigatorKey.self] = newValue }
  }
}

/// Hardware keyboard shortcuts for the everyday sections.
struct KouchdCommands: Commands {
  @FocusedValue(\.shellNavigator) private var navigator

  var body: some Commands {
    CommandMenu("Go") {
      Button("Home") { navigator?.select(.home) }.keyboardShortcut("1").disabled(navigator == nil)
      Button("Ledger") { navigator?.select(.ledger) }.keyboardShortcut("2").disabled(navigator == nil)
      Button("Chores") { navigator?.select(.chores) }.keyboardShortcut("3").disabled(navigator == nil)
      Button("Stay") { navigator?.select(.stay) }.keyboardShortcut("4").disabled(navigator == nil)
    }
  }
}
