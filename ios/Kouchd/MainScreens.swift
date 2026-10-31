import ClerkKit
import ClerkKitUI
import ConvexMobile
import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI
import UIKit

struct HomeScreen: View {
  let store: KouchdStore
  let openLedger: () -> Void
  let openChores: () -> Void
  let openMore: (KouchdRoute?) -> Void
  let openActivity: (String, String) -> Void
  @Environment(\.horizontalSizeClass) private var sizeClass
  private var usesSidebar: Bool { sizeClass == .regular }
  private var nextContribution: LedgerRecord? { store.typedLedger.filter { $0.balanceCents > 0 }.min { $0.dueDate < $1.dueDate } }
  private var nextChore: Value? {
    store.chores.first(where: {  $0["completedAt"].text.isEmpty && $0["voidedAt"].text.isEmpty && $0["assignee"].text != "host" && ($0["assigneeUserId"].text.isEmpty || $0["assigneeUserId"].text == store.viewer["id"].text) })
  }
  private var needsAgreementReview: Bool {
    store.bundle["membership"]["acceptedTermsId"].text != store.bundle["terms"]["_id"].text &&
      !store.isHost && !store.isEnded
  }

  var body: some View {
    ResponsiveScroll(width: .wide, padding: 24) {
      ColumnsReader { columns in
        if columns > 1 { wideDashboard } else { singleColumn }
      }
    }
    .background(Palette.cream.ignoresSafeArea())
    .kouchdEntrance()
    .kouchdNavigationBar()
    .toolbar {
      if !usesSidebar {
        ToolbarItem(placement: .topBarLeading) {
          Menu {
            ForEach(store.stays.indices, id: \.self) { index in
              let stay = store.stays[index]["stay"]
              Button(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text) {
                store.selectStay(stay["_id"].text)
              }
            }
          } label: {
            HStack(spacing: 5) {
              Text(store.stayName).font(.headline)
              Image(systemName: "chevron.down").font(.caption2.bold())
            }
            .foregroundStyle(Palette.forest)
          }
          .accessibilityLabel("Switch stay, current stay: \(store.stayName)")
        }
      }
      ToolbarItem(placement: .topBarTrailing) {
        Button { openMore(.settings) } label: {
          Text(String(store.viewer["name"].text.prefix(2)).uppercased())
            .font(.caption2.bold())
            .foregroundStyle(Palette.onLime)
            .frame(width: 32, height: 32)
            .background(Palette.lime, in: Circle())
        }
        .accessibilityLabel("Settings, account: \(store.viewer["name"].text)")
      }
    }
  }

  private var singleColumn: some View {
    VStack(alignment: .leading, spacing: 24) {
      header
      if store.isHost {
        hostHero
        yourStays
      } else {
        guestHero
        nextChoreCard
        expectationsCard
      }
      if store.stays.count > 1 && !usesSidebar {
        Picker("Stay", selection: Binding(
          get: { store.selectedStayID },
          set: { store.selectStay($0) }
        )) {
          ForEach(store.stays.indices, id: \.self) { index in
            let item = store.stays[index]
            Text(item["stay"]["name"].text.isEmpty ? "Shared stay" : item["stay"]["name"].text)
              .tag(item["stay"]["_id"].text)
          }
        }.pickerStyle(.menu)
      }
      if store.isHost && store.guests.count > 1 {
        GuestPicker(store: store)
      }
      agreementCard
      remainingCard
      statTiles
      noticeCard
      if !usesSidebar { moreToolsCard }
      activityCard(limit: 3)
    }
  }

  private var wideDashboard: some View {
    VStack(alignment: .leading, spacing: 24) {
      header
      TwoColumnLayout(spacing: 24) {
        if store.isHost {
          hostHero
          yourStays
        } else {
          guestHero
          agreementCard
          nextChoreCard
          expectationsCard
        }
      } trailing: {
        if store.isHost && store.guests.count > 1 {
          GuestPicker(store: store)
        }
        remainingCard
        statTiles
        noticeCard
        activityCard(limit: 5)
      }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(store.isHost ? "A little room, well shared." : "Make yourself at home.")
        .font(Palette.heading).foregroundStyle(Palette.forest)
        .accessibilityAddTraits(.isHeader)
      Text(store.isHost
           ? "Welcome back, \(store.viewer["name"].text)."
           : "Your stay with \(store.members.first(where: { $0["membership"]["role"].text == "host" })?["person"]["name"].text ?? "your host") · \(store.bundle["terms"]["startDate"].text) – \(store.bundle["terms"]["endDate"].text)")
        .font(.subheadline).foregroundStyle(Palette.muted)
    }
  }

