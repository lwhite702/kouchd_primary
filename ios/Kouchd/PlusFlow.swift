import Foundation
import Observation
import SwiftUI

/// Why the Plus sheet opened. The reason is its headline, so the host knows why they're here.
enum PlusEntry: String, Identifiable {
  case settings, stayLimit, guestLimit
  var id: String { rawValue }

  var headline: String {
    switch self {
    case .settings: "Room for more of the people you host"
    case .stayLimit: "Host up to \(PlanCopy.plusStays) stays at once with Plus"
    case .guestLimit: "Invite up to \(PlanCopy.plusGuests) guests with Plus"
    }
  }

  /// The one next step on "Plus is on" that matches why they upgraded.
  var welcomeAction: (title: String, route: KouchdRoute)? {
    switch self {
    case .settings: nil
    case .stayLimit: ("Start your second stay", .createStay)
    case .guestLimit: ("Invite your next guest", .stay)
    }
  }
}

/// A purchase Apple finished that Kouchd's backend hasn't recorded. Gated actions stay
/// locked until it has. This keeps asking RevenueCat to re-send the purchase and carries
/// over to the next launch, so nobody is asked to pay twice.
@MainActor @Observable final class PlusSetupTracker {
  enum State: Equatable { case idle, settingUp, stuck, confirmed }

  private(set) var state: State = .idle
  @ObservationIgnored private let sync: @MainActor () async throws -> Void
  @ObservationIgnored private let retryDelays: [Duration]
  @ObservationIgnored private let defaults: UserDefaults
  @ObservationIgnored private var task: Task<Void, Never>?

  private static let userKey = "kouchd.plusSetup.userID"
  private static let startedKey = "kouchd.plusSetup.startedAt"
  private static let giveUpAfter: TimeInterval = 7 * 86_400

  init(sync: @escaping @MainActor () async throws -> Void,
       retryDelays: [Duration] = [.seconds(5), .seconds(15), .seconds(30), .seconds(60)],
       defaults: UserDefaults = .standard) {
    self.sync = sync
    self.retryDelays = retryDelays
    self.defaults = defaults
  }

  func begin(userID: String) {
    defaults.set(userID, forKey: Self.userKey)
    defaults.set(Date.now.timeIntervalSince1970, forKey: Self.startedKey)
    state = .settingUp
    startRetrying()
  }

  /// Called whenever the signed-in user or the backend's plan answer changes.
  func refresh(userID: String, hasPlus: Bool?, now: Date = .now) {
    guard defaults.string(forKey: Self.userKey) == userID else { return }
    if hasPlus == true {
      forget()
      if state == .settingUp || state == .stuck { state = .confirmed }
      return
    }
    let started = defaults.double(forKey: Self.startedKey)
    if now.timeIntervalSince1970 - started > Self.giveUpAfter {
      forget()
      state = .idle
      return
    }
    if hasPlus == false, state == .idle {
      state = .settingUp
      startRetrying()
    }
  }

  func retry() {
    state = .settingUp
    startRetrying()
  }

  func dismissConfirmation() {
    if state == .confirmed { state = .idle }
  }

  /// Stops work for this session. The pending note stays for when this person returns.
  func signedOut() {
    task?.cancel()
    task = nil
    state = .idle
  }

  private func forget() {
    task?.cancel()
    task = nil
    defaults.removeObject(forKey: Self.userKey)
    defaults.removeObject(forKey: Self.startedKey)
  }

  private func startRetrying() {
    task?.cancel()
    task = Task { [weak self, retryDelays] in
      for delay in retryDelays {
        try? await Task.sleep(for: delay)
        guard !Task.isCancelled, let self else { return }
        try? await self.sync()
      }
      guard !Task.isCancelled, let self, self.state == .settingUp else { return }
      self.state = .stuck
    }
  }

  #if DEBUG
  func showForTesting(_ state: State) { self.state = state }
  #endif
}

