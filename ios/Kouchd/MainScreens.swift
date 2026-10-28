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
  let openMore: (KouchdRoute?) -> Void
  let openActivity: (String, String) -> Void
  private var nextContribution: LedgerRecord? { store.typedLedger.filter { $0.balanceCents > 0 }.min { $0.dueDate < $1.dueDate } }
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 8) {
          Text(store.isHost ? "A little room, well shared." : "Make yourself at home.")
            .font(Palette.heading).foregroundStyle(Palette.forest)
            .accessibilityAddTraits(.isHeader)
          Text(store.isHost
               ? "Welcome back, \(store.viewer["name"].text)."
               : "Your stay with \(store.members.first(where: { $0["membership"]["role"].text == "host" })?["person"]["name"].text ?? "your host") · \(store.bundle["terms"]["startDate"].text) – \(store.bundle["terms"]["endDate"].text)")
            .font(.subheadline).foregroundStyle(Palette.muted)
        }
        if store.isHost {
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
          Text("Your stays").font(Palette.section)
          ForEach(store.stays.indices, id: \.self) { index in
            let stay = store.stays[index]["stay"]
            NavigationLink(value: KouchdRoute.stayDetails(stay["_id"].text)) {
              VStack(alignment: .leading, spacing: 14) {
                Text(stay["name"].text.isEmpty ? "Shared stay" : stay["name"].text)
                  .font(.title3.bold()).foregroundStyle(Palette.forest)
                Text(stay["status"].text.capitalized)
                  .font(.subheadline).foregroundStyle(Palette.muted)
                Rectangle().fill(Palette.line).frame(height: 1)
                Text("Open household details").font(.subheadline).foregroundStyle(Palette.forest)
              }
              .padding(22).frame(maxWidth: .infinity, alignment: .leading)
              .background(Palette.surface, in: RoundedRectangle(cornerRadius: 24))
              .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.line))
            }.buttonStyle(.plain)
          }
        } else {
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
          }
          .padding(24).frame(maxWidth: .infinity, alignment: .leading)
          .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 24))
          if let next = store.chores.first(where: {  $0["completedAt"].text.isEmpty && $0["voidedAt"].text.isEmpty && $0["assignee"].text != "host" && ($0["assigneeUserId"].text.isEmpty || $0["assigneeUserId"].text == store.viewer["id"].text) }) {
            Card {
              Text(next.title).font(.headline)
              Text("Your turn · \(next["dueDate"].text)")
                .font(.subheadline).foregroundStyle(Palette.muted)
            }
          }
          Card {
            Text("Your shared expectations").font(.headline)
            Text(store.bundle["terms"]["houseNotes"].text)
              .font(.subheadline).foregroundStyle(Palette.muted)
          }
        }
      if store.stays.count > 1 {
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
      if store.bundle["membership"]["acceptedTermsId"].text != store.bundle["terms"]["_id"].text,
         !store.isHost, !store.isEnded {
        Card {
          Text("Your agreement needs review").font(.headline)
          Text("Read the current terms before recording new activity.")
          NavigationLink("Review agreement", value: KouchdRoute.agreement)
        }
      }
      Card {
        Text("Remaining scheduled contributions").font(.subheadline).foregroundStyle(Palette.muted)
        Text(Display.money(store.typedLedger.reduce(0) { $0 + $1.balanceCents }))
          .font(.system(size: 38, weight: .bold, design: .rounded))
          .foregroundStyle(Palette.forest)
        Button("Open ledger", action: openLedger)
      }
      HStack(spacing: 12) {
        NavigationLink(value: KouchdRoute.chores) {
          StatCard(number: "\(store.chores.filter {  $0["completedAt"].text.isEmpty && $0["voidedAt"].text.isEmpty }.count)", label: "Open chores")
        }
        Button { openMore(.rewards) } label: {
          StatCard(number: "\(store.wallet["availablePoints"].int)", label: "Reward points")
        }
      }
      if let notice = store.announcements.first {
        Card {
          Pill(text: "Household note")
          Text(notice.title).font(.headline)
          Text(notice["body"].text).font(.subheadline)
        }
      }
      Card {
        Text("More stay tools").font(.headline)
        Text("Find agreements, schedule requests, rewards, and account options together.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        Button { openMore(nil) } label: {
          Label("Browse all tools", systemImage: "ellipsis.circle")
            .font(.subheadline.weight(.semibold)).foregroundStyle(Palette.forest)
        }
      }
      if !store.activity.isEmpty {
        Card {
          Text("Recent activity").font(.headline)
          ForEach(Array(store.activity.prefix(3)), id: \.id) { item in
            Button { openActivity(item["kind"].text, item["action"].text) } label: {
              HStack(alignment: .top, spacing: 10) {
                Text(item["detail"].text).font(.subheadline).foregroundStyle(Palette.ink)
                  .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "arrow.up.right").font(.caption.bold()).foregroundStyle(Palette.forest)
              }
              .padding(.vertical, 7).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens the related section")
          }
        }
      }
      }
      .padding(24)
      .frame(maxWidth: 720, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.cream.ignoresSafeArea())
    .kouchdEntrance()
    .kouchdNavigationBar()
    .toolbar {
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
      ToolbarItem(placement: .topBarTrailing) {
        Button { openMore(.settings) } label: {
          Text(String(store.viewer["name"].text.prefix(2)).uppercased())
            .font(.caption2.bold())
            .foregroundStyle(Palette.ink)
            .frame(width: 32, height: 32)
            .background(Palette.lime, in: Circle())
        }
        .accessibilityLabel("Settings, account: \(store.viewer["name"].text)")
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

struct LedgerScreen: View {
  let store: KouchdStore
  @State private var showingContribution = false
  var body: some View {
    Page(title: "The ledger") {
      if store.isHost && store.guests.count > 1 { GuestPicker(store: store) }
      Card {
        Text("Outside contributions").font(.headline)
        Text("Kouchd records contributions and asks the other person to confirm. Money moves outside the app.")
          .font(.subheadline).foregroundStyle(Palette.muted)
        if !store.isEnded {
          PrimaryButton(title: "Record a contribution") { showingContribution = true }
        }
      }
      if store.ledger.isEmpty {
        EmptyCard(title: "Nothing due yet", message: "Agreed charges will appear here.")
      } else {
        ForEach(store.ledger, id: \.id) { item in
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
      Text("Contribution records").font(.title2.bold())
      if store.contributions.isEmpty {
        EmptyCard(title: "No records yet", message: "Record a payment made outside Kouchd, groceries, supplies, or house work.")
      }
      ForEach(store.contributions, id: \.id) { item in
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
    .toolbar {
      if !store.isEnded {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingContribution = true
          } label: {
            Label("Record contribution", systemImage: "plus")
          }
        }
      }
    }
    .sheet(isPresented: $showingContribution) { ContributionForm(store: store) }
  }
}

struct ContributionForm: View {
  enum Phase {
    case selectAndRoute
    case outboundConfirmation
    case processingVerification
    case successCompletion
  }

  private static let casualSteps = [
    "Writing down your note for the house...",
    "Adding your contribution to the shared Ledger...",
    "Giving your host a quick heads-up..."
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

  // Phase 3 & 4 state
  @State private var stepIndex = 0
  @State private var progress: Double = 0
  @State private var referenceID = "KCH-994827"
  @State private var settledTimestamp = ""
  @State private var errorMessage = ""

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

  private var activeRawHandle: String {
    let configured = configuredHandleForChannel
    if !configured.isEmpty { return configured }
    if !customHandle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return customHandle
    }
    switch selectedChannel {
    case .venmo: return "johndoe"
    case .cashapp: return "johndoe33"
    case .chime: return "john-doe-chime"
    case .zelle: return "johndoe@email.com"
    case .cash: return "Hand directly to your host"
    case .paypal: return "johndoe"
    case .applepay: return "Host Apple Cash"
    }
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
              Text("REF · \(referenceID)")
                .font(.caption2.bold())
                .foregroundStyle(.white.opacity(0.85))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(.white.opacity(0.14), in: Capsule())
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
          case .processingVerification:
            processingVerificationView
          case .successCompletion:
            successCompletionView
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
        let suffix = String(store.selectedStayID.suffix(6)).uppercased()
        referenceID = suffix.isEmpty ? "KCH-994827" : "KCH-\(suffix)"
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
        Text("We'll add this \(type.replacingOccurrences(of: "_", with: " ")) entry to the Ledger and give your host a heads-up to confirm it.")
          .font(.subheadline)
          .foregroundStyle(Palette.muted)
        PrimaryButton(title: "Log on Ledger") {
          startVerificationPhase()
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
          startVerificationPhase()
        }
      }
    } else {
      Card {
        Text("How are you sending it?").font(.headline)
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
          ForEach(P2PChannel.allCases) { channel in
            Button {
              selectedChannel = channel
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

        if selectedChannel == .zelle {
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

          Text("Copy your host's Zelle info above, send $\(rewardOffset.netPayableFormatted) in your bank's Zelle app, then tap below to log it.")
            .font(.footnote)
            .foregroundStyle(Palette.muted)

          PrimaryButton(title: "I'm ready to send via Zelle") {
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
            ? "Once you hand over $\(rewardOffset.netPayableFormatted) (or leave it in the agreed spot), tap below so we can put it on the shared Ledger."
            : "We've opened \(selectedChannel.label). Please complete your transfer of $\(rewardOffset.netPayableFormatted) inside their app, then pop right back here to log it."
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

        PrimaryButton(title: "I Have Sent the Money") {
          startVerificationPhase()
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

  private var processingVerificationView: some View {
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

  private var successCompletionView: some View {
    Card {
      VStack(spacing: 14) {
        Image(systemName: "checkmark.circle.fill")
          .font(.system(size: 52))
          .foregroundStyle(Palette.brandForest)

        Text("On the Ledger!")
          .font(Palette.section)

        Text("All set — your contribution is saved and we gave your host a heads-up so they can confirm it once they check their app.")
          .font(.subheadline)
          .foregroundStyle(Palette.muted)
          .multilineTextAlignment(.center)

        VStack(alignment: .leading, spacing: 10) {
          HStack {
            Text("SHARED CONTRIBUTION RECORD")
              .font(.caption2.bold())
              .foregroundStyle(Palette.muted)
            Spacer()
            Pill(text: "Logged")
          }
          Divider()
          DataRow(title: "Transaction ID", detail: referenceID)
          DataRow(title: "Timestamp", detail: settledTimestamp)
          DataRow(title: "Settled Amount", detail: Display.money(rewardOffset.grossAmountCents))
          if rewardOffset.pointsApplied > 0 {
            DataRow(title: "\(coinName) Redeemed", detail: "\(rewardOffset.pointsApplied) (−\(Display.money(rewardOffset.rewardCreditCents)))")
          }
          DataRow(
            title: "Selected Channel",
            detail: type != "payment"
              ? type.replacingOccurrences(of: "_", with: " ").capitalized
              : isCoveredEntirelyByRewards
                ? "\(coinName) credit"
                : "\(selectedChannel.label) (\(P2PRouting.formattedHandle(channel: selectedChannel, rawHandle: activeRawHandle)))"
          )
        }
        .padding(14)
        .background(Palette.cream, in: RoundedRectangle(cornerRadius: 16))

        Text("A contribution is a shared household record — Kouchd never collects, holds, or moves money itself.")
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

  private func startVerificationPhase() {
    errorMessage = ""
    stepIndex = 0
    progress = 0.05
    phase = .processingVerification

    Task {
      // 4.5-second simulated verification broken into 3 x 1.5s casual status steps
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

      let centsToRecord = type == "payment" ? rewardOffset.netPayableCents : rewardOffset.grossAmountCents
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
            errorMessage = "Could not record contribution on the Ledger."
            phase = .selectAndRoute
          }
          return
        }
      }

      await MainActor.run {
        settledTimestamp = Date.now.formatted(date: .abbreviated, time: .shortened)
        progress = 1.0
        phase = .successCompletion
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

struct ChoresScreen: View {
  let store: KouchdStore
  @State private var showingCreate = false
  var body: some View {
    Page(title: "Chores & check-ins") {
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
      ForEach(store.chores, id: \.id) { chore in
        Card {
          HStack {
            Button {
              Task { _ = await store.mutate("chores:toggle", ["choreId": chore.id]) }
            } label: {
              Image(systemName: chore["completed"].flag ? "checkmark.circle.fill" : "circle")
                .font(.title2).foregroundStyle(Palette.forest)
                .frame(minWidth: 44, minHeight: 44)
            }.disabled(store.isEnded || !chore["voidedAt"].text.isEmpty).accessibilityLabel(chore["completed"].flag ? "Mark incomplete" : "Mark complete")
            VStack(alignment: .leading, spacing: 4) {
              Text(chore.title).font(.headline)
              Text(chore["assignee"].text.capitalized + " · " + chore["dueDate"].text
                   + (chore["repeatCadence"].text.isEmpty ? "" : " · Repeats " + chore["repeatCadence"].text))
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
    .toolbar {
      if !store.isEnded {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingCreate = true
          } label: {
            Label("Add chore", systemImage: "plus")
          }
        }
      }
    }
    .sheet(isPresented: $showingCreate) { ChoreForm(store: store) }
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
              if repeatCadence != "none" { args["repeatCadence"] = repeatCadence }
              if await store.mutate("chores:create", args) { dismiss() }
            }
          }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
        }
      }
    }
  }
}
