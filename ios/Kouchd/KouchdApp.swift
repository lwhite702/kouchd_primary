import ClerkKit
import ClerkKitUI
import CryptoKit
import SwiftUI

@main struct KouchdApp: App {
  init() {
    if AppConfig.isConfigured {
      Clerk.configure(publishableKey: AppConfig.clerkKey)
    }
  }
  var body: some Scene {
    WindowGroup {
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
}

private enum Tab: String, CaseIterable {
  case home = "Home", ledger = "Ledger", chores = "Chores", stay = "Stay"
  var symbol: String {
    switch self {
    case .home: "house.fill"
    case .ledger: "list.bullet.rectangle"
    case .chores: "checkmark.circle"
    case .stay: "bed.double"
    }
  }
}

struct RootView: View {
  @Environment(Clerk.self) private var clerk
  @State private var store = KouchdStore()
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @AppStorage("kouchd.introductionRevision") private var introductionRevision = 0
  @State private var splashVisible = true
  @State private var pendingRoute: EntryRoute?
  @State private var destination: EntryRoute?
  @State private var authPresented = false
  @State private var inviteToken = ""
  @State private var invitePreview: Value = .null
  @State private var tab: Tab = .home

  var body: some View {
    Group {
      if splashVisible {
        BrandSplash().transition(.opacity)
      } else if introductionRevision < 1 && clerk.user == nil {
        IntroductionScreen { route in
          pendingRoute = route
          introductionRevision = 1
          authPresented = true
        }
      } else if clerk.user == nil {
        NavigationStack { welcome }
      } else if store.isLoading {
        ProgressView("Loading your stays")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Palette.cream)
      } else if store.stays.isEmpty {
        onboarding
      } else {
        TabView(selection: $tab) {
          NavigationStack {
            LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
              HomeScreen(store: store)
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
        }
        .tint(Palette.forest)
      }
    }
    .animation(KouchdMotion.animation(reduceMotion), value: phase)
    .task {
      // Keep the brand entrance short; cancellation must not strand the splash.
      try? await Task.sleep(for: .milliseconds(450))
      splashVisible = false
    }
    .onChange(of: store.isLoading) { _, loading in
      if !loading && clerk.user != nil && store.stays.isEmpty && !authPresented {
        destination = pendingRoute
        pendingRoute = nil
      }
    }
    .onChange(of: authPresented) { _, presented in
      if !presented && clerk.user != nil && !store.isLoading && store.stays.isEmpty {
        destination = pendingRoute
        pendingRoute = nil
      }
    }
    .sheet(isPresented: $authPresented) { AuthView().environment(clerk) }
    .sheet(isPresented: Binding(
      get: { !authPresented && !inviteToken.isEmpty && clerk.user != nil && invitePreview["valid"].flag },
      set: { if !$0 { inviteToken = "" } }
    )) {
      InvitationScreen(store: store, token: inviteToken, preview: invitePreview) {
        inviteToken = ""
      }
    }
    .alert("Kouchd couldn't complete that", isPresented: Binding(
      get: { !store.error.isEmpty },
      set: { if !$0 { store.error = "" } }
    )) {
      Button("OK") { store.error = "" }
    } message: { Text(store.error) }
    .onOpenURL { url in
      if url.pathComponents.count >= 3 && url.pathComponents[1] == "invite" {
        introductionRevision = 1
        pendingRoute = nil
        destination = nil
        invitePreview = .null
        inviteToken = url.lastPathComponent
        if clerk.user == nil { authPresented = true }
        Task { await loadInvitation() }
      } else {
        Task { try? await clerk.handle(url) }
      }
    }
    .onChange(of: clerk.user?.id, initial: true) { _, id in
      if id == nil { store.reset(); destination = nil }
      else { introductionRevision = 1 }
      if id != nil && !inviteToken.isEmpty { Task { await loadInvitation() } }
    }
    .onChange(of: store.stays.count) { _, count in
      if store.selectedStayID.isEmpty, let first = store.stays.first, count > 0 {
        store.selectStay(first["stay"]["_id"].text)
      }
    }
  }

  private var welcome: some View {
    Page(title: "Make room for what matters.") {
      Card {
        Pill(text: "Kouchd")
        Text("A calmer way to share a stay.")
          .font(.system(size: 28, weight: .semibold, design: .rounded))
        Text("Keep agreements, contributions, chores, and check-ins together.")
          .foregroundStyle(Palette.muted)
        UserButton(signedOutContent: {
          PrimaryButton(title: "Sign in or create an account") { authPresented = true }
        })
      }
      NavigationLink("About Kouchd", value: KouchdRoute.about)
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

  private var phase: String {
    if splashVisible { return "splash" }
    if clerk.user == nil { return introductionRevision < 1 ? "introduction" : "welcome" }
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
        if !preview["valid"].flag { store.error = "This invitation has expired or was already used." }
        break
      }
    } catch {
      store.error = error.localizedDescription
    }
  }
}