// MARK: - P1 and P3: Plus sheet

struct PlusSheet: View {
  let store: KouchdStore
  let entry: PlusEntry
  @State private var billing: BillingModel
  @State private var showingWelcome = false
  @Environment(\.dismiss) private var dismiss

  init(store: KouchdStore, entry: PlusEntry, billing: BillingModel? = nil) {
    self.store = store
    self.entry = entry
    _billing = State(initialValue: billing ?? BillingModel.live(store: store))
  }

  private var summary: AccountSubscriptionSummary? { store.typedSubscriptionSummary }

  var body: some View {
    NavigationStack {
      Group {
        if showingWelcome {
          PlusWelcome(store: store, entry: entry) { dismiss() }
        } else {
          offer
        }
      }
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button { dismiss() } label: { Image(systemName: "xmark") }
            .accessibilityLabel("Close")
            .disabled(billing.isConfirming)
        }
      }
    }
    .tint(Palette.forest)
    .interactiveDismissDisabled(billing.isConfirming)
    .task { await billing.load(kouchdTrialEligible: summary?.introOfferEligible) }
    .onChange(of: billing.outcome) { _, outcome in
      switch outcome {
      case .confirmed: showingWelcome = true
      case .settingUp:
        store.plusSetup.begin(userID: store.viewer["_id"].text)
        dismiss()
      default: break
      }
    }
    // Also covers Restore, and a webhook that lands after the wait began.
    .onChange(of: summary?.hasPlus) { _, hasPlus in
      if hasPlus == true { showingWelcome = true }
    }
  }

  private var offer: some View {
    Page(title: entry.headline, navigationTitle: "") {
      Card {
        Pill(text: "Kouchd Plus")
        VStack(alignment: .leading, spacing: 10) {
          benefit("house", "Up to \(PlanCopy.plusStays) active stays at once")
          benefit("person.2", "Up to \(PlanCopy.plusGuests) guests across your stays")
          benefit("checkmark.seal", "Everything you use on Free stays the same")
          benefit("iphone.and.arrow.forward", "One Plus on iPhone and the web. Guests always join free.")
        }
      }
      plans
      footer
      if entry == .stayLimit {
        Button("End current stay instead") {
          store.planRoute = .hostControls
          dismiss()
        }
        .font(.subheadline.weight(.semibold))
        .frame(maxWidth: .infinity)
        .disabled(billing.isConfirming)
      }
    }
  }

  @ViewBuilder private var plans: some View {
    if !billing.hasLoaded || billing.isLoading {
      VStack(spacing: 10) {
        ForEach(0..<2, id: \.self) { _ in
          RoundedRectangle(cornerRadius: 18).fill(Palette.line.opacity(0.5)).frame(height: 84)
        }
        PrimaryButton(title: "Continue") {}.disabled(true)
      }
      .accessibilityElement(children: .ignore)
      .accessibilityLabel("Loading plans")
    } else if billing.packages.isEmpty {
      Card {
        Text("Plans can't load right now").font(.headline).foregroundStyle(Palette.ink)
        Text("Nothing was charged. Check your connection and try again.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Button("Retry") {
          Task { await billing.load(kouchdTrialEligible: summary?.introOfferEligible) }
        }
        .font(.subheadline.weight(.semibold))
      }
    } else {
      VStack(spacing: 10) {
        ForEach(billing.sortedPackages) { package in
          PlanOptionRow(
            package: package,
            trialDays: billing.trialDays(for: package),
            savingsPercent: package.isAnnual ? billing.annualSavingsPercent : nil,
            selected: billing.selectedPackage?.id == package.id
          ) { billing.selectedPackageID = package.id }
        }
      }
      .disabled(billing.activeOperation != nil)
      if let package = billing.selectedPackage {
        let trialDays = billing.trialDays(for: package)
        if let trialDays { TrialTimeline(days: trialDays, priceWithPeriod: package.priceWithPeriod) }
        PrimaryButton(title: callToAction(package, trialDays: trialDays)) {
          Task { await billing.purchase(package) }
        }
        .disabled(billing.activeOperation != nil)
        if billing.isConfirming { ProgressView().frame(maxWidth: .infinity) }
        Text(PlusSheet.renewalLine(package, trialDays: trialDays))
          .font(.footnote).foregroundStyle(Palette.muted)
      }
      if !billing.message.isEmpty {
        Text(billing.message).font(.footnote).foregroundStyle(Palette.forest)
      }
      if !billing.error.isEmpty {
        Text(billing.error).font(.footnote).foregroundStyle(.red)
      }
    }
  }

  private var footer: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Payment is charged to your Apple account. Subscriptions renew automatically unless cancelled at least 24 hours before the period ends.")
        .font(.footnote).foregroundStyle(Palette.muted)
      HStack(spacing: 16) {
        Button("Restore purchases") { Task { await billing.restore() } }
          .disabled(billing.activeOperation != nil)
        Link("Terms", destination: URL(string: "https://kouchd.com/terms")!)
        Link("Privacy", destination: URL(string: "https://kouchd.com/privacy")!)
      }
      .font(.footnote.weight(.semibold))
    }
  }

  private func benefit(_ symbol: String, _ text: String) -> some View {
    Label {
      Text(text).font(.subheadline).foregroundStyle(Palette.ink)
    } icon: {
      Image(systemName: symbol).foregroundStyle(Palette.forest).frame(width: 28)
    }
  }

  private func callToAction(_ package: BillingPackage, trialDays: Int?) -> String {
    if billing.isConfirming { return "Confirming your plan…" }
    if billing.activeOperation == package.id { return "Starting purchase…" }
    if let trialDays { return "Start \(trialDays)-day free trial" }
    return package.isAnnual ? "Continue with Annual" : "Continue with Monthly"
  }

  static func renewalLine(_ package: BillingPackage, trialDays: Int?) -> String {
    if let trialDays {
      return "Free for \(trialDays) days, then \(package.priceWithPeriod). Renews until cancelled in Settings."
    }
    return "\(package.priceWithPeriod). Renews until cancelled in Settings."
  }
}

