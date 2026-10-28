import SwiftUI
import RevenueCat
import RevenueCatUI

enum EntryRoute: String, Identifiable, Hashable {
  case host, guest
  var id: String { rawValue }
}

struct BrandSplash: View {
  var body: some View {
    ZStack {
      // Keep this group centered exactly like LaunchScreen.storyboard. The
      // caption is layered at the bottom so it cannot shift the brand mark.
      VStack(spacing: 16) {
        Image("CouchMarkLight").resizable().scaledToFit().frame(width: 96, height: 96)
          .accessibilityHidden(true)
        Text("kouchd").font(.system(size: 72, weight: .bold))
        Text("A little room, well shared.").font(.system(size: 16))
      }

      VStack {
        Spacer()
        Text("SHARED STAYS. CLEAR EXPECTATIONS.").font(.caption)
          .foregroundStyle(Palette.lime)
          .padding(.bottom, 24)
      }
    }
    .foregroundStyle(.white).padding(24)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Palette.forest.ignoresSafeArea())
    .ignoresSafeArea()
  }
}

struct IntroductionScreen: View {
  var replay = false
  let finish: (EntryRoute?) -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var step = 0
  @State private var lastSwipeAt = Date.distantPast
  private let funnelPlacement = "host_onboarding"
  private var funnelVariant: String { KouchdFunnel.variant(funnelPlacement) }
  private var titles: [String] {
    switch funnelVariant {
    case "compact":
      return ["A shared stay.\nOn the same page.", "Set the rhythm\nin one place.", "See the agreement\nbefore you share it.", "Make the everyday\nfeel more shared."]
    case "guided":
      return ["What would make\nthis home easier?", "Start with the\npriority that matters.", "Your first agreement\nis taking shape.", "Make the everyday\nfeel more shared."]
    default:
      return ["A shared stay.\nOn the same page.", "Good stays start\nwith clarity.", "Clear records.\nFewer awkward asks.", "Make the everyday\nfeel more shared."]
    }
  }
  private var descriptions: [String] {
    switch funnelVariant {
    case "compact":
      return [
        "Staying with someone—or opening your home? Keep expectations, contributions and everyday plans in one place.",
        "Choose dates, house guidelines and contribution rhythm together instead of spreading setup across separate steps.",
        "Review a clear agreement draft before guests see it. Adjust anything that does not fit your household.",
        "Coordinate chores, check-ins and occupied nights. Keep the little things from becoming a guessing game."
      ]
    case "guided":
      return [
        "Tell Kouchd what would make this stay easier to coordinate, and we will put the most relevant setup first.",
        "Start with expectations, contributions or chores. Your choice shapes the next prompts and the first draft.",
        "Review a stay plan built from your priority before you invite anyone. The people involved can revisit changes together.",
        "Coordinate chores, check-ins and occupied nights. Keep the little things from becoming a guessing game."
      ]
    default:
      return [
        "Staying with someone—or opening your home? Keep expectations, contributions and everyday plans in one place.",
        "Agree on dates, house guidelines and contributions before the stay begins. Revisit changes together.",
        "Record contributions made outside Kouchd. The people involved confirm or dispute the shared record.",
        "Coordinate chores, check-ins and occupied nights. Keep the little things from becoming a guessing game."
      ]
    }
  }
  var body: some View {
    VStack(spacing: 0) {
      HStack {
        if step > 0 {
          Button("Back") { move(to: step - 1) }
            .frame(minWidth: 44, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        else { Text("kouchd").font(.system(size: 20, weight: .bold, design: .rounded)) }
        Spacer()
        Button(replay ? "Done" : "Skip") {
          if replay { KouchdFunnel.mark(funnelPlacement, .close); complete(nil) } else { KouchdFunnel.mark(funnelPlacement, .close); move(to: 4) }
        }
        .frame(minWidth: 44, minHeight: 44, alignment: .trailing)
        .contentShape(Rectangle())
      }.frame(minHeight: 44).padding(.horizontal, 24)
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          if step < 4 {
            Image("CouchMark").resizable().scaledToFit().frame(width: 64, height: 64)
              .accessibilityHidden(true)
            if step > 0 { Pill(text: ["", "01 / Your stay", "02 / Contributions", "03 / Everyday living"][step]) }
            Text(titles[step]).font(Palette.heading).accessibilityAddTraits(.isHeader)
            Text(descriptions[step]).foregroundStyle(Palette.muted)
            preview
            if step == 2 {
              Text("Kouchd records contributions. It does not move money.")
                .font(.footnote).foregroundStyle(Palette.muted)
            }
          } else {
            Text("How are you\nmaking room?").font(Palette.heading).accessibilityAddTraits(.isHeader)
            Text("Start with your role in this stay. You can host and be a guest in different stays.")
              .foregroundStyle(Palette.muted)
            Card {
              Text("I’m hosting").font(Palette.section)
              Text("Create a stay, set expectations and invite your guests.")
              PrimaryButton(title: "Create a stay") { complete(.host) }
            }
            Card {
              Text("I’m staying with someone").font(.title3.bold())
              Text("Join using the invitation your host shared.")
              PrimaryButton(title: "Join a stay") { complete(.guest) }
            }
          }
        }
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: 12)))
        .padding(24).frame(maxWidth: 600, alignment: .leading).frame(maxWidth: .infinity)
        .accessibilityIdentifier("funnel-\(funnelVariant)-step-\(min(step + 1, 4))")
      }
      .id(step)
      .simultaneousGesture(onboardingSwipe)
      VStack(spacing: 12) {
        if step < 4 {
          HStack(spacing: 12) {
            ForEach(0..<4) { index in
              Circle().fill(step == index ? Palette.forest : Palette.line).frame(width: 8, height: 8)
            }
          }.accessibilityElement(children: .ignore).accessibilityLabel("Preview \(step + 1) of 4")
          PrimaryButton(title: step == 0 ? "See how Kouchd works" : step == 3 ? (replay ? "Done" : "Let’s get started") : "Continue") {
            if replay && step == 3 { complete(nil) } else { move(to: step + 1) }
          }
        }
        if !replay {
          Button {
            KouchdFunnel.mark(funnelPlacement, .close)
            complete(nil)
          } label: {
            Text("Already have an account? Sign in")
              .font(.subheadline)
              .foregroundStyle(Palette.link)
              .frame(maxWidth: .infinity, minHeight: 44)
              .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .accessibilityIdentifier("introduction.signIn")
          .accessibilityLabel("Already have an account? Sign in")
        }
      }.padding(.horizontal, 24).padding(.bottom, 16)
    }
    .foregroundStyle(Palette.ink).background(Palette.canvas.ignoresSafeArea())
    .accessibilityHint("Swipe left to continue or right to go back")
    .onAppear {
      KouchdFunnel.mark(funnelPlacement, .start)
      recordStep(step)
    }
    .onChange(of: step) { _, value in recordStep(value) }
  }

  private var onboardingSwipe: some Gesture {
    DragGesture(minimumDistance: 24)
      .onEnded { value in
        let horizontalDistance = value.translation.width
        let verticalDistance = value.translation.height
        guard abs(horizontalDistance) > 50,
              abs(horizontalDistance) > abs(verticalDistance) else { return }

        let now = Date()
        guard now.timeIntervalSince(lastSwipeAt) > 1.0 else { return }
        lastSwipeAt = now

        if horizontalDistance < 0, step < 4 {
          move(to: step + 1)
        } else if horizontalDistance > 0, step > 0 {
          move(to: step - 1)
        }
      }
  }

  @ViewBuilder private var preview: some View {
    switch step {
    case 0:
      VStack(alignment: .leading, spacing: 12) {
        Text("A LITTLE LESS GUESSWORK").font(.caption.bold()).foregroundStyle(Palette.lime)
        Text("Agree on the stay.\nKeep a clear record.\nShare the everyday.").font(Palette.section)
        Text("For hosts and guests, together.").font(.subheadline)
      }.foregroundStyle(.white).padding(20).frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.forest, in: RoundedRectangle(cornerRadius: 24))
    case 1:
      Card {
        Text("Alex’s stay").font(Palette.section)
        Text("Oct 4 – Oct 18 · Maple House").foregroundStyle(Palette.muted)
        Divider()
        Label("Shared expectations accepted", systemImage: "checkmark.circle.fill")
      }
      Card {
        Text("One place for the details").font(.headline)
        Text("Stay dates · House guide\nAgreements · Schedule changes")
      }
    case 2:
      Card {
        Pill(text: "Your shared record")
        Text("$120 confirmed").font(Palette.section)
        Text("Alex + Jordan · This stay").foregroundStyle(Palette.muted)
      }
      Card {
        DataRow(title: "Weekly contribution", detail: "$60")
        Text("Oct 11 · Pending confirmation").font(.subheadline).foregroundStyle(Palette.muted)
      }
    default:
      Card {
        Label("Kitchen reset", systemImage: "checkmark.circle.fill").font(.headline)
        Text("Alex · Completed today").foregroundStyle(Palette.muted)
        Divider()
        Label("Take out recycling", systemImage: "circle").font(.headline)
        Text("Jordan · Due tomorrow").foregroundStyle(Palette.muted)
      }
      Card {
        Text("Small contributions count.").font(.headline)
        Text("Earn points for approved chores and claim rewards your host offers.")
      }
    }
  }
  private func move(to value: Int) {
    KouchdFunnel.mark(funnelPlacement, .tap)
    withAnimation(KouchdMotion.animation(reduceMotion)) { step = value }
  }

  private func recordStep(_ value: Int) {
    if value < 4 { KouchdFunnel.step(funnelPlacement, value + 1) }
  }

  private func complete(_ route: EntryRoute?) {
    KouchdFunnel.mark(funnelPlacement, .done)
    finish(route)
  }
}

