import ClerkKitUI
import SwiftUI

enum Palette {
  static let cream = adaptive(light: 0xF6F2EA, dark: 0x101713)
  static let surface = adaptive(light: 0xFFFFFF, dark: 0x1B2721)
  static let forest = adaptive(light: 0x174E39, dark: 0xD5F59A)
  static let brandForest = Color(red: 0.090, green: 0.306, blue: 0.224)
  static let ink = adaptive(light: 0x16241E, dark: 0xF1F5F0)
  static let muted = adaptive(light: 0x697169, dark: 0xAEB8B0)
  static let lime = Color(red: 0.870, green: 0.950, blue: 0.370)
  static let onLime = Color(red: 0.086, green: 0.141, blue: 0.118)
  static let line = adaptive(light: 0xDFDED3, dark: 0x34443B)
  static let heading = Font.custom("Manrope", size: 33, relativeTo: .largeTitle).weight(.bold)
  static let section = Font.custom("Manrope", size: 23, relativeTo: .title2).weight(.bold)

  static func adaptive(light: UInt32, dark: UInt32) -> Color {
    Color(uiColor: UIColor { traits in
      let value = traits.userInterfaceStyle == .dark ? dark : light
      return UIColor(
        red: CGFloat((value >> 16) & 0xFF) / 255,
        green: CGFloat((value >> 8) & 0xFF) / 255,
        blue: CGFloat(value & 0xFF) / 255,
        alpha: 1
      )
    })
  }
}

extension ClerkTheme {
  /// Clerk's sign-in, sign-up and account screens in Kouchd's colors, type and shapes:
  /// cream surfaces, forest buttons (lime in dark mode), Manrope headings, rounded fields.
  static let kouchd: ClerkTheme = {
    var fonts = ClerkTheme.Fonts.default
    fonts.largeTitle = Font.custom("Manrope", size: 33, relativeTo: .largeTitle).weight(.bold)
    fonts.title = Font.custom("Manrope", size: 28, relativeTo: .title).weight(.bold)
    fonts.title2 = Font.custom("Manrope", size: 23, relativeTo: .title2).weight(.bold)
    fonts.title3 = Font.custom("Manrope", size: 20, relativeTo: .title3).weight(.bold)
    return ClerkTheme(
      colors: .init(
        primary: Palette.forest,
        background: Palette.cream,
        input: Palette.surface,
        foreground: Palette.ink,
        mutedForeground: Palette.muted,
        primaryForeground: Palette.adaptive(light: 0xFFFFFF, dark: 0x16241E),
        inputForeground: Palette.ink,
        neutral: Palette.muted,
        ring: Palette.forest,
        muted: Palette.adaptive(light: 0xEFEADF, dark: 0x1B2721),
        secondaryButtonBackground: Palette.surface,
        border: Palette.line
      ),
      fonts: fonts,
      design: .init(borderRadius: 16)
    )
  }()
}

/// Column rules for wide windows. They follow the measured content width, not the
/// device, so Split View and Stage Manager get the layout that actually fits.
enum KouchdLayout {
  static let twoColumnWidth: CGFloat = 700
  static let threeColumnWidth: CGFloat = 1000
  static let ledgerSplitWidth: CGFloat = 700

  static func columns(forWidth width: CGFloat, isAccessibilitySize: Bool = false) -> Int {
    if isAccessibilitySize || width < twoColumnWidth { return 1 }
    return width < threeColumnWidth ? 2 : 3
  }
}

enum PageWidth {
  case reading, wide
  var maxWidth: CGFloat { self == .reading ? 720 : 1240 }
}

private struct ContentWidthKey: EnvironmentKey {
  static let defaultValue: CGFloat = 0
}

extension EnvironmentValues {
  /// Usable width of the surrounding page, or 0 outside a measured page.
  var kouchdContentWidth: CGFloat {
    get { self[ContentWidthKey.self] }
    set { self[ContentWidthKey.self] = newValue }
  }
}