  private var hostHero: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text(store.stayName.uppercased()).font(.caption.bold())
        .foregroundStyle(Palette.lime)
      Text("\(store.stays.count) stays. One welcoming home.")
        .font(Palette.section).foregroundStyle(.white)
      Text("Next shared check-in · \(store.bundle["stay"]["nextCheckInDate"].text.isEmpty ? "Set a date" : store.bundle["stay"]["nextCheckInDate"].text)")
        .font(.subheadline).foregroundStyle(.white.opacity(0.8))
    }
    .padding(24).frame(maxWidth: .infinity, alignment: .leading)
    .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 24))
  }

  @ViewBuilder private var yourStays: some View {
    Text("Your stays").font(Palette.section)
    ForEach(store.stays.indices, id: \.self) { index in
      let stay = store.stays[index]["stay"]
      NavigationLink(value: KouchdRoute.stayDetails(stay["_id"].text)) {
        VStack(alignment: .leading, spacing: 14) {
          Text(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text)
            .font(.title3.bold()).foregroundStyle(Palette.forest)
          Text(stay["status"].text.capitalized)
            .font(.subheadline).foregroundStyle(Palette.muted)
          // iOS has no notification feed yet, so this is how a host hears about it.
          if let blocked = store.planUsage?.blockedJoins(inStay: stay["_id"].text).count, blocked > 0 {
            Pill(text: "\(blocked) tried to join")
          }
          Rectangle().fill(Palette.line).frame(height: 1)
          Text("Open household details").font(.subheadline).foregroundStyle(Palette.forest)
        }
        .padding(22).frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.line))
      }
      .buttonStyle(.plain)
      .hoverEffect(.highlight)
    }
  }

  private var guestHero: some View {
    VStack(alignment: .leading, spacing: 18) {
      Text("NEXT CONTRIBUTION").font(.caption.bold()).foregroundStyle(Palette.lime)
      Text(nextContribution.map { Display.money($0.balanceCents) } ?? "All caught up")
        .font(.largeTitle.bold()).foregroundStyle(.white)
      Text(nextContribution.map { "Due \($0.dueDate)" } ?? "No contribution is currently due.")
        .font(.subheadline).foregroundStyle(.white.opacity(0.85))
      Button(action: openLedger) {
        Text("View contributions")
          .font(.headline).foregroundStyle(Palette.ink)
          .frame(maxWidth: .infinity).padding(14)
          .background(Palette.surface, in: RoundedRectangle(cornerRadius: 14))
      }
      .hoverEffect(.highlight)
    }
    .padding(24).frame(maxWidth: .infinity, alignment: .leading)
    .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 24))
  }

  @ViewBuilder private var nextChoreCard: some View {
    if let next = nextChore {
      Card {
        Text(next.title).font(.headline)
        Text("Your turn · \(next["dueDate"].text)")
          .font(.subheadline).foregroundStyle(Palette.muted)
      }
    }
  }

  private var expectationsCard: some View {
    Card {
      Text("Your shared expectations").font(.headline)
      Text(store.bundle["terms"]["houseNotes"].text)
        .font(.subheadline).foregroundStyle(Palette.muted)
    }
  }

  @ViewBuilder private var agreementCard: some View {
    if needsAgreementReview {
      Card {
        Text("Your agreement needs review").font(.headline)
        Text("Read the current terms before recording new activity.")
        NavigationLink("Review agreement", value: KouchdRoute.agreement)
      }
    }
  }

  private var remainingCard: some View {
    Card {
      Text("Remaining scheduled contributions").font(.subheadline).foregroundStyle(Palette.muted)
      Text(Display.money(store.typedLedger.reduce(0) { $0 + $1.balanceCents }))
        .font(.system(size: 38, weight: .bold, design: .rounded))
        .foregroundStyle(Palette.forest)
      Button("Open ledger", action: openLedger)
    }
  }

  private var statTiles: some View {
    HStack(spacing: 12) {
      let openChoresTile = StatCard(number: "\(store.chores.filter {  $0["completedAt"].text.isEmpty && $0["voidedAt"].text.isEmpty }.count)", label: "Open chores")
      if usesSidebar {
        Button(action: openChores) { openChoresTile }.hoverEffect(.highlight)
      } else {
        NavigationLink(value: KouchdRoute.chores) { openChoresTile }
      }
      Button { openMore(.rewards) } label: {
        StatCard(number: "\(store.wallet["availablePoints"].int)", label: "Reward points")
      }
      .hoverEffect(.highlight)
    }
  }

  @ViewBuilder private var noticeCard: some View {
    if let notice = store.announcements.first {
      Card {
        Pill(text: "Household note")
        Text(notice.title).font(.headline)
        Text(notice["body"].text).font(.subheadline)
      }
    }
  }

  private var moreToolsCard: some View {
    Card {
      Text("More stay tools").font(.headline)
      Text("Find agreements, schedule requests, rewards, and account options together.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      Button { openMore(nil) } label: {
        Label("Browse all tools", systemImage: "ellipsis.circle")
          .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.forest)
      }
    }
  }

  @ViewBuilder private func activityCard(limit: Int) -> some View {
    if !store.activity.isEmpty {
      Card {
        Text("Recent activity").font(.headline)
        ForEach(Array(store.activity.prefix(limit)), id: \.id) { item in
          Button { openActivity(item["kind"].text, item["action"].text) } label: {
            HStack(alignment: .top, spacing: 10) {
              Text(item["detail"].text).font(.subheadline).foregroundStyle(Palette.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
              Image(systemName: "arrow.up.right").font(.caption.bold()).foregroundStyle(Palette.forest)
            }
            .padding(.vertical, 7).contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .hoverEffect(.highlight)
          .accessibilityHint("Opens the related section")
        }
      }
    }
  }
}

private struct StatCard: View {
  let number: String
  let label: String
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(number).font(.title.bold())
      Text(label).font(.caption)
    }
    .foregroundStyle(Palette.brandForest)
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(18)
    .background(Palette.lime, in: RoundedRectangle(cornerRadius: 20))
  }
}

struct GuestPicker: View {
  let store: KouchdStore
  var body: some View {
    Picker("Guest", selection: Binding(
      get: { store.selectedGuestID },
      set: { store.selectGuest($0) }
    )) {
      Text("Select a guest").tag("")
      ForEach(store.guests.indices, id: \.self) { index in
        let guest = store.guests[index]
        Text(guest["person"]["name"].text).tag(guest["person"]["id"].text)
      }
    }
    .pickerStyle(.menu)
  }
}

/// Totals from `obligations:summary`, matching the web Ledger's summary strip.
struct LedgerSummaryCard: View {
  let summary: Value

  static func rows(_ summary: Value) -> [(title: String, detail: String)] {
    var rows: [(title: String, detail: String)] = [
      ("Total charges", Display.money(summary["chargesCents"].int)),
      ("Confirmed credit", Display.money(summary["creditCents"].int)),
      ("Remaining scheduled", Display.money(summary["balanceCents"].int)),
    ]
    let pending = summary["pendingCount"].int
    if pending > 0 { rows.append(("Awaiting confirmation", "\(pending) \(pending == 1 ? "entry" : "entries")")) }
    return rows
  }