struct KouchdPlusScreen: View {
  private let placement = "kouchd_plus_paywall"
  private var variant: String { KouchdFunnel.variant(placement) }

  var body: some View {
    Group {
      if AppConfig.revenueCatIsConfigured {
        if variant == "annual_trial" {
          AnnualTrialPaywall(placement: placement)
        } else {
          PaywallView(
            displayCloseButton: true,
            performPurchase: { package in
              await KouchdStorePurchase.purchase(package, placement: placement)
            }
          )
          .background(Palette.canvas.ignoresSafeArea())
        }
      } else {
        Page(title: "Kouchd Plus") {
          Pill(text: "Host plan")
          Text("Plans are unavailable in this build.")
            .font(Palette.section)
            .foregroundStyle(Palette.ink)
          Text("Kouchd Plus is configured through RevenueCat. Guests continue to use Kouchd for free.")
            .foregroundStyle(Palette.muted)
        }
      }
    }
    .navigationTitle("Kouchd Plus")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar(.hidden, for: .tabBar)
    .toolbarColorScheme(.light, for: .navigationBar)
    // The published RevenueCat template has a light-only palette. Keep its
    // navigation chrome light as well so every control remains readable.
    .preferredColorScheme(.light)
    .environment(\.colorScheme, .light)
    .onAppear { KouchdFunnel.mark(placement, .view) }
    .onDisappear { KouchdFunnel.mark(placement, .close) }
  }
}

