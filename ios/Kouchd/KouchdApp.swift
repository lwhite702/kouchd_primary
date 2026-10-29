import ClerkKit
import ClerkKitUI
import ConvexMobile
import CryptoKit
import RevenueCat
import SwiftUI

@main struct KouchdApp: App {
  init() {
    #if DEBUG
    if IntroductionTestHost.isEnabled { return }
    initConvexLogging()
    #endif
    if AppConfig.isConfigured {
      Clerk.configure(publishableKey: AppConfig.clerkKey)
    }
    KouchdAnalytics.configure()
    if AppConfig.purchasesEnabled {
      #if DEBUG
      Purchases.logLevel = .debug
      #endif
      Purchases.configure(withAPIKey: AppConfig.revenueCatPublicKey)
    }
  }
  var body: some Scene {
    WindowGroup {
      #if DEBUG
      if IntroductionTestHost.isEnabled {
        IntroductionTestHost()
      } else {
        configuredContent
      }
      #else
      configuredContent
      #endif
    }
  }

  @ViewBuilder private var configuredContent: some View {
    if AppConfig.isConfigured {
      RootView()
        .prefetchClerkImages()
        .environment(Clerk.shared)
    } else {
      ContentUnavailableView(
        "Setup needed",
        systemImage: "gearshape",
        description: Text("Add the Clerk and Convex development settings to Local.xcconfig.")
      )
    }
  }
}

private enum Tab: String, CaseIterable {
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

private enum ActiveSheet: Identifiable {
  case auth
  case invitation(token: String, preview: Value)

  var id: String {
    switch self {
    case .auth: return "auth"
    case .invitation(let token, _): return "invite-\(token)"
    }
  }
}

struct RootView: View {
  @Environment(Clerk.self) private var clerk
  @State private var store = KouchdStore()
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var introductionRevision = UserDefaults.standard.integer(forKey: "kouchd.introductionRevision")
  @State private var splashVisible = true
  @State private var pendingRoute: EntryRoute?
  @State private var destination: EntryRoute?
  @State private var activeSheet: ActiveSheet?
  @State private var inviteToken = ""
  @State private var invitePreview: Value = .null
  @State private var tab: Tab = .home
  @State private var billing = BillingModel(client: RevenueCatBillingClient.shared)
  @State private var morePath = NavigationPath()

  private func openMore(_ route: KouchdRoute? = nil) {
    morePath = NavigationPath()
    if let route { morePath.append(route) }
    tab = .more
  }

  private func openActivity(_ kind: String, action: String = "") {
    switch kind {
    case "contribution", "obligation": tab = .ledger
    case "chore": tab = .chores
    case "check_in": openMore(.checkins)
    case "shopping": openMore(.shopping)
    case "reward": openMore(.rewards)
    case "terms": openMore(action.hasPrefix("payment_schedule_") ? .schedule : .agreement)
    case "stay", "invite": tab = .stay
    case "announcement": tab = .home
    default: openMore(.activity)
    }
  }

  private func markIntroductionComplete() {
    introductionRevision = 1
    UserDefaults.standard.set(1, forKey: "kouchd.introductionRevision")
  }

  var body: some View {
    rootScreen
    .animation(KouchdMotion.animation(reduceMotion), value: phase)
    .task { await hideSplashScreen() }
    .onChange(of: store.isLoading) { _, loading in handleLoadingChange(loading) }
    .onChange(of: clerk.user?.id) { _, userID in handleAnalyticsUserChange(userID) }
    .onChange(of: phase, initial: true) { _, screen in KouchdAnalytics.screenViewed(screen) }
    .onChange(of: activeSheet?.id) { _, sheetID in handleActiveSheetChange(sheetID) }
    .sheet(item: $activeSheet) { sheet in
      switch sheet {
      case .auth:
        AuthView().environment(\.clerkTheme, .kouchd)
      case .invitation(let token, let preview):
        InvitationScreen(store: store, token: token, preview: preview) {
          inviteToken = ""
          activeSheet = nil
        }
      }
    }
    .alert("Kouchd couldn't complete that", isPresented: Binding(
      get: { !store.error.isEmpty },
      set: { if !$0 { store.error = "" } }
    )) {
      Button("OK") { store.error = "" }
    } message: { Text(store.error) }
    .onOpenURL(perform: handleOpenURL)
    .onChange(of: clerk.user?.id, initial: true) { _, userID in handleSessionUserChange(userID) }
    .onChange(of: store.stays.count) { _, count in handleStayCountChange(count) }
  }