  var body: some View {
    Card {
      Text("Summary").font(.headline)
      ForEach(Self.rows(summary), id: \.title) { row in DataRow(title: row.title, detail: row.detail) }
      Text("Scheduled totals include upcoming periods. Each row below shows when its contribution is due.")
        .font(.caption).foregroundStyle(Palette.muted)
    }
  }
}

struct LedgerScreen: View {
  let store: KouchdStore
  @State private var showingContribution = false
  var body: some View {
    Page(title: "Ledger", width: .wide) {
      LedgerContent(store: store, showingContribution: $showingContribution)
    }
    .toolbar {
      if !store.isEnded {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingContribution = true
          } label: {
            Label("Add contribution", systemImage: "plus")
          }
          .keyboardShortcut("n")
        }
      }
    }
    .sheet(isPresented: $showingContribution) { ContributionForm(store: store) }
  }
}

private struct LedgerContent: View {
  let store: KouchdStore
  @Binding var showingContribution: Bool
  @Environment(\.kouchdContentWidth) private var contentWidth
  @Environment(\.dynamicTypeSize) private var typeSize

  var body: some View {
    if contentWidth >= KouchdLayout.ledgerSplitWidth && !typeSize.isAccessibilitySize {
      LedgerSplitContent(store: store, showingContribution: $showingContribution)
    } else {
      stacked
    }
  }

  @ViewBuilder private var stacked: some View {
    if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
    Card {
      Text("Outside contributions").font(.headline)
      Text("Kouchd records contributions and asks the other person to confirm. Money moves outside the app.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      if !store.isEnded {
        PrimaryButton(title: "Add contribution") { showingContribution = true }
      }
    }
    if case .object = store.ledgerSummary {
      LedgerSummaryCard(summary: store.ledgerSummary)
    }
    if store.ledger.isEmpty {
      EmptyCard(title: "Nothing due yet", message: "Agreed charges will appear here.")
    } else {
      ForEach(store.ledger, id: \.id) { item in
        LedgerChargeCard(store: store, item: item)
      }
    }
    Text("Contribution records").font(.title2.bold())
    if store.contributions.isEmpty {
      EmptyCard(title: "No records yet", message: "Record a payment made outside Kouchd, groceries, supplies, or house work.")
    }
    ForEach(store.contributions, id: \.id) { item in
      ContributionRecordCard(store: store, item: item)
    }
  }
}

/// Wide windows: totals on top, a scannable list, and the selected entry beside it.
private struct LedgerSplitContent: View {
  enum Segment: String, CaseIterable { case charges = "Charges", records = "Contribution records" }

  let store: KouchdStore
  @Binding var showingContribution: Bool
  @State private var segment: Segment = .charges
  @State private var selectedID: [Segment: String] = [:]

  private var rows: [Value] { segment == .charges ? store.ledger : store.contributions }
  private var selected: Value? {
    rows.first { $0.id == selectedID[segment] } ?? rows.first
  }

  var body: some View {
    if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
    if case .object = store.ledgerSummary {
      HStack(alignment: .top, spacing: 12) {
        ForEach(LedgerSummaryCard.rows(store.ledgerSummary), id: \.title) { row in
          VStack(alignment: .leading, spacing: 6) {
            Text(row.detail).font(.title3.bold()).foregroundStyle(Palette.forest)
            Text(row.title).font(.caption).foregroundStyle(Palette.muted)
          }
          .padding(16)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
          .background(Palette.surface, in: RoundedRectangle(cornerRadius: 18))
          .accessibilityElement(children: .combine)
        }
      }
      .fixedSize(horizontal: false, vertical: true)
    }
    HStack(spacing: 16) {
      Text("Kouchd records contributions and asks the other person to confirm. Money moves outside the app. Scheduled totals include upcoming periods.")
        .font(.footnote).foregroundStyle(Palette.muted)
        .frame(maxWidth: .infinity, alignment: .leading)
      if !store.isEnded {
        PrimaryButton(title: "Add contribution") { showingContribution = true }
          .frame(maxWidth: 240)
      }
    }
    Picker("Show", selection: $segment) {
      ForEach(Segment.allCases, id: \.self) { Text($0.rawValue).tag($0) }
    }
    .pickerStyle(.segmented)
    .frame(maxWidth: 420)
    if rows.isEmpty {
      if segment == .charges {
        EmptyCard(title: "Nothing due yet", message: "Agreed charges will appear here.")
      } else {
        EmptyCard(title: "No records yet", message: "Record a payment made outside Kouchd, groceries, supplies, or house work.")
      }
    } else {
      HStack(alignment: .top, spacing: 20) {
        rowList.frame(maxWidth: .infinity)
        detail.frame(width: 320)
      }
      .environment(\.kouchdContentWidth, 0)
    }
  }

  private var rowList: some View {
    VStack(spacing: 0) {
      ForEach(Array(rows.enumerated()), id: \.element.id) { index, item in
        if index > 0 { Divider().padding(.horizontal, 16) }
        Button { selectedID[segment] = item.id } label: { rowLabel(item) }
          .buttonStyle(.plain)
          .hoverEffect(.highlight)
          .accessibilityAddTraits(selected?.id == item.id ? .isSelected : [])
      }
    }
    .padding(8)
    .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
    .focusable()
    .focusEffectDisabled()
    .onKeyPress(keys: [.upArrow, .downArrow]) { press in
      guard let current = rows.firstIndex(where: { $0.id == selected?.id }) else { return .ignored }
      let next = press.key == .upArrow ? current - 1 : current + 1
      guard rows.indices.contains(next) else { return .ignored }
      selectedID[segment] = rows[next].id
      return .handled
    }
  }