/// A scrolling page that tells its content how much width it has.
struct ResponsiveScroll<Content: View>: View {
  var width: PageWidth = .reading
  var padding: CGFloat = 20
  @ViewBuilder let content: Content
  @State private var measured: CGFloat = 0

  var body: some View {
    ScrollView {
      content
        .environment(\.kouchdContentWidth, max(0, min(measured, width.maxWidth) - padding * 2))
        .padding(padding)
        .frame(maxWidth: width.maxWidth, alignment: .leading)
        .frame(maxWidth: .infinity)
    }
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { measured = $0 }
  }
}

/// Gives a view the column count for the surrounding page.
struct ColumnsReader<Content: View>: View {
  @Environment(\.kouchdContentWidth) private var contentWidth
  @Environment(\.dynamicTypeSize) private var typeSize
  @ViewBuilder let content: (Int) -> Content

  var body: some View {
    content(KouchdLayout.columns(forWidth: contentWidth, isAccessibilitySize: typeSize.isAccessibilitySize))
  }
}

/// One column on narrow pages, an even grid on wide ones.
struct AdaptiveGrid<Content: View>: View {
  var maxColumns = 3
  var spacing: CGFloat = 20
  @ViewBuilder let content: Content

  var body: some View {
    ColumnsReader { columns in
      if columns == 1 {
        VStack(alignment: .leading, spacing: spacing) { content }
      } else {
        LazyVGrid(
          columns: Array(repeating: GridItem(.flexible(), spacing: spacing, alignment: .top), count: min(columns, maxColumns)),
          alignment: .leading,
          spacing: spacing
        ) { content }
      }
    }
  }
}

/// Two independent stacks side by side, or leading above trailing when narrow.
struct TwoColumnLayout<Leading: View, Trailing: View>: View {
  var spacing: CGFloat = 20
  @ViewBuilder let leading: Leading
  @ViewBuilder let trailing: Trailing
  @Environment(\.kouchdContentWidth) private var contentWidth

  var body: some View {
    ColumnsReader { columns in
      if columns == 1 {
        VStack(alignment: .leading, spacing: spacing) {
          leading
          trailing
        }
      } else {
        HStack(alignment: .top, spacing: spacing) {
          VStack(alignment: .leading, spacing: spacing) { leading }
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
          VStack(alignment: .leading, spacing: spacing) { trailing }
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .environment(\.kouchdContentWidth, (contentWidth - spacing) / 2)
      }
    }
  }
}

struct Page<Content: View>: View {
  let title: String
  var navigationTitle: String? = nil
  var width: PageWidth = .reading
  @ViewBuilder let content: Content

  init(title: String, navigationTitle: String? = nil, width: PageWidth = .reading, @ViewBuilder content: () -> Content) {
    self.title = title
    self.navigationTitle = navigationTitle
    self.width = width
    self.content = content()
  }

  var body: some View {
    ResponsiveScroll(width: width) {
      VStack(alignment: .leading, spacing: 20) {
        Text(title).font(Palette.heading)
          .foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
        content
      }
    }
    .background(Palette.cream.ignoresSafeArea())
    .kouchdEntrance()
    .kouchdNavigationBar(title: navigationTitle ?? title)
  }
}

struct Card<Content: View>: View {
  @ViewBuilder let content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 14) { content }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
      .kouchdEntrance(delay: 0.04)
  }
}

struct Pill: View {
  let text: String
  var body: some View {
    Text(text.uppercased())
      .font(.caption2.weight(.bold))
      .tracking(1)
      .foregroundStyle(Palette.onLime)
      .padding(.horizontal, 12).padding(.vertical, 7)
      .background(Palette.lime, in: Capsule())
  }
}

struct PrimaryButton: View {
  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.kouchdContentWidth) private var contentWidth
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title).font(.headline).foregroundStyle(.white).frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .contentShape(Rectangle())
    }
    .kouchdPrimaryButtonStyle()
    .fixedSize(horizontal: false, vertical: true)
    .frame(maxWidth: contentWidth > 600 ? 420 : .infinity)
    .opacity(isEnabled ? 1 : 0.5)
  }
}

