import SwiftUI
import UIKit

enum EntryRoute: String, Identifiable, Hashable {
  case host, guest
  var id: String { rawValue }
}

struct BrandSplash: View {
  var body: some View {
    VStack(spacing: 16) {
      Spacer()
      Image("CouchMark").resizable().scaledToFit().frame(width: 96, height: 96)
        .accessibilityHidden(true)
      Text("kouchd").font(.custom("Manrope", size: 72, relativeTo: .largeTitle).bold())
        .lineLimit(1).minimumScaleFactor(0.5)
      Text("A little room, well shared.").font(.body)
      Spacer()
      Text("SHARED STAYS. CLEAR EXPECTATIONS.").font(.caption)
        .foregroundStyle(Palette.lime)
    }
    .foregroundStyle(.white).padding(24).frame(maxWidth: .infinity)
    .background(Palette.brandForest.ignoresSafeArea())
  }
}

struct IntroductionScreen: View {
  var replay = false
  let finish: (EntryRoute?, String?) -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @Environment(\.colorScheme) private var colorScheme
  @State private var step = 0
  /// Set while a tapped button moves the pager. The pager reports the page it is
  /// leaving during that slide, which must not pull `step` back.
  @State private var pendingStep: Int?
  /// Counts tapped moves, so only the latest move's timeout can clear `pendingStep`.
  @State private var moveGeneration = 0
  /// The replay ends on "Done", so it has only the four preview pages, no role choice.
  private var pageCount: Int { replay ? 4 : 5 }
  @State private var inviteCode = ""
  @State private var ambientMotion = false
  private let titles = ["Shared stays, made clear.", "Agree on the stay.",
                        "Keep a clear record.", "Share the everyday."]
  private let descriptions = [
    "One private place for house notes, agreements, chores, and a shared Ledger.",
    "Set the dates and house expectations together, then keep them easy to revisit.",
    "Record contributions made outside Kouchd. The other person confirms each record.",
    "Keep everyday tasks clear, with a fair turn for everyone in the household."
  ]
  @State private var windowWidth: CGFloat = 0
  private var usesWideLayout: Bool { windowWidth >= 900 && !typeSize.isAccessibilitySize }
  var body: some View {
    VStack(spacing: 0) {
      HStack {
        if step > 0 { Button("Back") { move(to: step - 1) } }
        else { Text("kouchd").font(.custom("Manrope", size: 20, relativeTo: .title3).bold()) }
        Spacer()
        // The role choice is the last step, so Skip has nowhere to go there.
        if replay || (step > 0 && step < 4) {
          Button(replay ? "Done" : "Skip") {
        if replay { finish(nil, nil) } else { move(to: 4) }
          }
        }
      }.frame(minHeight: 44).padding(.horizontal, 24).foregroundStyle(Palette.forest)
      // A paged TabView, so people can swipe between steps as well as tap Continue.
      TabView(selection: Binding(get: { step }, set: { swiped(to: $0) })) {
        ForEach(0..<pageCount, id: \.self) { page in
          ScrollView {
            VStack(alignment: .leading, spacing: 20) {
              pageContent(page)
              // At accessibility sizes a pinned footer would cover most of the screen.
              // Only the visible page carries it, so its buttons appear once.
              if typeSize.isAccessibilitySize && page == step { footer.frame(maxWidth: .infinity) }
            }
            .padding(24).frame(maxWidth: usesWideLayout ? 1040 : 600, alignment: .leading).frame(maxWidth: .infinity)
          }
          .tag(page)
        }
      }
      .tabViewStyle(.page(indexDisplayMode: .never))
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      if !typeSize.isAccessibilitySize {
        footer.frame(maxWidth: 600).frame(maxWidth: .infinity)
          .padding(.horizontal, 24).padding(.top, 16).padding(.bottom, 16).background(Palette.cream)
          // Fade the page content into the footer so preview cards never end in a hard cut under the dots.
          .overlay(alignment: .top) {
            LinearGradient(colors: [Palette.cream.opacity(0), Palette.cream], startPoint: .top, endPoint: .bottom)
              .frame(height: 28).offset(y: -28).allowsHitTesting(false).accessibilityHidden(true)
          }
      }
    }
    .foregroundStyle(Palette.ink)
    .tint(Palette.forest)
    .background {
      if step == 0 {
        ZStack(alignment: .topLeading) {
          LinearGradient(
            colors: colorScheme == .dark
              ? [Palette.cream, Palette.surface, Palette.cream]
              : [Palette.cream, Palette.sage, Palette.cream],
            startPoint: .topLeading, endPoint: .bottomTrailing
          )
          Circle().fill(Palette.sage.opacity(colorScheme == .dark ? 0.32 : 0.42))
            .frame(width: 260, height: 260).blur(radius: 64)
            .offset(x: ambientMotion && !reduceMotion ? 90 : 145,
                    y: ambientMotion && !reduceMotion ? 310 : 365)
            .scaleEffect(ambientMotion && !reduceMotion ? 0.84 : 1.08)
            .animation(.easeInOut(duration: 8), value: ambientMotion)
          Circle().fill(Palette.lime.opacity(colorScheme == .dark ? 0.18 : 0.38))
            .frame(width: 300, height: 300).blur(radius: 72)
            .offset(x: ambientMotion && !reduceMotion ? -82 : -120,
                    y: ambientMotion && !reduceMotion ? 52 : 70)
            .scaleEffect(ambientMotion && !reduceMotion ? 1.2 : 0.82)
            .opacity(ambientMotion && !reduceMotion ? 0.92 : 0.64)
            .animation(.easeInOut(duration: 7), value: ambientMotion)
        }.ignoresSafeArea()
      } else {
        Palette.cream.ignoresSafeArea()
      }
    }
    .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { windowWidth = $0 }
    .onAppear(perform: updateAmbientMotion)
    .onChange(of: reduceMotion) { updateAmbientMotion() }
  }
  @ViewBuilder private func pageContent(_ page: Int) -> some View {
    if usesWideLayout {
      if page < 4 {
        HStack(alignment: .center, spacing: 48) {
          VStack(alignment: .leading, spacing: 20) { pageText(page) }
            .frame(maxWidth: .infinity, alignment: .leading)
          VStack(alignment: .leading, spacing: 20) { pagePreview(page) }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      } else {
        pageText(page)
        HStack(alignment: .top, spacing: 20) { roleCards }
      }
    } else {
      if page < 4 {
        pagePreview(page)
        pageText(page)
      } else {
        pageText(page)
        roleCards
      }
    }
  }
  @ViewBuilder private func pageText(_ page: Int) -> some View {
    if page < 4 {
      if page > 0 {
        Image("CouchMark").renderingMode(.template).resizable().scaledToFit().frame(width: 48, height: 48)
          .foregroundStyle(Palette.forest).accessibilityHidden(true)
      }
      if page > 0 { Pill(text: ["", "01 / Your stay", "02 / Contributions", "03 / Everyday living"][page]) }
      Text(titles[page]).font(Palette.heading).accessibilityAddTraits(.isHeader)
      Text(descriptions[page]).foregroundStyle(Palette.muted)
    } else {
      Text("How are you making room?").font(Palette.heading).accessibilityAddTraits(.isHeader)
      Text("Choose how you’re joining. You can host and be a guest in different stays.")
        .foregroundStyle(Palette.muted)
    }
  }
  @ViewBuilder private func pagePreview(_ page: Int) -> some View {
    preview(page)
      .scaleEffect(reduceMotion ? 1 : (ambientMotion ? 1.025 : 0.975))
      .offset(y: reduceMotion ? 0 : (ambientMotion ? -7 : 5))
      .animation(.easeInOut(duration: 4.5), value: ambientMotion)
    if page == 2 {
      Text("The other person confirms each record. Money is settled outside Kouchd.")
        .font(.footnote).foregroundStyle(Palette.muted)
    }
  }
  @ViewBuilder private var roleCards: some View {
      Card {
        Text("I’m hosting").font(Palette.section)
        Text("Create a stay, set expectations and invite your guests.").font(.subheadline).foregroundStyle(Palette.muted)
        PrimaryButton(title: "Start free as a host") { finish(.host, nil) }
      }
      .overlay(RoundedRectangle(cornerRadius: 24).stroke(Palette.forest, lineWidth: 1))
      Card {
        Text("I’m joining a stay").font(Palette.section)
        Text("Enter the invite code your host shared.").font(.subheadline).foregroundStyle(Palette.muted)
        TextField("Invite code", text: $inviteCode)
          .textInputAutocapitalization(.characters).autocorrectionDisabled()
          .padding(14).background(Palette.surface, in: RoundedRectangle(cornerRadius: 14))
          .overlay(RoundedRectangle(cornerRadius: 14).stroke(Palette.line))
        Button("Join") { finish(.guest, inviteCode.trimmingCharacters(in: .whitespacesAndNewlines)) }
          .buttonStyle(.borderedProminent).tint(Palette.forest)
          .disabled(inviteCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      }
      .background(Palette.sage, in: RoundedRectangle(cornerRadius: 24))
  }
  private var footer: some View {
    VStack(spacing: 12) {
        if step < 4 {
          if step > 0 {
            HStack(spacing: 12) {
              ForEach(1..<4) { index in
                Circle().fill(step == index ? Palette.forest : Palette.line).frame(width: 8, height: 8)
              }
            }.accessibilityElement(children: .ignore).accessibilityLabel("Preview \(step) of 3")
          }
          PrimaryButton(title: step == 0 ? "Get started" : step == 3 ? (replay ? "Done" : "Choose how you’re joining") : "Continue") {
            if replay && step == 3 { finish(nil, nil) } else { move(to: step + 1) }
          }
        }
        if !replay {
          Button("I already have an account") { finish(nil, nil) }
            .frame(minHeight: 44).foregroundStyle(Palette.forest)
        }
      }
  }
  @ViewBuilder private func preview(_ page: Int) -> some View {
    switch page {
    case 0:
      Image(colorScheme == .dark ? "RoomIllustrationDark" : "RoomIllustration").resizable().scaledToFit()
        .frame(maxWidth: .infinity).frame(height: min(windowWidth * 0.70, 260))
        .padding(.horizontal, 8).padding(.vertical, 18)
        .background(Palette.sage, in: RoundedRectangle(cornerRadius: 30))
    case 1:
      Image("AgreementIllustration").resizable().scaledToFit()
        .padding(18).background(Palette.sky, in: RoundedRectangle(cornerRadius: 28))
      Text("Agree on dates and expectations before the stay begins.")
        .font(.subheadline).foregroundStyle(Palette.muted)
    case 2:
      ZStack(alignment: .bottomTrailing) {
        Image("LedgerIllustration").resizable().scaledToFit().frame(maxWidth: .infinity)
          .padding(20).background(Palette.sky, in: RoundedRectangle(cornerRadius: 28))
        Label("Groceries  $40", systemImage: "basket.fill")
          .font(.caption.weight(.semibold)).foregroundStyle(Palette.ink)
          .padding(12).background(Palette.surface, in: RoundedRectangle(cornerRadius: 14))
          .shadow(color: .black.opacity(0.08), radius: 8, y: 3).padding(12)
          .offset(y: ambientMotion && !reduceMotion ? -8 : 0)
          .animation(.easeInOut(duration: 3.5), value: ambientMotion)
      }
    default:
      ZStack(alignment: .bottomTrailing) {
        Image("ChoreBoardIllustration").resizable().scaledToFit().frame(maxWidth: .infinity)
          .padding(20).background(Palette.sage, in: RoundedRectangle(cornerRadius: 28))
        Label("Kitchen reset", systemImage: "checkmark.circle.fill")
          .font(.caption.weight(.semibold)).foregroundStyle(Palette.ink)
          .padding(12).background(Palette.surface, in: RoundedRectangle(cornerRadius: 14))
          .shadow(color: .black.opacity(0.08), radius: 8, y: 3).padding(12)
          .offset(y: ambientMotion && !reduceMotion ? -8 : 0)
          .animation(.easeInOut(duration: 3.5), value: ambientMotion)
      }
    }
  }
  private func move(to value: Int) {
    guard value != step else { return }
    pendingStep = value
    moveGeneration += 1
    let generation = moveGeneration
    withAnimation(KouchdMotion.animation(reduceMotion)) { step = value }
    Task {
      // Never leave swiping blocked if the pager does not report the target.
      try? await Task.sleep(for: .milliseconds(700))
      if moveGeneration == generation { pendingStep = nil }
    }
  }

  private func updateAmbientMotion() {
    guard !reduceMotion else {
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { ambientMotion = false }
      return
    }
    withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true)) {
      ambientMotion = true
    }
  }