/// Real calendar dates, not "in 7 days". Shown only for a trial Kouchd has confirmed.
struct TrialTimeline: View {
  let days: Int
  let priceWithPeriod: String
  var start = Date.now

  private func date(_ day: Int) -> String {
    PlanCopy.trialEnd(days: day, from: start).formatted(date: .abbreviated, time: .omitted)
  }

  var body: some View {
    Card {
      Text("How your free trial works").font(.headline).foregroundStyle(Palette.ink)
      step("Today", "Plus unlocks")
      step(date(days - 2), "We remind you by email")
      step(date(days), "\(priceWithPeriod) starts. Cancel any time before.")
    }
  }

  private func step(_ when: String, _ what: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(when).font(.footnote.weight(.semibold)).foregroundStyle(Palette.forest)
      Text(what).font(.subheadline).foregroundStyle(Palette.ink)
    }
    .accessibilityElement(children: .combine)
  }
}

struct PlanOptionRow: View {
  let package: BillingPackage
  let trialDays: Int?
  let savingsPercent: Int?
  let selected: Bool
  let select: () -> Void

  var body: some View {
    Button(action: select) {
      HStack(alignment: .center, spacing: 14) {
        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
          .font(.title3)
          .foregroundStyle(selected ? Palette.forest : Palette.muted)
        VStack(alignment: .leading, spacing: 6) {
          Text(package.isAnnual ? "Annual" : "Monthly").font(.headline).foregroundStyle(Palette.ink)
          Text(package.priceWithPeriod).font(.subheadline).foregroundStyle(Palette.ink)
          if trialDays != nil || savingsPercent != nil {
            ViewThatFits(in: .horizontal) {
              HStack(spacing: 8) { badges }
              VStack(alignment: .leading, spacing: 6) { badges }
            }
          }
        }
        Spacer(minLength: 0)
      }
      .padding(16)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Palette.surface, in: RoundedRectangle(cornerRadius: 18))
      .overlay(
        RoundedRectangle(cornerRadius: 18)
          .strokeBorder(selected ? Palette.forest : Palette.line, lineWidth: selected ? 2 : 1)
      )
      .contentShape(RoundedRectangle(cornerRadius: 18))
    }
    .buttonStyle(.plain)
    .accessibilityElement(children: .combine)
    .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
  }

  @ViewBuilder private var badges: some View {
    if let trialDays { Pill(text: "\(trialDays) days free") }
    if let savingsPercent { Pill(text: "Save about \(savingsPercent)%") }
  }
}