struct DataRow: View {
  @Environment(\.dynamicTypeSize) private var typeSize
  let title: String
  let detail: String
  var body: some View {
    Group {
      if typeSize.isAccessibilitySize {
        VStack(alignment: .leading, spacing: 6) {
          Text(title).foregroundStyle(Palette.muted)
          Text(detail).foregroundStyle(Palette.ink)
        }
      } else {
        HStack(alignment: .firstTextBaseline) {
          Text(title).foregroundStyle(Palette.muted)
          Spacer(minLength: 12)
          Text(detail).multilineTextAlignment(.trailing).foregroundStyle(Palette.ink)
        }
      }
    }.font(.subheadline).accessibilityElement(children: .combine)
  }
}

struct EmptyCard: View {
  let title: String
  let message: String
  var body: some View {
    Card {
      Image(systemName: "sparkle").font(.title2).foregroundStyle(Palette.forest)
      Text(title).font(.headline)
      Text(message).font(.subheadline).foregroundStyle(Palette.muted)
    }
  }
}

struct VoidRecordButton: View {
  let store: KouchdStore
  let function: String
  let recordKey: String
  let recordID: String
  @State private var confirming = false
  var body: some View {
    Button("Void record", role: .destructive) { confirming = true }
      .disabled(store.isEnded)
      .confirmationDialog("Void this record?", isPresented: $confirming) {
        Button("Void record", role: .destructive) {
          Task { _ = await store.mutate(function, [recordKey: recordID]) }
        }
      } message: {
        Text("The record stays in the history but no longer counts toward the balance or current activity.")
      }
  }
}

// Animate navigation content and interactions, never financial values or live records.
enum KouchdMotion {
  static func animation(_ reduced: Bool) -> Animation {
    reduced ? .easeOut(duration: 0.16) : .spring(duration: 0.38, bounce: 0.08)
  }
}

private struct KouchdEntrance: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var visible = false
  var delay: Double
  func body(content: Content) -> some View {
    content.opacity(visible ? 1 : 0)
      .offset(y: visible || reduceMotion ? 0 : 6)
      .onAppear {
        withAnimation(KouchdMotion.animation(reduceMotion).delay(reduceMotion ? 0 : delay)) { visible = true }
      }
  }
}

private struct KouchdNavigationBarModifier: ViewModifier {
  var title: String? = nil

  func body(content: Content) -> some View {
    if let title, !title.isEmpty {
      content
        .navigationTitle(title.replacingOccurrences(of: "\n", with: " "))
        .navigationBarTitleDisplayMode(.inline)
    } else {
      content
        .navigationBarTitleDisplayMode(.inline)
    }
  }
}

private struct KouchdFormWidth: ViewModifier {
  @Environment(\.horizontalSizeClass) private var sizeClass

  @ViewBuilder func body(content: Content) -> some View {
    if sizeClass == .regular {
      content
        .scrollContentBackground(.hidden)
        .frame(maxWidth: 640)
        .frame(maxWidth: .infinity)
        .background(Palette.cream.ignoresSafeArea())
    } else {
      content
    }
  }
}

extension View {
  @ViewBuilder
  func kouchdPrimaryButtonStyle() -> some View {
    if #available(iOS 26.0, *) {
      self.buttonStyle(.glassProminent)
        .tint(Palette.brandForest)
    } else {
      self.buttonStyle(KouchdButtonStyle())
    }
  }

  func kouchdNavigationBar(title: String? = nil) -> some View {
    modifier(KouchdNavigationBarModifier(title: title))
  }

  /// Keeps settings-style forms at a readable width in wide windows.
  func kouchdFormWidth() -> some View {
    modifier(KouchdFormWidth())
  }

  func kouchdEntrance(delay: Double = 0) -> some View {
    modifier(KouchdEntrance(delay: delay))
  }

  @ViewBuilder
  func kouchdDestinations(store: KouchdStore) -> some View {
    self.navigationDestination(for: KouchdRoute.self) { route in
      KouchdRouteView(route: route, store: store)
    }
  }
}

