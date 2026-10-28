import Observation
import RevenueCat
import SwiftUI

/// Starter limits: one active stay and one active guest across the host's billing account.
/// Kouchd Plus raises both to three; pending agreement review still reserves capacity.
/// Enforcement stays off until rollout verification, so flip `enforcesStarterLimits` only then.
/// Limits also wait for billing to answer, so a billing outage never locks a host out.
@MainActor @Observable
final class PlusAccess {
  static let shared = PlusAccess()
  static let starterStays = 1
  static let starterGuests = 1
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

  var limitsApply: Bool {
    if Self.forcedForTesting { return !hasPlus }
    return Self.enforcesStarterLimits && isKnown && !hasPlus
  }

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

  func reachedStayLimit(_ store: KouchdStore) -> Bool {
    guard limitsApply else { return false }
    let hosted = store.stays.filter {
      $0["membership"]["role"].text == "host" && $0["stay"]["status"].text != "ended"
    }
    return hosted.count >= Self.starterStays
  }

  func reachedGuestLimit(_ store: KouchdStore) -> Bool {
    guard limitsApply else { return false }
    let closed: Set<String> = ["removed", "left", "ended", "declined"]
    let active = store.guests.filter { !closed.contains($0["membership"]["status"].text) }
    return active.count >= Self.starterGuests
  }
}

/// Shown when a host on the free plan reaches a Starter limit.
struct PlusLimitContent: View {
  let title: String
  let message: String
  var onNotNow: (() -> Void)?

  var body: some View {
    Page(title: title) {
      PlusBadge(text: "Kouchd Plus")
      Text(message).foregroundStyle(Palette.ink)
      NavigationLink("See Kouchd Plus") { KouchdPlusScreen() }
        .buttonStyle(.borderedProminent)
        .tint(Palette.forest)
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
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      PlusLimitContent(title: title, message: message) { dismiss() }
        .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
    }
  }
}
