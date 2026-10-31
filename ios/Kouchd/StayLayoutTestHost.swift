#if DEBUG
import SwiftUI

/// Renders the signed-in app from synthetic data, without Clerk, Convex, or a real
/// account, so layouts can be checked at any window size. Mutations do nothing here.
/// Profile & reminders needs a configured Clerk, so it can't be opened here.
/// This host and its launch flags do not exist in Release builds.
struct StayLayoutTestHost: View {
  enum Scenario: String { case host, guest, ended, empty }

  static var scenario: Scenario? {
    argument("--ui-test-stay-layout").flatMap(Scenario.init(rawValue:))
  }

  let scenario: Scenario
  @State private var store: KouchdStore
  @State private var navigator = ShellNavigator()

  init(scenario: Scenario) {
    self.scenario = scenario
    _store = State(initialValue: KouchdStore(seed: { Self.apply(scenario, to: $0) }))
  }

  private static func argument(_ name: String) -> String? {
    let arguments = ProcessInfo.processInfo.arguments
    guard let index = arguments.firstIndex(of: name), arguments.indices.contains(index + 1) else { return nil }
    return arguments[index + 1]
  }

  /// Simulates a narrower Split View or Stage Manager window.
  private var frameWidth: CGFloat? { Self.argument("--ui-test-frame-width").flatMap(Double.init).map { CGFloat($0) } }

  var body: some View {
    AuthenticatedShell(store: store, navigator: navigator)
      .transformEnvironment(\.horizontalSizeClass) { sizeClass in
        if let frameWidth { sizeClass = frameWidth < 600 ? .compact : .regular }
      }
      .frame(width: frameWidth)
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .dynamicTypeSize(ProcessInfo.processInfo.arguments.contains("--ui-test-accessibility-text") ? .accessibility3 : .large)
      .preferredColorScheme(ProcessInfo.processInfo.arguments.contains("--ui-test-dark") ? .dark : .light)
      .onAppear {
        openRequestedSection()
      }
  }

  private func openRequestedSection() {
    guard let section = Self.argument("--ui-test-section") else { return }
    switch section {
    case "ledger": navigator.select(.ledger)
    case "chores": navigator.select(.chores)
    case "stay": navigator.select(.stay)
    case "shopping": navigator.select(.tool(.shopping))
    case "checkins": navigator.select(.tool(.checkins))
    case "rewards": navigator.select(.tool(.rewards))
    case "schedule": navigator.select(.tool(.schedule))
    case "terms": navigator.select(.tool(.houseInfo))
    case "agreement": navigator.select(.tool(.agreement))
    case "more": navigator.selectTab(.more)
    default: break
    }
  }

  private static func value(_ json: String) -> Value {
    (try? JSONDecoder().decode(Value.self, from: Data(json.utf8))) ?? .null
  }