  private func rowLabel(_ item: Value) -> some View {
    let isCharge = segment == .charges
    let title = isCharge
      ? (item["title"].text.isEmpty ? "Stay contribution" : item["title"].text)
      : item["type"].text.replacingOccurrences(of: "_", with: " ").capitalized
    let date = isCharge ? "Due \(item["dueDate"].text)" : item["date"].text
    let amount = !isCharge ? Display.money(item["amountCents"].int)
      : item["balanceCents"].int > 0 ? "\(Display.money(item["balanceCents"].int)) left" : Display.money(item["effectiveChargeCents"].int)
    return HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 3) {
        Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
        Text(date).font(.caption).foregroundStyle(Palette.muted)
      }
      Spacer(minLength: 8)
      Text(amount).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.ink)
      Pill(text: item["status"].text)
    }
    .padding(.horizontal, 14).padding(.vertical, 12)
    .background(selected?.id == item.id ? Palette.lime.opacity(0.3) : .clear, in: RoundedRectangle(cornerRadius: 14))
    .contentShape(Rectangle())
    .accessibilityElement(children: .combine)
  }

  @ViewBuilder private var detail: some View {
    if let selected {
      if segment == .charges {
        LedgerChargeCard(store: store, item: selected)
      } else {
        ContributionRecordCard(store: store, item: selected)
      }
    }
  }
}

private struct LedgerChargeCard: View {
  let store: KouchdStore
  let item: Value

  var body: some View {
    Card {
      HStack {
        Text(item["title"].text.isEmpty ? "Stay contribution" : item["title"].text)
          .font(.headline)
        Spacer()
        Pill(text: item["status"].text)
      }
      DataRow(title: "Due", detail: item["dueDate"].text)
      DataRow(title: "Charge", detail: Display.money(item["effectiveChargeCents"].int))
      DataRow(title: "Confirmed credit", detail: Display.money(item["creditedCents"].int))
      DataRow(title: "Balance", detail: Display.money(item["balanceCents"].int))
      if store.isHost && item["type"].text == "adhoc" && item["status"].text != "voided" {
        VoidRecordButton(store: store, function: "obligations:voidAdhocCharge",
                         recordKey: "obligationId", recordID: item.id)
      }
      if store.isHost && !store.isEnded && item["lateFeeCents"].int > 0 && !item["lateFeeWaived"].flag {
        Button("Waive late fee") {
          Task { _ = await store.mutate("obligations:waiveLateFee", ["obligationId": item.id]) }
        }
      }
    }
  }
}

private struct ContributionRecordCard: View {
  let store: KouchdStore
  let item: Value

  var body: some View {
    Card {
      HStack {
        Text(item["type"].text.replacingOccurrences(of: "_", with: " ").capitalized).font(.headline)
        Spacer()
        Pill(text: item["status"].text)
      }
      DataRow(title: "Amount", detail: Display.money(item["amountCents"].int))
      DataRow(title: "Date", detail: item["date"].text)
      if !item["note"].text.isEmpty { Text(item["note"].text).font(.subheadline) }
      if !store.isEnded && item["status"].text == "pending" && item["createdBy"].text != store.viewer["id"].text {
        HStack {
          Button("Confirm") {
            Task { _ = await store.mutate("contributions:confirm", ["contributionId": item.id]) }
          }
          Button("Dispute") {
            Task { _ = await store.mutate("contributions:dispute", ["contributionId": item.id]) }
          }.tint(.red)
        }.buttonStyle(.bordered)
      }
      if item["status"].text != "voided" &&
         (store.isHost || item["createdBy"].text == store.viewer["id"].text) {
        VoidRecordButton(store: store, function: "contributions:voidContribution",
                         recordKey: "contributionId", recordID: item.id)
      }
      if item["status"].text == "pending" && item["createdBy"].text == store.viewer["id"].text {
        Text("Waiting for the other person to confirm.")
          .font(.caption).foregroundStyle(Palette.muted)
      }
    }
  }
}

struct ContributionForm: View {
  enum Phase {
    case selectAndRoute
    case outboundConfirmation
    case saving
    case saved
  }

  private static let casualSteps = [
    "Writing down your note for the house...",
    "Adding your contribution to the shared Ledger...",
    "Marking it for confirmation..."
  ]

  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @Environment(\.openURL) private var openURL

  @State private var phase: Phase = .selectAndRoute
  @State private var type = "payment"
  @State private var selectedChannel: P2PChannel = .venmo
  @State private var amount = ""
  @State private var note = ""
  @State private var countsTowardBalance = true
  @State private var customHandle = ""
  @State private var showQRCode = false
  @State private var copiedZelle = false

  // Rewards offset state
  @State private var applyRewards = false
  @State private var pointsToRedeem = 0

  @State private var stepIndex = 0
  @State private var progress: Double = 0
  @State private var savedAt = ""
  @State private var errorMessage = ""

  init(store: KouchdStore) {
    self.store = store
  }

  #if DEBUG
  /// Opens the form on a given phase for the Debug test host.
  init(store: KouchdStore, phase: Phase, savedAt: String) {
    self.store = store
    _phase = State(initialValue: phase)
    _savedAt = State(initialValue: savedAt)
  }
  #endif

  private var availablePoints: Int {
    store.wallet["availablePoints"].int
  }

  private var centsPerPoint: Int {
    let cpp = store.wallet["settings"]["centsPerPoint"].int
    return cpp > 0 ? cpp : 100
  }

  private var coinName: String {
    let name = store.wallet["settings"]["coinName"].text
    return name.isEmpty ? "Coins" : name
  }

  private var canApplyRewards: Bool {
    !store.isHost &&
      store.wallet["settings"]["enabled"].flag &&
      availablePoints > 0 &&
      type == "payment"
  }

  private var configuredHandleForChannel: String {
    let items = store.bundle["stay"]["paymentOptions"].items
    if let match = items.first(where: { $0["provider"].text == selectedChannel.rawValue }) {
      return match["detail"].text
    }
    if selectedChannel == .cash {
      return "Hand directly to your host or leave in the agreed spot"
    }
    return ""
  }

  /// The real handle to route to, or nil until the host's handle is known.
  private var resolvedHandle: String? {
    P2PRouting.resolvedHandle(channel: selectedChannel, configured: configuredHandleForChannel, entered: customHandle)
  }

