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
  @State private var authPresented = false
  @State private var inviteToken = ""
  @State private var invitePreview: Value = .null
  @State private var tab: Tab = .home

  var body: some View {
    Group {
      if clerk.user == nil {
        welcome
      } else if store.isLoading {
        ProgressView("Loading your stays")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Palette.cream)
      } else if store.stays.isEmpty {
        onboarding
      } else {
        TabView(selection: $tab) {
          NavigationStack { HomeScreen(store: store) }
            .tabItem { Label(Tab.home.rawValue, systemImage: Tab.home.symbol) }.tag(Tab.home)
          NavigationStack { LedgerScreen(store: store) }
            .tabItem { Label(Tab.ledger.rawValue, systemImage: Tab.ledger.symbol) }.tag(Tab.ledger)
          NavigationStack { ChoresScreen(store: store) }
            .tabItem { Label(Tab.chores.rawValue, systemImage: Tab.chores.symbol) }.tag(Tab.chores)
          NavigationStack { StayScreen(store: store) }
            .tabItem { Label(Tab.stay.rawValue, systemImage: Tab.stay.symbol) }.tag(Tab.stay)
        }
        .tint(Palette.forest)
      }
    }
    .sheet(isPresented: $authPresented) { AuthView().environment(clerk) }
    .sheet(isPresented: Binding(
      get: { !inviteToken.isEmpty && clerk.user != nil && invitePreview["valid"].flag },
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
        inviteToken = url.lastPathComponent
        Task { await loadInvitation() }
      } else {
        Task { try? await clerk.handle(url) }
      }
    }
    .onChange(of: clerk.user?.id, initial: true) { _, id in
      if id == nil { store.reset() }
      else if !inviteToken.isEmpty { Task { await loadInvitation() } }
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
      if !inviteToken.isEmpty {
        Text("Your invitation will be ready after sign-in.")
          .font(.subheadline).foregroundStyle(Palette.forest)
      }
    }
  }

  private var onboarding: some View {
    NavigationStack {
      Page(title: "Welcome to Kouchd") {
        Card {
          Text("Start a shared stay").font(.title3.bold())
          Text("Set the dates, contribution rhythm, and house notes for your guests.")
            .foregroundStyle(Palette.muted)
          NavigationLink("Create a stay") { CreateStayScreen(store: store) }
            .buttonStyle(.borderedProminent).tint(Palette.forest)
        }
        Card {
          Text("Joining someone?").font(.title3.bold())
          Text("Open their invite link or enter their referral code.")
          NavigationLink("Join with a code") { JoinCodeScreen(store: store) }
        }
        NavigationLink("Profile and optional reminders") { SettingsScreen(store: store) }
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
        UserButton()
      }
    }
  }

  private func loadInvitation() async {
    let hash = SHA256.hash(data: Data(inviteToken.utf8))
      .map { String(format: "%02x", $0) }.joined()
    do {
      for try await preview in store.client
        .subscribe(to: "invites:preview", with: ["tokenHash": hash], yielding: Value.self).values {
        invitePreview = preview
        if !preview["valid"].flag { store.error = "This invitation has expired or was already used." }
        break
      }
    } catch {
      store.error = error.localizedDescription
    }
  }
}