  private static func apply(_ scenario: Scenario, to store: KouchdStore) {
    let isHost = scenario == .host
    let viewerID = isHost ? "person-host" : "person-alex"
    store.viewer = value(#"{"id":"\#(viewerID)","name":"\#(isHost ? "Jordan Rivera" : "Alex Chen")"}"#)
    store.selectedStayID = "stay-maple"
    store.selectedGuestID = isHost ? "person-alex" : ""
    store.stays = value(#"""
    [{"stay":{"_id":"stay-maple","name":"Maple House","status":"active"}},
     {"stay":{"_id":"stay-birch","name":"Birch Street room","status":"active"}}]
    """#).items
    store.bundle = value(#"""
    {"stay":{"_id":"stay-maple","name":"Maple House","status":"\#(scenario == .ended ? "ended" : "active")","nextCheckInDate":"2026-11-08","timezone":"America/New_York",
      "houseInfo":{"wifiNetwork":"MapleGuest","streetAddress":"12 Example Lane","trashDay":"Tuesday night","parkingNotes":"Left side of the driveway"},
      "paymentOptions":[{"provider":"venmo","detail":"maple-house-example"},{"provider":"zelle","detail":"host@example.com"}]},
     "terms":{"_id":"terms-1","startDate":"2026-10-04","endDate":"2027-01-18","cadence":"weekly","rateCents":6000,"billingBasis":"continuous",
      "houseNotes":"Quiet after 10pm on weeknights. Shoes off at the door. Let the house know if you'll be away overnight."},
     "membership":{"role":"\#(isHost ? "host" : "guest")","acceptedTermsId":"terms-1"},
     "members":[{"membership":{"role":"host"},"person":{"id":"person-host","name":"Jordan Rivera"}},
      {"membership":{"role":"guest"},"person":{"id":"person-alex","name":"Alex Chen"}},
      {"membership":{"role":"guest"},"person":{"id":"person-sam","name":"Sam Okafor"}}]}
    """#)
    store.typedAgreement = store.bundle["terms"].decoded(AgreementRecord.self)
    store.announcements = value(#"[{"_id":"a1","title":"Plumber on Thursday","body":"Someone will be in the upstairs bathroom from 9 to 11."}]"#).items
    store.wallet = value(#"{"availablePoints":3,"dollarEquivalentCents":300,"settings":{"enabled":true,"coinName":"Maple points","centsPerPoint":100},"claims":[{"_id":"claim-1","title":"Deep cleaned the oven","status":"pending","points":2,"guestUserId":"person-alex"}]}"#)
    guard scenario != .empty else {
      store.ledgerSummary = value(#"{"chargesCents":0,"creditCents":0,"balanceCents":0,"pendingCount":0}"#)
      return
    }
    store.ledger = value(#"""
    [{"_id":"ob-1","title":"Week of Oct 19","dueDate":"2026-10-19","status":"paid","baseAmountCents":6000,"effectiveChargeCents":6000,"creditedCents":6000,"balanceCents":0,"type":"scheduled"},
     {"_id":"ob-2","title":"Week of Oct 26","dueDate":"2026-10-26","status":"partial","baseAmountCents":6000,"effectiveChargeCents":6500,"creditedCents":4000,"balanceCents":2500,"type":"scheduled","lateFeeCents":500},
     {"_id":"ob-3","title":"Week of Nov 2","dueDate":"2026-11-02","status":"open","baseAmountCents":6000,"effectiveChargeCents":6000,"creditedCents":0,"balanceCents":6000,"type":"scheduled"},
     {"_id":"ob-4","title":"Shared internet","dueDate":"2026-11-05","status":"open","baseAmountCents":2500,"effectiveChargeCents":2500,"creditedCents":0,"balanceCents":2500,"type":"adhoc"},
     {"_id":"ob-5","title":"Week of Nov 9","dueDate":"2026-11-09","status":"open","baseAmountCents":6000,"effectiveChargeCents":6000,"creditedCents":0,"balanceCents":6000,"type":"scheduled"}]
    """#).items
    store.typedLedger = Value.array(store.ledger).decoded([LedgerRecord].self) ?? []
    store.ledgerSummary = value(#"{"chargesCents":27000,"creditCents":10000,"balanceCents":17000,"pendingCount":2}"#)
    store.contributions = value(#"""
    [{"_id":"c-1","type":"payment","status":"pending","amountCents":4000,"date":"2026-10-28","note":"Maple House stay contribution · via Venmo","createdBy":"person-alex"},
     {"_id":"c-2","type":"groceries","status":"pending","amountCents":3275,"date":"2026-10-25","note":"Farmers market run","createdBy":"person-host"},
     {"_id":"c-3","type":"payment","status":"confirmed","amountCents":6000,"date":"2026-10-19","note":"Week of Oct 19","createdBy":"person-alex"}]
    """#).items
    store.chores = value(#"""
    [{"_id":"ch-1","title":"Take out recycling","dueDate":"2026-10-31","assignee":"guest","assigneeUserId":"person-alex","completed":false,"completedAt":"","voidedAt":"","createdBy":"person-host"},
     {"_id":"ch-2","title":"Kitchen reset","note":"Counters, sink, and the stovetop.","dueDate":"2026-11-01","assignee":"shared","repeatCadence":"daily","completed":false,"completedAt":"","voidedAt":"","createdBy":"person-host"},
     {"_id":"ch-3","title":"Mow the front yard","dueDate":"2026-11-02","assignee":"host","completed":false,"completedAt":"","voidedAt":"","createdBy":"person-host"},
     {"_id":"ch-4","title":"Water the plants","dueDate":"2026-10-28","assignee":"shared","completed":true,"completedAt":"2026-10-28","voidedAt":"","createdBy":"person-alex"}]
    """#).items
    store.activity = value(#"""
    [{"_id":"e-1","kind":"contribution","action":"created","detail":"Alex added a $40.00 contribution for review."},
     {"_id":"e-2","kind":"chore","action":"completed","detail":"Alex finished Water the plants."},
     {"_id":"e-3","kind":"shopping","action":"created","detail":"Jordan added dish soap to the shopping list."},
     {"_id":"e-4","kind":"terms","action":"accepted","detail":"Alex accepted the current agreement."}]
    """#).items
    store.shopping = value(#"""
    [{"_id":"s-1","title":"Dish soap","quantity":"1","visibility":"shared","createdBy":"person-host","checkedAt":""},
     {"_id":"s-2","title":"Paper towels","quantity":"2","note":"The big rolls","visibility":"shared","createdBy":"person-alex","checkedAt":""},
     {"_id":"s-3","title":"Oat milk","quantity":"1","visibility":"personal","createdBy":"\#(viewerID)","checkedAt":""},
     {"_id":"s-4","title":"Coffee filters","quantity":"1","visibility":"shared","createdBy":"person-host","checkedAt":"2026-10-27"}]
    """#).items
    store.checkins = value(#"""
    [{"_id":"k-1","topic":"Thanksgiving week","note":"Are you around, or should we plan for an empty house?","guestName":"Alex Chen","checkInDate":"2026-11-08","status":"open","responses":[{"body":"I'll be away from the 26th to the 29th."}]},
     {"_id":"k-2","topic":"Laundry days","note":"Can we split weekdays and weekends?","guestName":"Alex Chen","checkInDate":"2026-10-20","status":"resolved","responses":[]}]
    """#).items
    store.schedule = value(#"[{"_id":"r-1","guestName":"Alex Chen","status":"pending","requestedCadence":"daily"},{"_id":"r-2","guestName":"Sam Okafor","status":"approved","requestedCadence":"weekly"}]"#).items
    store.rules = value(#"[{"_id":"rule-1","title":"Deep clean","pointsAwarded":2,"isActive":true}]"#).items
  }
}
#endif