// MARK: - P4: Plus is on

struct PlusWelcome: View {
  let store: KouchdStore
  let entry: PlusEntry
  let close: () -> Void

  private var summary: AccountSubscriptionSummary? { store.typedSubscriptionSummary }

  var body: some View {
    Page(title: "Plus is on", navigationTitle: "") {
      Card {
        Image(systemName: "checkmark.seal.fill").font(.title).foregroundStyle(Palette.forest)
        Text("You can now host up to \(PlanCopy.plusStays) stays and \(PlanCopy.plusGuests) guests across them.")
          .font(.body).foregroundStyle(Palette.ink)
        if summary?.isTrial == true {
          if let end = summary?.periodEnd {
            DataRow(title: "Free trial ends", detail: end.formatted(date: .abbreviated, time: .omitted))
          }
          TrialReminderToggle(store: store)
        }
      }
      if let action = entry.welcomeAction {
        PrimaryButton(title: action.title) {
          store.planRoute = action.route
          close()
        }
        Button("Done", action: close)
          .font(.subheadline.weight(.semibold))
          .frame(maxWidth: .infinity)
      } else {
        PrimaryButton(title: "Done", action: close)
      }
    }
  }
}

struct TrialReminderToggle: View {
  let store: KouchdStore
  @State private var busy = false

  var body: some View {
    Toggle("Remind me 2 days before", isOn: Binding(
      get: { store.typedSubscriptionSummary?.trialReminderEnabled ?? true },
      set: { enabled in
        busy = true
        Task {
          _ = await store.mutate("subscriptions:setTrialReminder", ["enabled": enabled])
          busy = false
        }
      }
    ))
    .font(.subheadline)
    .disabled(busy)
  }
}

// MARK: - "Plus is being set up"

private struct PlusSetupBannerModifier: ViewModifier {
  let tracker: PlusSetupTracker

  func body(content: Content) -> some View {
    // Above the content, not an inset: a safe-area inset ends up over the navigation bar.
    VStack(spacing: 0) {
      if tracker.state != .idle {
        banner
          .padding(14)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Palette.lime.ignoresSafeArea(edges: .top))
          .foregroundStyle(Palette.onLime)
          .font(.subheadline)
      }
      content.frame(maxHeight: .infinity)
    }
  }

  @ViewBuilder private var banner: some View {
    switch tracker.state {
    case .idle: EmptyView()
    case .settingUp:
      HStack(spacing: 10) {
        ProgressView().tint(Palette.onLime)
        Text(PlanCopy.settingUp)
      }
    case .stuck:
      VStack(alignment: .leading, spacing: 8) {
        Text(PlanCopy.notConfirmed)
        Text("You won't be charged again.").font(.footnote)
        HStack(spacing: 16) {
          Button("Retry") { tracker.retry() }
          Link("Contact support", destination: URL(string: "mailto:support@kouchd.com")!)
        }
        .font(.subheadline.weight(.semibold))
        .tint(Palette.onLime)
      }
    case .confirmed:
      HStack {
        Text("Plus is on.").fontWeight(.semibold)
        Spacer()
        Button("Dismiss") { tracker.dismissConfirmation() }
          .font(.subheadline.weight(.semibold))
          .tint(Palette.onLime)
      }
    }
  }
}

