import Observation
import RevenueCat
import SwiftUI

/// Starter limits: one active stay and one active guest across the host's billing account.
/// Kouchd Plus allows three stays and five guests; the guest limit is one pool across all stays.
/// Pending agreement review still reserves a spot.
/// Enforcement stays off until rollout verification, so flip `enforcesStarterLimits` only then.
/// Limits also wait for billing to answer, so a billing outage never locks a host out.
@MainActor @Observable
final class PlusAccess {
  static let shared = PlusAccess()
  static let starterStays = 1
  static let starterGuests = 1
  static let plusStays = 3
  static let plusGuests = 5
  static let enforcesStarterLimits = false

  /// Debug builds can force enforcement to check the limit screens: `--enforce-plus-limits`.
  private static var forcedForTesting: Bool {
#if DEBUG
    ProcessInfo.processInfo.arguments.contains("--enforce-plus-limits")
#else
    false
#endif
  }

  private(set) var hasPlus = false
  private(set) var isKnown = false
  private var started = false

  /// What a host sees when an add action is over the limit of their plan.
  enum Limit: Equatable {
    case none
    case upsell  // on Free: explain Plus
    case cap  // on Plus: nothing to sell, just explain
  }

  private var enforcing: Bool {
    Self.forcedForTesting || (Self.enforcesStarterLimits && isKnown)
  }

  var limitsApply: Bool { enforcing && !hasPlus }

  func start() async {
    guard AppConfig.revenueCatIsConfigured, !started else { return }
    started = true
    if let info = try? await Purchases.shared.customerInfo() { update(info) }
    for await info in Purchases.shared.customerInfoStream { update(info) }
  }

  private func update(_ info: CustomerInfo) {
    hasPlus = info.entitlements.active[KouchdPlusPurchaseModel.entitlementID] != nil
    isKnown = true
  }

  private static let closedMembership: Set<String> = ["removed", "left", "ended", "declined"]

  func activeStays(_ store: KouchdStore) -> Int {
    store.stays.filter {
      $0["membership"]["role"].text == "host" && $0["stay"]["status"].text != "ended"
    }.count
  }

  func activeGuests(_ store: KouchdStore) -> Int {
    store.guests.filter { !Self.closedMembership.contains($0["membership"]["status"].text) }.count
  }

  var guestSpots: Int { hasPlus ? Self.plusGuests : Self.starterGuests }

  func stayLimit(_ store: KouchdStore) -> Limit {
    guard enforcing else { return .none }
    if hasPlus { return activeStays(store) >= Self.plusStays ? .cap : .none }
    return activeStays(store) >= Self.starterStays ? .upsell : .none
  }

  func guestLimit(_ store: KouchdStore) -> Limit {
    guard enforcing else { return .none }
    if hasPlus { return activeGuests(store) >= Self.plusGuests ? .cap : .none }
    return activeGuests(store) >= Self.starterGuests ? .upsell : .none
  }

  /// "1 of 1 guest spots used across your stays", shown to hosts while limits are enforced.
  func guestSpotsLine(_ store: KouchdStore) -> String? {
    guard enforcing else { return nil }
    return "\(activeGuests(store)) of \(guestSpots) guest spots used across your stays"
  }
}

/// Shown when a host on the free plan reaches a Starter limit.
struct PlusLimitContent: View {
  let title: String
  let message: String
  var showsUpsell = true
  var onNotNow: (() -> Void)?

  var body: some View {
    Page(title: title) {
      if showsUpsell { PlusBadge(text: "Kouchd Plus") }
      Text(message).foregroundStyle(Palette.ink)
      if showsUpsell {
        NavigationLink("See Kouchd Plus") { KouchdPlusScreen() }
          .buttonStyle(.borderedProminent)
          .tint(Palette.forest)
      }
      if let onNotNow {
        Button("Not now", action: onNotNow)
          .accessibilityIdentifier("plus-limit.not-now")
      }
    }
  }
}

/// The same content as a sheet, for actions that are buttons rather than rows.
struct PlusLimitSheet: View {
  let title: String
  let message: String
  var showsUpsell = true
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      PlusLimitContent(title: title, message: message, showsUpsell: showsUpsell) { dismiss() }
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
    }
  }
}