private struct AnnualTrialPaywall: View {
  let placement: String
  @State private var model = KouchdPlusPurchaseModel()
  @State private var selectedProductID = ""

  private var selectedPackage: Package? {
    model.packages.first { $0.storeProduct.productIdentifier == selectedProductID }
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Pill(text: "Kouchd Plus for hosts")
        Text("Make shared stays easier to run.")
          .font(Palette.heading)
          .foregroundStyle(Palette.forest)
        Text("Guests keep free core access. Hosts can add the Plus tools that help a household stay organized.")
          .foregroundStyle(Palette.ink)

        Card {
          Label("Host tools for every shared stay", systemImage: "house")
          Label("Clear agreements and contribution records", systemImage: "doc.text")
          Label("Household planning in one place", systemImage: "calendar")
        }
        .foregroundStyle(Palette.ink)

        if model.isLoading {
          ProgressView("Loading plans")
            .frame(maxWidth: .infinity)
        } else {
          ForEach(model.packages.filter { $0.packageType != .lifetime }, id: \.identifier) { package in
            planButton(package)
          }
        }

        if let package = selectedPackage {
          PrimaryButton(title: package.packageType == .annual ? "Start 7-day free trial" : "Continue with monthly") {
            Task { await model.purchase(package, placement: placement) }
          }
          .disabled(model.isPurchasing)

          Text(renewalCopy(for: package))
            .font(.footnote)
            .foregroundStyle(Palette.muted)
            .frame(maxWidth: .infinity, alignment: .center)
            .multilineTextAlignment(.center)
        }

        if let message = model.message {
          Text(message)
            .font(.footnote)
            .foregroundStyle(Palette.muted)
        }

        Button("Restore Purchases") { Task { await model.restore() } }
          .frame(maxWidth: .infinity)
          .disabled(model.isPurchasing)
        HStack {
          Link("Terms of Use", destination: URL(string: "https://kouchd.com/terms")!)
          Spacer()
          Link("Privacy Policy", destination: URL(string: "https://kouchd.com/privacy")!)
        }
        .font(.footnote)
      }
      .padding(24)
      .frame(maxWidth: 600, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.canvas.ignoresSafeArea())
    .task {
      await model.loadOfferings()
      selectedProductID = model.packages.first(where: { $0.packageType == .annual })?
        .storeProduct.productIdentifier
        ?? model.packages.first?.storeProduct.productIdentifier
        ?? ""
    }
  }

  private func planButton(_ package: Package) -> some View {
    let selected = selectedProductID == package.storeProduct.productIdentifier
    return Button {
      selectedProductID = package.storeProduct.productIdentifier
    } label: {
      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 5) {
          Text(package.packageType == .annual ? "Annual" : "Monthly")
            .font(.headline)
          if package.packageType == .annual {
            Text("7 days free for eligible new subscribers")
              .font(.caption)
          }
        }
        Spacer()
        Text(package.localizedPriceString + (package.packageType == .annual ? "/year" : "/month"))
          .font(.headline)
      }
      .foregroundStyle(Palette.ink)
      .padding(18)
      .background(selected ? Palette.lime.opacity(0.22) : Palette.card,
                  in: RoundedRectangle(cornerRadius: 18))
      .overlay {
        RoundedRectangle(cornerRadius: 18)
          .stroke(selected ? Palette.forest : Palette.line, lineWidth: selected ? 2 : 1)
      }
    }
    .buttonStyle(.plain)
  }

  private func renewalCopy(for package: Package) -> String {
    if package.packageType == .annual {
      return "Eligible new subscribers receive 7 days free, then the plan renews automatically at \(package.localizedPriceString) per year until canceled."
    }
    return "The plan renews automatically at \(package.localizedPriceString) per month until canceled. Monthly has no free trial."
  }
}

