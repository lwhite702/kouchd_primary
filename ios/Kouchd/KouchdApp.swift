import ClerkKit
import ClerkKitUI
import CryptoKit
import RevenueCat
import SwiftUI

@main struct KouchdApp: App {
  init() {
    if AppConfig.isConfigured {
      Clerk.configure(publishableKey: AppConfig.clerkKey)
    }
    if AppConfig.revenueCatIsConfigured {
#if DEBUG
      Purchases.logLevel = .debug
#endif
      Purchases.configure(withAPIKey: AppConfig.revenueCatAPIKey)
    }
  }
  var body: some Scene {
    WindowGroup {
      Group {
        if AppConfig.isConfigured {
          RootView()
            .task { await PlusAccess.shared.start() }
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
      // Keep system-provided labels and formatting in English throughout the app.
      .environment(\.locale, Locale(identifier: "en_US"))
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
  @AppStorage("kouchd.darkModeEnabled") private var darkModeEnabled = false
  @AppStorage("kouchd.introductionRevision") private var introductionRevision = 0
  @State private var splashVisible = true
  @State private var pendingRoute: EntryRoute?
  @State private var destination: EntryRoute?
  @State private var authPresented = false
  @State private var inviteToken = ""
  @State private var invitePreview: Value = .null
  @State private var tab: Tab = .home

  private var screenshotDemoRole: String? {
#if DEBUG
    let arguments = ProcessInfo.processInfo.arguments
    if arguments.contains("--screenshot-demo-host") { return "host" }
    if arguments.contains("--screenshot-demo-guest") { return "guest" }
#endif
    return nil
  }

  var body: some View {
    // Keep one stable presentation host while the content branch changes.
    // Attaching the auth sheet to a conditional Group can drop the
    // presentation transaction, making a valid tap appear to do nothing.
    ZStack {
      if splashVisible {
        BrandSplash().transition(.opacity)
      } else if screenshotDemoRole == nil && introductionRevision < 1 && clerk.user == nil {
        IntroductionScreen { route in
          pendingRoute = route
          // Keep the introduction mounted while the auth sheet is being
          // presented. Switching the root branch in the same update as the
          // sheet presentation can leave the sign-in tap looking frozen.
          presentAuth()
        }
      } else if screenshotDemoRole == nil && clerk.user == nil {
        NavigationStack { welcome }
      } else if store.isLoading {
        ProgressView("Loading your stays")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .background(Palette.canvas)
      } else if store.stays.isEmpty {
        onboarding
      } else {
        TabView(selection: $tab) {
          NavigationStack {
            LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
              HomeScreen(store: store)
            }
          }
            .tabItem { Label(Tab.home.rawValue, systemImage: Tab.home.symbol) }.tag(Tab.home)
          NavigationStack {
            LoadedStayContent(loading: store.isStayLoading || store.isFinancialLoading) {
              LedgerScreen(store: store)
            }
          }
            .tabItem { Label(Tab.ledger.rawValue, systemImage: Tab.ledger.symbol) }.tag(Tab.ledger)
          NavigationStack {
            LoadedStayContent(loading: store.isStayLoading) {
              ChoresScreen(store: store)
            }
          }
            .tabItem { Label(Tab.chores.rawValue, systemImage: Tab.chores.symbol) }.tag(Tab.chores)
          NavigationStack {
            LoadedStayContent(loading: store.isStayLoading) {
              StayScreen(store: store)
            }
          }
            .tabItem { Label(Tab.stay.rawValue, systemImage: Tab.stay.symbol) }.tag(Tab.stay)
        }
        .tint(Palette.link)
      }
    }
    // Bind the override to the live root hierarchy so toggling the setting
    // repaints every presented Kouchd screen immediately.
    .preferredColorScheme(darkModeEnabled ? .dark : nil)
    .animation(KouchdMotion.animation(reduceMotion), value: phase)
    .task {
      // Keep the brand entrance short and independent of network startup.
      try? await Task.sleep(for: .milliseconds(450))
      if let role = screenshotDemoRole {
        // Load fixtures after Clerk's initial auth-state callback so that its
        // unauthenticated reset cannot replace the demo with a loading screen.
        store.loadScreenshotDemo(role: role)
      }
      splashVisible = false
    }
    .task {
      guard screenshotDemoRole == nil else { return }
      await KouchdFunnel.start()
    }
    .task {
      guard screenshotDemoRole == nil else { return }
      // AuthView reads its identifier fields from Clerk's environment. Load
      // that configuration before presenting the prebuilt auth flow.
      if clerk.environment == nil {
        _ = try? await clerk.refreshEnvironment()
      }
    }
    .task {
      guard screenshotDemoRole == nil else { return }
      if clerk.user != nil { await store.connectAuthenticatedUser() }
    }
    .onChange(of: clerk.user) { _, user in
      guard user != nil else { return }
      Task { await store.connectAuthenticatedUser() }
      Task { await KouchdRevenueCatIdentity.sync(userID: user?.id) }
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
    .sheet(isPresented: $authPresented) {
      KouchdAuthView {
        authPresented = false
      }
      .environment(clerk)
    }
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
        if clerk.user == nil { presentAuth() }
        Task { await loadInvitation() }
      } else {
        Task { try? await clerk.handle(url) }
      }
    }
    .onChange(of: clerk.user?.id, initial: true) { _, id in
      guard screenshotDemoRole == nil else { return }
      if id == nil { store.reset(); destination = nil }
      else { introductionRevision = 1 }
      Task { await KouchdRevenueCatIdentity.sync(userID: id) }
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
          PrimaryButton(title: "Sign in or create an account") { presentAuth() }
        })
      }
      NavigationRow("About Kouchd", symbol: "info.circle") { AboutKouchdScreen() }
      if !inviteToken.isEmpty {
        Text("Your invitation will be ready after sign-in.")
          .font(.subheadline).foregroundStyle(Palette.link)
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
          NavigationRow("Join with a code", symbol: "person.badge.plus") { JoinCodeScreen(store: store) }
        }
        NavigationRow("Profile and optional reminders", symbol: "person.crop.circle") { SettingsScreen(store: store) }
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
        NavigationRow("About Kouchd", symbol: "info.circle") { AboutKouchdScreen() }
        UserButton().frame(minWidth: 44, minHeight: 44)
      }
      .navigationDestination(item: $destination) { route in
        switch route {
        case .host: CreateStayScreen(store: store)
        case .guest: JoinCodeScreen(store: store)
        }
      }
    }
  }

  private func presentAuth() {
    authPresented = true
    Task {
      _ = try? await clerk.refreshEnvironment()
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

/// A clean native sign-in and sign-up surface used for iOS.
private struct KouchdAuthView: View {
  private enum Mode: String, CaseIterable {
    case signIn = "Sign in"
    case signUp = "Create account"
  }
  private enum Field: Hashable { case email, password, code }

  @FocusState private var focusedField: Field?
  @Environment(Clerk.self) private var clerk
  @Environment(\.dismiss) private var dismiss
  let onComplete: () -> Void

  @State private var mode: Mode = .signIn
  @State private var identifier = ""
  @State private var password = ""
  @State private var verificationCode = ""
  @State private var emailCodeSignIn: SignIn?
  @State private var emailCodeSignUp: SignUp?
  @State private var isAwaitingSignUpCode = false
  @State private var useEmailCode = false
  @State private var isSubmitting = false
  @State private var errorMessage = ""

  private var isAwaitingCode: Bool {
    (mode == .signIn && useEmailCode && emailCodeSignIn != nil) ||
    (mode == .signUp && isAwaitingSignUpCode)
  }

  private var submitTitle: String {
    if isAwaitingCode { return "Verify code" }
    if mode == .signUp { return "Create account" }
    return useEmailCode ? "Send sign-in code" : "Sign in"
  }

  private var submitDisabled: Bool {
    if isSubmitting { return true }
    let email = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
    if email.isEmpty { return true }
    if isAwaitingCode {
      return verificationCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    if mode == .signUp {
      return password.count < 8
    }
    return !useEmailCode && password.isEmpty
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          Picker("Authentication", selection: $mode) {
            ForEach(Mode.allCases, id: \.self) { m in
              Text(m.rawValue).tag(m)
            }
          }
          .pickerStyle(.segmented)
          .onChange(of: mode) { _, _ in
            errorMessage = ""
            verificationCode = ""
            emailCodeSignIn = nil
            emailCodeSignUp = nil
            isAwaitingSignUpCode = false
          }

          if isAwaitingCode {
            Text("Enter the 6-digit verification code sent to your email.")
              .font(.subheadline)
              .foregroundStyle(Palette.muted)
          } else if mode == .signUp {
            Text("Create your Kouchd account to coordinate shared stays.")
              .font(.subheadline)
              .foregroundStyle(Palette.muted)
          } else {
            Text(useEmailCode
              ? "We'll send a one-time verification code to your email."
              : "Sign in with your email and password.")
              .font(.subheadline)
              .foregroundStyle(Palette.muted)
          }
        }

        Section("Account") {
          TextField("Email address", text: $identifier)
            .textContentType(.emailAddress)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .focused($focusedField, equals: .email)
            .submitLabel(isAwaitingCode ? .done : .next)
            .disabled(isAwaitingCode)
            .accessibilityIdentifier("auth.identifier")

          if isAwaitingCode {
            TextField("6-digit code", text: $verificationCode)
              .keyboardType(.numberPad)
              .textContentType(.oneTimeCode)
              .focused($focusedField, equals: .code)
              .accessibilityIdentifier("auth.code")
          } else if mode == .signUp || !useEmailCode {
            SecureField(mode == .signUp ? "Password (min 8 characters)" : "Password", text: $password)
              .textContentType(mode == .signUp ? .newPassword : .password)
              .focused($focusedField, equals: .password)
              .submitLabel(.go)
              .onSubmit { submit() }
              .accessibilityIdentifier("auth.password")
          }
        }

        if !errorMessage.isEmpty {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(errorMessage.contains("sent") ? Palette.forest : .red)
            .accessibilityIdentifier("auth.error")
        }

        Section {
          Button {
            submit()
          } label: {
            HStack {
              Text(submitTitle)
                .fontWeight(.semibold)
              Spacer()
              if isSubmitting { ProgressView() }
            }
          }
          .disabled(submitDisabled)
          .accessibilityIdentifier("auth.submit")

          if mode == .signIn && !isAwaitingCode {
            Button(useEmailCode ? "Sign in with password instead" : "Email me a one-time code instead") {
              focusedField = nil
              useEmailCode.toggle()
              errorMessage = ""
            }
            .font(.subheadline)
            .foregroundStyle(Palette.link)
          } else if isAwaitingCode {
            Button("Start over") {
              verificationCode = ""
              emailCodeSignIn = nil
              emailCodeSignUp = nil
              isAwaitingSignUpCode = false
              errorMessage = ""
            }
            .font(.subheadline)
            .foregroundStyle(Palette.muted)
          }
        }

        Section {
          Link("Open in web browser", destination: URL(string: "https://app.kouchd.com/\(mode == .signUp ? "sign-up" : "sign-in")")!)
            .font(.footnote)
            .foregroundStyle(Palette.link)
        }
      }
      .navigationTitle(mode == .signUp ? "Create account" : "Sign in")
      .navigationBarTitleDisplayMode(.inline)
      .scrollDismissesKeyboard(.interactively)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Close") { dismiss() }
        }
      }
    }
    .tint(Palette.link)
  }

  private func submit() {
    guard !isSubmitting else { return }
    let email = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !email.isEmpty else { return }
    let code = verificationCode.trimmingCharacters(in: .whitespacesAndNewlines)

    focusedField = nil
    isSubmitting = true
    errorMessage = ""

    Task { @MainActor in
      do {
        if mode == .signUp {
          if isAwaitingSignUpCode {
            guard let pending = emailCodeSignUp else {
              isSubmitting = false
              return
            }
            let verified = try await pending.verifyEmailCode(code)
            if let sessionID = verified.createdSessionId {
              try await clerk.auth.setActive(sessionId: sessionID)
              onComplete()
              dismiss()
            } else {
              errorMessage = "Account created. Please sign in."
              mode = .signIn
              isAwaitingSignUpCode = false
            }
          } else {
            let signUp = try await clerk.auth.signUp(emailAddress: email, password: password)
            if let sessionID = signUp.createdSessionId {
              try await clerk.auth.setActive(sessionId: sessionID)
              onComplete()
              dismiss()
            } else {
              emailCodeSignUp = try await signUp.sendEmailCode()
              isAwaitingSignUpCode = true
              errorMessage = "A verification code was sent to \(email)."
              focusedField = .code
            }
          }
        } else {
          // Sign In
          if useEmailCode {
            if let pending = emailCodeSignIn {
              let signIn = try await pending.verifyCode(code)
              if let sessionID = signIn.createdSessionId {
                try await clerk.auth.setActive(sessionId: sessionID)
                onComplete()
                dismiss()
              } else {
                errorMessage = "This account needs another verification step."
              }
            } else {
              emailCodeSignIn = try await clerk.auth.signInWithEmailCode(emailAddress: email)
              errorMessage = "A verification code was sent to \(email)."
              focusedField = .code
            }
          } else {
            let signIn = try await clerk.auth.signInWithPassword(identifier: email, password: password)
            if let sessionID = signIn.createdSessionId {
              try await clerk.auth.setActive(sessionId: sessionID)
              onComplete()
              dismiss()
            } else {
              errorMessage = "This account needs another verification step."
            }
          }
        }
      } catch {
        errorMessage = error.localizedDescription
      }
      isSubmitting = false
    }
  }
}