  @ViewBuilder
  private var rootScreen: some View {
    if splashVisible {
      BrandSplash().transition(.opacity)
    } else if introductionRevision < 1 && clerk.user == nil {
      IntroductionScreen(finish: handleIntroductionCompletion)
    } else if clerk.user == nil {
      NavigationStack { welcome }
    } else if !store.connectionError.isEmpty {
      connectionIssue
    } else if store.isLoading {
      ProgressView("Loading your stays")
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Palette.cream)
    } else if store.stays.isEmpty {
      onboarding
    } else {
      authenticatedTabs
    }
  }

  private var authenticatedTabs: some View {
    TabView(selection: $tab) {
      NavigationStack {
        LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
          HomeScreen(
            store: store,
            openLedger: { tab = .ledger },
            openMore: { openMore($0) },
            openActivity: { openActivity($0, action: $1) }
          )
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(Tab.home.rawValue, systemImage: Tab.home.symbol) }.tag(Tab.home)
      NavigationStack {
        LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
          LedgerScreen(store: store)
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(Tab.ledger.rawValue, systemImage: Tab.ledger.symbol) }.tag(Tab.ledger)
      NavigationStack {
        LoadedStayContent(loading: store.isStayLoading) {
          ChoresScreen(store: store)
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(Tab.chores.rawValue, systemImage: Tab.chores.symbol) }.tag(Tab.chores)
      NavigationStack {
        LoadedStayContent(loading: store.isStayLoading) {
          StayScreen(store: store)
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(Tab.stay.rawValue, systemImage: Tab.stay.symbol) }.tag(Tab.stay)
      NavigationStack(path: $morePath) {
        LoadedStayContent(loading: store.isStayLoading) {
          MoreScreen(store: store)
        }
        .kouchdDestinations(store: store)
      }
      .tabItem { Label(Tab.more.rawValue, systemImage: Tab.more.symbol) }.tag(Tab.more)
    }
    .tint(Palette.forest)
  }

  private func hideSplashScreen() async {
    // Keep the brand entrance short; cancellation must not strand the splash.
    try? await Task.sleep(for: .milliseconds(450))
    splashVisible = false
  }

  private func handleIntroductionCompletion(_ route: EntryRoute?) {
    pendingRoute = route
    markIntroductionComplete()
    Task { @MainActor in
      try? await Task.sleep(for: .milliseconds(250))
      activeSheet = .auth
    }
  }

  private func handleLoadingChange(_ loading: Bool) {
    guard !loading, clerk.user != nil, store.stays.isEmpty, activeSheet == nil else { return }
    destination = pendingRoute
    pendingRoute = nil
  }

  private func handleAnalyticsUserChange(_ userID: String?) {
    // Only the pseudonymous Clerk ID; never names, email, or household details.
    KouchdAnalytics.identify(userID)
  }

  private func handleSessionUserChange(_ userID: String?) {
    guard let userID else {
      destination = nil
      Task { await store.disconnectAuthenticatedSession() }
      Task { await billing.updateIdentity(nil) }
      return
    }

    markIntroductionComplete()

    if activeSheet?.id == "auth" {
      activeSheet = nil
    }
    Task { await store.connectAuthenticatedSession() }
    Task { await billing.updateIdentity(userID) }

    guard !inviteToken.isEmpty else { return }
    if invitePreview["valid"].flag {
      activeSheet = .invitation(token: inviteToken, preview: invitePreview)
    } else {
      Task { await loadInvitation() }
    }
  }

  private func handleActiveSheetChange(_ sheetID: String?) {
    guard sheetID == nil, clerk.user != nil, !store.isLoading, store.stays.isEmpty else { return }
    destination = pendingRoute
    pendingRoute = nil
  }

  private func handleOpenURL(_ url: URL) {
    if url.pathComponents.count >= 3 && url.pathComponents[1] == "invite" {
      markIntroductionComplete()
      pendingRoute = nil
      destination = nil
      invitePreview = .null
      inviteToken = url.lastPathComponent
      if clerk.user == nil { activeSheet = .auth }
      Task { await loadInvitation() }
    } else {
      Task { try? await clerk.handle(url) }
    }
  }

  private func handleStayCountChange(_ count: Int) {
    guard store.selectedStayID.isEmpty, let first = store.stays.first, count > 0 else { return }
    store.selectStay(first["stay"]["_id"].text)
  }

  @ViewBuilder
  private var welcome: some View {
    Page(title: "Make room for what matters.", navigationTitle: "") {
      Card {
        Pill(text: "Kouchd")
        Text("A calmer way to share a stay.")
          .font(.system(size: 28, weight: .semibold, design: .rounded))
        Text("Keep agreements, contributions, chores, and check-ins together.")
          .foregroundStyle(Palette.muted)
        PrimaryButton(title: "Sign in or create an account") {
          activeSheet = .auth
        }
      }
      NavigationLink(value: KouchdRoute.about) {
        HStack {
          Text("About Kouchd")
            .font(.body.weight(.medium))
            .foregroundStyle(Palette.forest)
          Spacer()
          Image(systemName: "chevron.right")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Palette.muted)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
      }
      if !inviteToken.isEmpty {
        Text("Your invitation will be ready after sign-in.")
          .font(.subheadline).foregroundStyle(Palette.forest)
      }
    }
    .kouchdDestinations(store: store)
  }

  private var onboarding: some View {
    NavigationStack {
      Page(title: "Welcome to Kouchd") {
        Card {
          Text("Start a shared stay").font(.title3.bold())
          Text("Set the dates, contribution rhythm, and house notes for your guests.")
            .foregroundStyle(Palette.muted)
          NavigationLink("Create a stay", value: KouchdRoute.createStay)
            .buttonStyle(.borderedProminent).tint(Palette.forest)
        }
        Card {
          Text("Joining someone?").font(.title3.bold())
          Text("Open their invite link or enter their referral code.")
          NavigationLink("Join with a code", value: KouchdRoute.joinCode)
        }
        NavigationLink("Profile and optional reminders", value: KouchdRoute.settings)
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
        NavigationLink("About Kouchd", value: KouchdRoute.about)
        UserButton()
      }
      .kouchdDestinations(store: store)
      .navigationDestination(item: $destination) { route in
        switch route {
        case .host: CreateStayScreen(store: store)
        case .guest: JoinCodeScreen(store: store)
        }
      }
    }
  }

  private var connectionIssue: some View {
    Page(title: "We couldn't load your stays") {
      Card {
        Image(systemName: "wifi.exclamationmark")
          .font(.title2)
          .foregroundStyle(Palette.forest)
        Text(store.connectionError)
          .foregroundStyle(Palette.muted)
        PrimaryButton(title: "Try again") {
          Task { await store.connectAuthenticatedSession() }
        }
        UserButton()
      }
    }
  }

  private var phase: String {
    if splashVisible { return "splash" }
    if clerk.user == nil { return introductionRevision < 1 ? "introduction" : "welcome" }
    if !store.connectionError.isEmpty { return "connection-error" }
    if store.isLoading { return "loading" }
    return store.stays.isEmpty ? "setup" : "home"
  }

  private func loadInvitation() async {
    let token = inviteToken
    let hash = SHA256.hash(data: Data(token.utf8))
      .map { String(format: "%02x", $0) }.joined()
    do {
      for try await preview in store.client
        .subscribe(to: "invites:preview", with: ["tokenHash": hash], yielding: Value.self).values {
        guard token == inviteToken else { return }
        invitePreview = preview
        if !preview["valid"].flag {
          store.error = "This invitation has expired or was already used."
        } else if clerk.user != nil && activeSheet == nil {
          activeSheet = .invitation(token: token, preview: preview)
        }
        break
      }
    } catch {
      store.error = error.localizedDescription
    }
  }
}