struct AboutKouchdScreen: View {
  @State private var previewPresented = false
  var body: some View {
    Page(title: "Make room\nfor clarity.") {
      Image("CouchMark").resizable().scaledToFit().frame(width: 64, height: 64).accessibilityHidden(true)
      Text("Kouchd helps hosts and guests manage a shared stay with clearer expectations and fewer scattered conversations.")
        .foregroundStyle(Palette.muted)
      Card {
        Text("Your stay, in one place").font(.headline)
        Text("Stay · Agreements and house details\nLedger · Outside contribution records\nChores · Tasks, check-ins and rewards\nHome · What needs your attention")
      }
      Card {
        Text("Kouchd Plus").font(Palette.section)
        Text("Host tools for shared stays. Guests remain free.")
          .foregroundStyle(Palette.muted)
        NavigationRow("Open Kouchd Plus", symbol: "sparkles") { KouchdPlusScreen() }
      }
      Text("Payments happen outside Kouchd. Contribution records can be confirmed or disputed by the people involved.")
        .font(.footnote).foregroundStyle(Palette.muted)
      PrimaryButton(title: "Preview the features") { previewPresented = true }
      Link("Help", destination: URL(string: "https://help.kouchd.com")!)
      Link("Privacy", destination: URL(string: "https://kouchd.com/privacy")!)
      Link("Terms", destination: URL(string: "https://kouchd.com/terms")!)
      Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—") · A Wrelik Brands app")
        .font(.caption).foregroundStyle(Palette.muted)
    }
    .navigationTitle("About Kouchd").navigationBarTitleDisplayMode(.inline)
    .sheet(isPresented: $previewPresented) {
      IntroductionScreen(replay: true) { _ in previewPresented = false }
    }
  }
}