  private var activeRawHandle: String {
    resolvedHandle ?? ""
  }

  private var otherPerson: String {
    store.isHost ? "your guest" : "your host"
  }

  /// What goes on the Ledger as a pending contribution. Redeemed coins are a separate, already confirmed credit.
  private var pendingRecordCents: Int {
    type == "payment" ? rewardOffset.netPayableCents : rewardOffset.grossAmountCents
  }

  private var effectiveMemo: String {
    let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? "\(store.stayName) stay contribution" : trimmed
  }

  private var rewardOffset: P2PRewardOffset {
    P2PRouting.calculateRewardsOffset(
      amountDollars: amount,
      pointsToApply: canApplyRewards && applyRewards ? pointsToRedeem : 0,
      availablePoints: availablePoints,
      centsPerPoint: centsPerPoint
    )
  }

  private var isCoveredEntirelyByRewards: Bool {
    canApplyRewards &&
      applyRewards &&
      rewardOffset.grossAmountCents > 0 &&
      rewardOffset.netPayableCents == 0
  }

  private var compiledRouteURI: String {
    P2PRouting.buildURI(
      channel: selectedChannel,
      handle: activeRawHandle,
      amountDollars: rewardOffset.netPayableFormatted,
      memo: effectiveMemo
    )
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          // Header summary card
          VStack(spacing: 10) {
            HStack {
              Spacer()
              Button {
                showQRCode.toggle()
              } label: {
                Label(showQRCode ? "App link" : "Level-H QR", systemImage: showQRCode ? "iphone" : "qrcode")
                  .font(.caption2.bold())
                  .foregroundStyle(Palette.brandForest)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 4)
                  .background(Palette.lime, in: Capsule())
              }
            }

            Text("$\(rewardOffset.netPayableFormatted)")
              .font(.system(size: 38, weight: .heavy, design: .rounded))
              .foregroundStyle(.white)

            if rewardOffset.pointsApplied > 0 {
              Text("Using \(rewardOffset.pointsApplied) \(coinName) (−\(Display.money(rewardOffset.rewardCreditCents)))")
                .font(.caption.bold())
                .foregroundStyle(Palette.lime)
            }

            Text(effectiveMemo)
              .font(.footnote.weight(.semibold))
              .foregroundStyle(.white.opacity(0.9))
              .lineLimit(1)
          }
          .padding(20)
          .frame(maxWidth: .infinity)
          .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 24))

          if !errorMessage.isEmpty {
            Text(errorMessage)
              .font(.footnote.weight(.semibold))
              .foregroundStyle(.red)
              .padding(12)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
          }

          switch phase {
          case .selectAndRoute:
            selectAndRouteView
          case .outboundConfirmation:
            outboundConfirmationView
          case .saving:
            savingView
          case .saved:
            savedView
          }
        }
        .padding(20)
      }
      .background(Palette.cream.ignoresSafeArea())
      .navigationTitle("Add contribution")
      .kouchdNavigationBar()
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") { dismiss() }
        }
      }
      .onAppear {
        if amount.isEmpty {
          let dueCents = store.ledger.first(where: { $0["balanceCents"].int > 0 })?["balanceCents"].int
            ?? store.bundle["terms"]["rateCents"].int
          let initialCents = dueCents > 0 ? dueCents : 4500
          amount = String(format: "%.2f", Double(initialCents) / 100.0)
        }
        if pointsToRedeem == 0 && availablePoints > 0 {
          pointsToRedeem = availablePoints
        }
      }
    }
    .environment(\.kouchdContentWidth, 0)
  }

  @ViewBuilder
  private var selectAndRouteView: some View {
    Card {
      Text("What are you logging?").font(.headline)
      Picker("Type", selection: $type) {
        Text("Send money / Cash").tag("payment")
        Text("Groceries").tag("groceries")
        Text("Supplies").tag("supplies")
        Text("House work").tag("house_work")
        Text("Other").tag("other")
      }
      .pickerStyle(.menu)

      TextField("Amount in dollars", text: $amount)
        .keyboardType(.decimalPad)
        .textFieldStyle(.roundedBorder)

      TextField("Household note (optional)", text: $note)
        .textFieldStyle(.roundedBorder)

      Toggle("Count toward stay balance", isOn: $countsTowardBalance)
        .font(.subheadline)

      if store.isHost && store.guests.count > 1 {
        GuestPicker(store: store)
      }
    }

    if canApplyRewards {
      Card {
        Toggle(isOn: $applyRewards) {
          VStack(alignment: .leading, spacing: 2) {
            Text("Apply \(coinName) (\(availablePoints) available)")
              .font(.subheadline.bold())
            Text("Each point is worth \(Display.money(centsPerPoint)) toward your stay balance.")
              .font(.caption)
              .foregroundStyle(Palette.muted)
          }
        }
        if applyRewards {
          Stepper(
            "Use \(rewardOffset.pointsApplied) \(coinName) (−\(Display.money(rewardOffset.rewardCreditCents)))",
            value: $pointsToRedeem,
            in: 1...max(1, availablePoints)
          )
          .font(.footnote.weight(.semibold))
        }
      }
    }

    if type != "payment" {
      Card {
        Text("Shared household contribution").font(.headline)
        Text("We'll add this \(type.replacingOccurrences(of: "_", with: " ")) entry to the Ledger. It stays pending until \(otherPerson) confirms it.")
          .font(.subheadline)
          .foregroundStyle(Palette.muted)
        PrimaryButton(title: "Log on Ledger") {
          saveContribution()
        }
        .disabled(rewardOffset.grossAmountCents <= 0)
      }
    } else if isCoveredEntirelyByRewards {
      Card {
        Pill(text: "Covered by \(coinName)")
        Text("Your \(rewardOffset.pointsApplied) \(coinName) cover the full amount — no outside app transfer needed.")
          .font(.subheadline)
          .foregroundStyle(Palette.muted)
        PrimaryButton(title: "Redeem \(rewardOffset.pointsApplied) \(coinName) & Log") {
          saveContribution()
        }
      }
    } else {
      Card {
        Text("How are you sending it?").font(.headline)
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
          ForEach(P2PChannel.allCases) { channel in
            Button {
              selectedChannel = channel
              // A handle typed for one app must never route through another.
              customHandle = ""
              copiedZelle = false
            } label: {
              HStack(spacing: 8) {
                Circle()
                  .fill(selectedChannel == channel ? Palette.brandForest : Palette.muted.opacity(0.4))
                  .frame(width: 8, height: 8)
                Text(channel.label)
                  .font(.subheadline.bold())
                  .foregroundStyle(Palette.ink)
                Spacer()
              }
              .padding(12)
              .background(
                selectedChannel == channel ? Palette.lime.opacity(0.35) : Palette.cream,
                in: RoundedRectangle(cornerRadius: 14)
              )
              .overlay(
                RoundedRectangle(cornerRadius: 14)
                  .stroke(selectedChannel == channel ? Palette.brandForest : Palette.line, lineWidth: 1.5)
              )
            }
            .buttonStyle(.plain)
          }
        }

        Divider().padding(.vertical, 4)

        DataRow(
          title: selectedChannel == .cash ? "Cash handoff" : "Host \(selectedChannel.label)",
          detail: P2PRouting.formattedHandle(channel: selectedChannel, rawHandle: activeRawHandle)
        )

        if configuredHandleForChannel.isEmpty && selectedChannel != .cash {
          TextField("Host's \(selectedChannel.label) handle", text: $customHandle)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .textFieldStyle(.roundedBorder)
        }

        if resolvedHandle == nil {
          Text("No \(selectedChannel.label) handle is saved for this stay. Enter the host's handle, exactly as they gave it to you, to continue.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)

          PrimaryButton(title: "Enter a handle to continue") {}
            .disabled(true)
        } else if selectedChannel == .zelle || selectedChannel == .applepay {
          HStack {
            Text(activeRawHandle)
              .font(.system(.subheadline, design: .monospaced).bold())
              .lineLimit(1)
            Spacer()
            Button(copiedZelle ? "Copied!" : "Copy to Clipboard") {
              UIPasteboard.general.string = activeRawHandle
              copiedZelle = true
            }
            .font(.caption.bold())
            .buttonStyle(.borderedProminent)
            .tint(Palette.brandForest)
          }
          .padding(12)
          .background(Palette.cream, in: RoundedRectangle(cornerRadius: 12))

          Text("Copy your host's \(selectedChannel.label) info above, send $\(rewardOffset.netPayableFormatted) in \(selectedChannel == .zelle ? "your bank's Zelle app" : "Messages or Wallet"), then tap below to log it.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)

          PrimaryButton(title: "I'm ready to send via \(selectedChannel.label)") {
            phase = .outboundConfirmation
          }
          .disabled(rewardOffset.grossAmountCents <= 0)
        } else if selectedChannel == .cash {
          Text("Hand $\(rewardOffset.netPayableFormatted) to your host (or leave it in the agreed spot), then tap below so we can put it on the Ledger.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)

          PrimaryButton(title: "Log $\(rewardOffset.netPayableFormatted) Cash Contribution") {
            phase = .outboundConfirmation
          }
          .disabled(rewardOffset.grossAmountCents <= 0)
        } else if showQRCode {
          VStack(spacing: 10) {
            if let qrImage = generateLevelHQRImage(from: compiledRouteURI) {
              Image(uiImage: qrImage)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .frame(width: 180, height: 180)
                .padding(14)
                .background(.white, in: RoundedRectangle(cornerRadius: 16))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Palette.brandForest, lineWidth: 2))
                .onTapGesture {
                  phase = .outboundConfirmation
                }
            }
            Text("Level-H QR · Scan or tap once scanned")
              .font(.caption.bold())
              .foregroundStyle(Palette.muted)
            Text(compiledRouteURI)
              .font(.system(size: 11, design: .monospaced))
              .foregroundStyle(Palette.muted)
              .lineLimit(2)
            PrimaryButton(title: "I scanned the QR code") {
              phase = .outboundConfirmation
            }
          }
          .frame(maxWidth: .infinity)
        } else {
          Text("Tap below to open \(selectedChannel.label) with $\(rewardOffset.netPayableFormatted) and your house note ready to go.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)

          PrimaryButton(title: "Open \(selectedChannel.label) · $\(rewardOffset.netPayableFormatted)") {
            if let url = URL(string: compiledRouteURI) {
              openURL(url)
            }
            phase = .outboundConfirmation
          }
          .disabled(rewardOffset.grossAmountCents <= 0)
        }
      }
    }
  }

  private var outboundConfirmationView: some View {
    Card {
      VStack(spacing: 14) {
        Text(String(selectedChannel.label.prefix(1)))
          .font(.title2.bold())
          .foregroundStyle(Palette.brandForest)
          .frame(width: 52, height: 52)
          .background(Palette.lime, in: Circle())

        Text(selectedChannel == .cash ? "Hand off your cash contribution" : "Finish up in \(selectedChannel.label)")
          .font(Palette.section)
          .multilineTextAlignment(.center)

        Text(
          selectedChannel == .cash
            ? "Once you hand over $\(rewardOffset.netPayableFormatted) (or leave it in the agreed spot), tap below to save it to the shared Ledger."
            : "Send $\(rewardOffset.netPayableFormatted) in \(selectedChannel.label), then come back here to save it. Kouchd can't see or check the transfer."
        )
        .font(.subheadline)
        .foregroundStyle(Palette.muted)
        .multilineTextAlignment(.center)

        VStack(spacing: 8) {
          DataRow(title: "Recipient", detail: P2PRouting.formattedHandle(channel: selectedChannel, rawHandle: activeRawHandle))
          DataRow(title: "Amount", detail: "$\(rewardOffset.netPayableFormatted)")
          if rewardOffset.pointsApplied > 0 {
            DataRow(title: "\(coinName) applied", detail: "\(rewardOffset.pointsApplied) (−\(Display.money(rewardOffset.rewardCreditCents)))")
          }
          DataRow(title: "Note", detail: effectiveMemo)
        }
        .padding(14)
        .background(Palette.cream, in: RoundedRectangle(cornerRadius: 16))

        PrimaryButton(title: selectedChannel == .cash ? "I handed it over. Save to Ledger" : "I sent it. Save to Ledger") {
          saveContribution()
        }

        Button("Cancel / Go Back") {
          phase = .selectAndRoute
        }
        .font(.subheadline.bold())
        .foregroundStyle(Palette.muted)
        .padding(.top, 4)
      }
      .frame(maxWidth: .infinity)
    }
  }

  private var savingView: some View {
    Card {
      VStack(spacing: 16) {
        ProgressView()
          .controlSize(.large)
          .tint(Palette.brandForest)
          .padding(.top, 8)

        Text(Self.casualSteps[min(stepIndex, Self.casualSteps.count - 1)])
          .font(.headline)
          .multilineTextAlignment(.center)

        Text("Saving your shared contribution record for \(Display.money(rewardOffset.grossAmountCents)) — Kouchd keeps the house in sync while payments stay between you two.")
          .font(.footnote)
          .foregroundStyle(Palette.muted)
          .multilineTextAlignment(.center)

        ProgressView(value: progress, total: 1.0)
          .tint(Palette.brandForest)
      }
      .padding(.vertical, 14)
      .frame(maxWidth: .infinity)
    }
  }

  private var savedView: some View {
    Card {
      VStack(spacing: 14) {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 52))
          .foregroundStyle(Palette.brandForest)

        Text("Saved to the Ledger")
          .font(Palette.section)

        Text(
          pendingRecordCents > 0
            ? "Your contribution is saved and waiting for \(otherPerson) to confirm it."
            : "Your \(rewardOffset.pointsApplied) \(coinName) are on the Ledger as a stay credit. There's nothing else to send."
        )
        .font(.subheadline)
        .foregroundStyle(Palette.muted)
        .multilineTextAlignment(.center)

        VStack(alignment: .leading, spacing: 10) {
          HStack {
            Text("SHARED CONTRIBUTION RECORD")
              .font(.caption2.bold())
              .foregroundStyle(Palette.muted)
            Spacer()
            Pill(text: pendingRecordCents > 0 ? "Pending" : "Saved")
          }
          Divider()
          DataRow(title: "Saved on", detail: savedAt)
          if pendingRecordCents > 0 {
            DataRow(title: "Amount", detail: Display.money(pendingRecordCents))
            DataRow(title: "Status", detail: "Waiting for \(otherPerson) to confirm")
          }
          if rewardOffset.pointsApplied > 0 {
            DataRow(title: "\(coinName) used", detail: "\(rewardOffset.pointsApplied) (−\(Display.money(rewardOffset.rewardCreditCents)))")
          }
          if type != "payment" {
            DataRow(title: "Type", detail: type.replacingOccurrences(of: "_", with: " ").capitalized)
          } else if !isCoveredEntirelyByRewards {
            DataRow(title: "Sent with", detail: "\(selectedChannel.label) (\(P2PRouting.formattedHandle(channel: selectedChannel, rawHandle: activeRawHandle)))")
          }
        }
        .padding(14)
        .background(Palette.cream, in: RoundedRectangle(cornerRadius: 16))

        Text("A contribution is a shared record, not proof that money moved. Kouchd never collects, holds, or moves money.")
          .font(.caption2)
          .foregroundStyle(Palette.muted)
          .multilineTextAlignment(.center)

        PrimaryButton(title: "Back to Ledger") {
          dismiss()
        }
      }
      .frame(maxWidth: .infinity)
    }
  }

  private func saveContribution() {
    errorMessage = ""
    stepIndex = 0
    progress = 0.05
    phase = .saving

    Task {
      // A 4.5-second pause broken into 3 x 1.5s status steps. It paces the screen; nothing is checked here.
      for step in 0..<3 {
        await MainActor.run {
          stepIndex = step
          progress = Double(step + 1) / 3.0
        }
        try? await Task.sleep(nanoseconds: 1_500_000_000)
      }

      let today = Display.date()
      if canApplyRewards && applyRewards && rewardOffset.pointsApplied > 0 {
        let redeemed = await store.mutate("rewards:redeem", [
          "stayId": store.selectedStayID,
          "points": Double(rewardOffset.pointsApplied),
          "date": today
        ])
        if !redeemed {
          await MainActor.run {
            errorMessage = "Could not redeem \(coinName). Please check your available balance."
            phase = .selectAndRoute
          }
          return
        }
      }

      let centsToRecord = pendingRecordCents
      if centsToRecord > 0 {
        let noteSummary: String = {
          if type != "payment" { return effectiveMemo }
          if rewardOffset.pointsApplied > 0 {
            return "\(effectiveMemo) · via \(selectedChannel.label) + \(rewardOffset.pointsApplied) \(coinName)"
          }
          return "\(effectiveMemo) · via \(selectedChannel.label)"
        }()

        var args: [String: ConvexEncodable?] = [
          "stayId": store.selectedStayID,
          "type": type,
          "amountCents": Double(centsToRecord),
          "date": today,
          "note": noteSummary,
          "countsTowardBalance": countsTowardBalance
        ]
        if !store.selectedGuestID.isEmpty { args["guestUserId"] = store.selectedGuestID }
        let created = await store.mutate("contributions:create", args)
        if !created {
          await MainActor.run {
            errorMessage = "Could not save this contribution to the Ledger."
            phase = .selectAndRoute
          }
          return
        }
      }

      await MainActor.run {
        savedAt = Date.now.formatted(date: .abbreviated, time: .shortened)
        progress = 1.0
        phase = .saved
      }
    }
  }

  private func generateLevelHQRImage(from string: String) -> UIImage? {
    let context = CIContext()
    let filter = CIFilter.qrCodeGenerator()
    filter.message = Data(string.utf8)
    filter.correctionLevel = "H"
    guard let outputImage = filter.outputImage else { return nil }
    let scaled = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
    guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
    return UIImage(cgImage: cgImage)
  }
}