  private func swiped(to value: Int) {
    if let pendingStep {
      if value == pendingStep { self.pendingStep = nil }
      return
    }
    step = value
  }
}

struct AboutKouchdScreen: View {
  @State private var previewPresented = false
  var body: some View {
    Page(title: "Make room\nfor clarity.", navigationTitle: "About Kouchd") {
      Image("CouchMark").renderingMode(.template).resizable().scaledToFit().frame(width: 64, height: 64)
        .foregroundStyle(Palette.forest).accessibilityHidden(true)
      Text("Kouchd helps hosts and guests manage a shared stay with clearer expectations and fewer scattered conversations.")
        .foregroundStyle(Palette.muted)
      Text("Built by Wrelik Brands, Kouchd brings stay details, house expectations, chores, and contribution records together so people can share a home with more clarity.")
        .font(.subheadline).foregroundStyle(Palette.muted)
      Card {
        Text("Your stay, in one place").font(.headline)
        Text("Stay · Agreements and house details\nLedger · Outside contribution records\nChores · Tasks, check-ins and rewards\nHome · What needs your attention")
      }
      Text("Payments happen outside Kouchd. Contribution records can be confirmed or disputed by the people involved.")
        .font(.footnote).foregroundStyle(Palette.muted)
      PrimaryButton(title: "Preview the features") { previewPresented = true }
      DisclosureGroup("Help, privacy & terms") {
        Text("Get support or review the details behind your account and stay information.")
          .font(.footnote).foregroundStyle(Palette.muted)
        Link("Email Kouchd support", destination: URL(string: "mailto:support@kouchd.com")!)
        Link("Help center", destination: URL(string: "https://help.kouchd.com")!)
        Link("Privacy policy", destination: URL(string: "https://kouchd.com/privacy")!)
        Link("Terms & Conditions", destination: URL(string: "https://kouchd.com/terms")!)
      }
      .font(.subheadline.weight(.semibold))
      Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—") · A Wrelik Brands app")
        .font(.caption).foregroundStyle(Palette.muted)
    }
    .sheet(isPresented: $previewPresented) {
      IntroductionScreen(replay: true) { _, _ in previewPresented = false }
    }
  }
}