/// The screen for a route, shared by pushed destinations and sidebar sections.
struct KouchdRouteView: View {
  let route: KouchdRoute
  let store: KouchdStore

  var body: some View {
    switch route {
    case .agreement: AgreementScreen(store: store)
    case .ledger: LedgerScreen(store: store)
    case .chores: ChoresScreen(store: store)
    case .rewards: RewardsScreen(store: store)
    case .stay: StayScreen(store: store)
    case .stayDetails(let stayID): StayDetailsDestination(store: store, stayID: stayID)
    case .occupancy: OccupancyScreen(store: store)
    case .schedule: ScheduleScreen(store: store)
    case .settings: SettingsScreen(store: store)
    case .activity: ActivityScreen(store: store)
    case .shopping: ShoppingScreen(store: store)
    case .checkins: CheckInsScreen(store: store)
    case .householdGuide: HouseholdGuideScreen(store: store)
    case .createStay: CreateStayScreen(store: store)
    case .joinCode: JoinCodeScreen(store: store)
    case .hostControls: HostControlsScreen(store: store)
    case .subscription: SubscriptionScreen(store: store)
    case .termsEdit: TermsEditScreen(store: store)
    case .houseInfo: HouseInfoScreen(store: store)
    case .paymentOptions: PaymentOptionsScreen(store: store)
    case .adhocCharge: AdhocChargeScreen(store: store)
    case .rewardRules: RewardRulesScreen(store: store)
    case .about: AboutKouchdScreen()
    case .admin: AdminScreen(store: store)
    case .adminFinancial: AdminFinancialScreen(store: store)
    case .adminSmsHistory:
      AdminSMSHistory(events: store.adminSms)
        .task { store.loadAdminSMS() }
        .onDisappear { store.stopAdmin("sms") }
    case .adminUserSmsHistory(let userID):
      AdminSMSHistory(events: store.adminUserDetail["user"].id == userID
        ? store.adminUserDetail["smsEvents"].items
        : [])
        .task { store.loadAdminUser(userID) }
        .onDisappear { store.stopAdmin("user") }
    case .adminUser(let id): AdminUserScreen(store: store, userID: id)
    case .adminStay(let id): AdminStayScreen(store: store, stayID: id)
    }
  }
}

private struct StayDetailsDestination: View {
  let store: KouchdStore
  let stayID: String

  var body: some View {
    LoadedStayContent(loading: store.isStayLoading) {
      StayScreen(store: store)
    }
    .task {
      if store.selectedStayID != stayID { store.selectStay(stayID) }
    }
  }
}

private struct KouchdButtonStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.foregroundStyle(.white)
      .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 16))
      .shadow(
        color: Palette.brandForest.opacity(configuration.isPressed ? 0.08 : 0.2),
        radius: configuration.isPressed ? 3 : 10,
        x: 0,
        y: configuration.isPressed ? 1 : 5
      )
      .contentShape(RoundedRectangle(cornerRadius: 16))
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
      .offset(y: configuration.isPressed && !reduceMotion ? 1 : 0)
      .animation(reduceMotion ? .easeOut(duration: 0.1) : .spring(duration: 0.28, bounce: 0.12), value: configuration.isPressed)
  }
}


// Keep each navigation stack mounted while a selected stay or guest loads.
struct LoadedStayContent<Content: View>: View {
  let loading: Bool
  var error: String = ""
  var retry: (() -> Void)? = nil
  @ViewBuilder let content: Content
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var body: some View {
    content.opacity(loading || !error.isEmpty ? 0 : 1).disabled(loading || !error.isEmpty).accessibilityHidden(loading || !error.isEmpty)
      .overlay {
        if loading {
          ProgressView("Opening your stay")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.cream.ignoresSafeArea()).transition(.opacity)
        } else if !error.isEmpty {
          VStack(spacing: 16) {
            Text(error).multilineTextAlignment(.center)
            if let retry { Button("Try again", action: retry) }
          }.padding().frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.cream.ignoresSafeArea())
        }
      }
      .animation(KouchdMotion.animation(reduceMotion), value: loading)
  }
}