#if DEBUG
/// Shows the contribution form with a synthetic stay and no Clerk or Convex data.
/// Launch with `--ui-test-contribution=<no-handle|venmo-saved|saved>`; absent from Release.
struct ContributionFormTestHost: View {
  static var scenario: String? {
    ProcessInfo.processInfo.arguments.first { $0.hasPrefix("--ui-test-contribution=") }?
      .replacingOccurrences(of: "--ui-test-contribution=", with: "")
  }
  let scenario: String
  @State private var store = KouchdStore()
  @State private var ready = false

  var body: some View {
    ZStack {
      Palette.cream.ignoresSafeArea()
      if ready {
        if scenario == "saved" {
          ContributionForm(store: store, phase: .saved, savedAt: "Oct 30, 2026 at 9:00 AM")
        } else {
          ContributionForm(store: store)
        }
      }
    }
    .task {
      // The signed-out store resets once Convex reports its auth state; seed after that.
      try? await Task.sleep(for: .milliseconds(600))
      let options = scenario != "no-handle" ? #"[{"provider":"venmo","detail":"@maple-host"}]"# : "[]"
      let json = #"{"stay":{"name":"Maple Street room","paymentOptions":\#(options)},"membership":{"role":"guest"}}"#
      store.bundle = (try? JSONDecoder().decode(Value.self, from: Data(json.utf8))) ?? .null
      ready = true
    }
  }
}
#endif

