import SwiftUI

enum Palette {
  static let cream = adaptive(light: 0xF6F2EA, dark: 0x101713)
  static let surface = adaptive(light: 0xFFFFFF, dark: 0x1B2721)
  static let forest = adaptive(light: 0x174E39, dark: 0xD5F59A)
  static let brandForest = Color(red: 0.090, green: 0.306, blue: 0.224)
  static let ink = adaptive(light: 0x16241E, dark: 0xF1F5F0)
  static let muted = adaptive(light: 0x697169, dark: 0xAEB8B0)
  static let lime = Color(red: 0.870, green: 0.950, blue: 0.370)
  static let line = adaptive(light: 0xDFDED3, dark: 0x34443B)
  static let heading = Font.custom("Manrope", size: 33, relativeTo: .largeTitle).weight(.bold)
  static let section = Font.custom("Manrope", size: 23, relativeTo: .title2).weight(.bold)

  private static func adaptive(light: UInt32, dark: UInt32) -> Color {
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

struct Page<Content: View>: View {
  let title: String
  var navigationTitle: String? = nil
  @ViewBuilder let content: Content

  init(title: String, navigationTitle: String? = nil, @ViewBuilder content: () -> Content) {
    self.title = title
    self.navigationTitle = navigationTitle
    self.content = content()
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text(title).font(Palette.heading)
          .foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
        content
      }
      .padding(20)
      .frame(maxWidth: 720, alignment: .leading)
      .frame(maxWidth: .infinity)
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
      .foregroundStyle(Palette.ink)
      .padding(.horizontal, 12).padding(.vertical, 7)
      .background(Palette.lime, in: Capsule())
  }
}

struct PrimaryButton: View {
  @Environment(\.isEnabled) private var isEnabled
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title).font(.headline).frame(maxWidth: .infinity)
        .padding(.vertical, 15)
        .contentShape(Rectangle())
    }
    .buttonStyle(KouchdButtonStyle())
    .fixedSize(horizontal: false, vertical: true)
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
      .offset(y: visible || reduceMotion ? 0 : 10)
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
        .toolbarBackground(Palette.cream, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    } else {
      content
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Palette.cream, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }
  }
}

extension View {
  func kouchdNavigationBar(title: String? = nil) -> some View {
    modifier(KouchdNavigationBarModifier(title: title))
  }

  func kouchdEntrance(delay: Double = 0) -> some View {
    modifier(KouchdEntrance(delay: delay))
  }

  @ViewBuilder
  func kouchdDestinations(store: KouchdStore) -> some View {
    self.navigationDestination(for: KouchdRoute.self) { route in
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
      case .adminSmsHistory: AdminSMSHistory(events: store.adminSms)
      case .adminUserSmsHistory(let userID):
        AdminSMSHistory(events: store.adminUserDetail["user"].id == userID
          ? store.adminUserDetail["smsEvents"].items
          : [])
      case .adminUser(let id): AdminUserScreen(store: store, userID: id)
      case .adminStay(let id): AdminStayScreen(store: store, stayID: id)
      }
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
      .contentShape(RoundedRectangle(cornerRadius: 16))
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
      .opacity(configuration.isPressed ? 0.85 : 1)
      .animation(KouchdMotion.animation(reduceMotion), value: configuration.isPressed)
  }
}


// Keep each navigation stack mounted while a selected stay or guest loads.
struct LoadedStayContent<Content: View>: View {
  let loading: Bool
  @ViewBuilder let content: Content
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var body: some View {
    content.opacity(loading ? 0 : 1).disabled(loading).accessibilityHidden(loading)
      .overlay {
        if loading {
          ProgressView("Opening your stay")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.cream.ignoresSafeArea()).transition(.opacity)
        }
      }
      .animation(KouchdMotion.animation(reduceMotion), value: loading)
  }
}