extension View {
  func plusSetupBanner(_ tracker: PlusSetupTracker) -> some View {
    modifier(PlusSetupBannerModifier(tracker: tracker))
  }
}

// MARK: - Guest spots (host only)

/// The host's total across stays. Tapping shows who holds each spot.
struct GuestSpotsRow: View {
  let usage: PlanUsage
  @State private var showing = false

  var body: some View {
    Button { showing = true } label: {
      HStack {
        Text(PlanCopy.guestSpotsLine(usage.guests))
          .font(.subheadline).foregroundStyle(Palette.ink)
          .multilineTextAlignment(.leading)
        Spacer(minLength: 8)
        Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Palette.muted)
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .sheet(isPresented: $showing) { GuestSpotsSheet(usage: usage) }
  }
}

struct GuestSpotsSheet: View {
  let usage: PlanUsage
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      Page(title: "Guest spots", navigationTitle: "") {
        Text(PlanCopy.guestSpotsLine(usage.guests)).font(.subheadline).foregroundStyle(Palette.muted)
        if usage.guestSpots.isEmpty {
          EmptyCard(title: "No guests yet", message: "Guests you invite appear here with the stay they're in.")
        } else {
          Card { GuestSpotsList(spots: usage.guestSpots) }
        }
      }
      .toolbar {
        ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
      }
    }
    .tint(Palette.forest)
    .presentationDetents([.medium, .large])
  }
}

struct GuestSpotsList: View {
  let spots: [PlanUsage.GuestSpot]

  var body: some View {
    ForEach(spots) { spot in
      VStack(alignment: .leading, spacing: 2) {
        Text(spot.guestName).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
        Text(spot.stayName).font(.footnote).foregroundStyle(Palette.muted)
        if spot.pendingAgreement {
          Text("Waiting on agreement — holds a spot").font(.footnote).foregroundStyle(Palette.muted)
        }
      }
      .accessibilityElement(children: .combine)
    }
  }
}

/// Someone couldn't join. iOS has no notification feed yet, so this is how the host finds out.
struct BlockedJoinCard: View {
  let store: KouchdStore
  let usage: PlanUsage
  let blocked: PlanUsage.BlockedJoin
  var purchasesEnabled = AppConfig.purchasesEnabled

  private var dateText: String {
    Date(timeIntervalSince1970: blocked.attemptedAt / 1000).formatted(date: .abbreviated, time: .omitted)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(usage.guests.isFull
           ? "\(blocked.guestName) tried to join — this stay is full"
           : "\(blocked.guestName) tried to join while this stay was full. There's room now, so the same invite will work.")
        .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
      Text("\(blocked.stayName) · \(dateText)").font(.footnote).foregroundStyle(Palette.muted)
      if usage.guests.isFull, usage.isPlus, let limit = usage.guests.limit {
        Text(PlanCopy.plusGuestCap(limit)).font(.footnote).foregroundStyle(Palette.muted)
      }
      VStack(alignment: .leading, spacing: 8) {
        if usage.isFree && usage.guests.isFull && purchasesEnabled {
          Button("Make room with Plus") { store.plusEntry = .guestLimit }
        }
        if usage.guests.isFull {
          Button("Manage guests") {
            if store.selectedStayID != blocked.stayId { store.selectStay(blocked.stayId) }
            store.planRoute = .hostControls
          }
        }
        Button("Dismiss") {
          Task { _ = await store.mutate("subscriptions:dismissBlockedJoin", ["blockedJoinId": blocked.id]) }
        }
      }
      .font(.footnote.weight(.semibold))
    }
    .padding(16)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Palette.lime.opacity(0.22), in: RoundedRectangle(cornerRadius: 18))
    .tint(Palette.forest)
  }
}