struct ChoresScreen: View {
  let store: KouchdStore
  @State private var showingCreate = false
  var body: some View {
    Page(title: "Chores & check-ins", width: .wide) {
      Card {
        Text("Little things, shared fairly.").font(.headline)
        Text("Keep track of what needs doing around the home.")
          .foregroundStyle(Palette.muted)
        if !store.isEnded {
          PrimaryButton(title: "Add a chore") { showingCreate = true }
        }
      }
      if store.chores.isEmpty {
        EmptyCard(title: "All clear", message: "Chores your household adds will show up here.")
      }
      ColumnsReader { columns in
        // In a grid, open chores come first so nothing to do hides behind finished work.
        let chores = columns > 1
          ? store.chores.filter { !$0["completed"].flag } + store.chores.filter { $0["completed"].flag }
          : store.chores
        AdaptiveGrid {
          ForEach(chores, id: \.id) { chore in ChoreCard(store: store, chore: chore) }
        }
      }
    }
    .toolbar {
      if !store.isEnded {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingCreate = true
          } label: {
            Label("Add chore", systemImage: "plus")
          }
          .keyboardShortcut("n")
        }
      }
    }
    .sheet(isPresented: $showingCreate) { ChoreForm(store: store) }
  }
}

private struct ChoreCard: View {
  let store: KouchdStore
  let chore: Value

  var body: some View {
    Card {
      HStack {
        Button {
          Task { _ = await store.mutate("chores:toggle", ["choreId": chore.id]) }
        } label: {
          Image(systemName: chore["completed"].flag ? "checkmark.circle.fill" : "circle")
            .font(.title2).foregroundStyle(Palette.forest)
            .frame(minWidth: 44, minHeight: 44)
        }
        .hoverEffect(.highlight)
        .disabled(store.isEnded || !chore["voidedAt"].text.isEmpty).accessibilityLabel(chore["completed"].flag ? "Mark incomplete" : "Mark complete")
        VStack(alignment: .leading, spacing: 4) {
          Text(chore.title).font(.headline)
          Text(HouseholdRules.choreScheduleLabel(chore))
            .font(.caption).foregroundStyle(Palette.muted)
        }
        Spacer()
      }
      if !chore["note"].text.isEmpty { Text(chore["note"].text).font(.subheadline) }
      if !chore["voidedAt"].text.isEmpty { Pill(text: "Voided") }
      if chore["voidedAt"].text.isEmpty && (store.isHost || chore["createdBy"].text == store.viewer["id"].text) {
        VoidRecordButton(store: store, function: "chores:voidChore",
                         recordKey: "choreId", recordID: chore.id)
      }
    }
  }
}

struct ChoreForm: View {
  let store: KouchdStore
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var note = ""
  @State private var assignee = "shared"
  @State private var assigneeID = ""
  @State private var due = Date.now
  @State private var repeatCadence = "none"
  var body: some View {
    NavigationStack {
      Form {
        TextField("Chore", text: $title)
        TextField("Details", text: $note)
        Picker("For", selection: $assignee) {
          Text("Shared").tag("shared")
          Text("Host").tag("host")
          Text("Guest").tag("guest")
        }
        if assignee == "guest" {
          Picker("Guest", selection: $assigneeID) {
            Text("Any guest").tag("")
            ForEach(store.guests, id: \.guestPersonID) { guest in
              Text(guest["person"]["name"].text).tag(guest["person"]["id"].text)
            }
          }
        }
        DatePicker("Due", selection: $due, displayedComponents: .date)
        Picker("Repeat", selection: $repeatCadence) {
          Text("Does not repeat").tag("none")
          Text("Daily").tag("daily")
          Text("Weekly").tag("weekly")
        }
      }
      .navigationTitle("New chore")
      .kouchdNavigationBar()
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
          Button("Add") {
            Task {
              var args: [String: ConvexEncodable?] = [
                "stayId": store.selectedStayID, "title": title, "note": note,
                "assignee": assignee, "dueDate": Display.date(due)
              ]
              if assignee == "guest" && !assigneeID.isEmpty { args["assigneeUserId"] = assigneeID }
              if let cadence = HouseholdRules.choreRepeatCadence(repeatCadence) { args["repeatCadence"] = cadence }
              if await store.mutate("chores:create", args) { dismiss() }
            }
          }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
        }
      }
    }
  }
}
