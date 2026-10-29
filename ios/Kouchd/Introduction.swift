import SwiftUI

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
  let finish: (EntryRoute?) -> Void
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @Environment(\.dynamicTypeSize) private var typeSize
  @State private var step = 0
  private let titles = ["A shared stay.\nOn the same page.", "Good stays start\nwith clarity.",
                        "Clear records.\nFewer awkward asks.", "Make the everyday\nfeel more shared."]
  private let descriptions = [
    "Staying with someone—or opening your home? Keep expectations, contributions and everyday plans in one place.",
    "Agree on dates, house guidelines and contributions before the stay begins. Revisit changes together.",
    "Record contributions made outside Kouchd. The people involved confirm or dispute the shared record.",
    "Coordinate chores, check-ins and occupied nights. Keep the little things from becoming a guessing game."
  ]
  var body: some View {
    VStack(spacing: 0) {
      HStack {
        if step > 0 { Button("Back") { move(to: step - 1) } }
        else { Text("kouchd").font(.custom("Manrope", size: 20, relativeTo: .title3).bold()) }
        Spacer()
        // The role choice is the last step, so Skip has nowhere to go there.
        if replay || step < 4 {
          Button(replay ? "Done" : "Skip") {
            if replay { finish(nil) } else { move(to: 4) }
          }
        }
      }.frame(minHeight: 44).padding(.horizontal, 24).foregroundStyle(Palette.forest)
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          if step < 4 {
            Image("CouchMark").renderingMode(.template).resizable().scaledToFit().frame(width: 64, height: 64)
              .foregroundStyle(Palette.forest)
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
              PrimaryButton(title: "Create a stay") { finish(.host) }
            }
            Card {
              Text("I’m staying with someone").font(Palette.section)
              Text("Join using the invitation your host shared.")
              PrimaryButton(title: "Join a stay") { finish(.guest) }
            }
          }
          // At accessibility sizes a pinned footer would cover most of the screen.
          if typeSize.isAccessibilitySize { footer.frame(maxWidth: .infinity) }
        }
        .id(step)
        .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: 12)))
        .padding(24).frame(maxWidth: 600, alignment: .leading).frame(maxWidth: .infinity)
      }
    }
    .safeAreaInset(edge: .bottom, spacing: 0) {
      if !typeSize.isAccessibilitySize {
        footer.padding(.horizontal, 24).padding(.bottom, 16).background(Palette.cream)
      }
    }
    .foregroundStyle(Palette.ink)
    .tint(Palette.forest)
    .background(Palette.cream.ignoresSafeArea())
  }
  private var footer: some View {
    VStack(spacing: 12) {
        if step < 4 {
          HStack(spacing: 12) {
            ForEach(0..<4) { index in
              Circle().fill(step == index ? Palette.forest : Palette.line).frame(width: 8, height: 8)
            }
          }.accessibilityElement(children: .ignore).accessibilityLabel("Preview \(step + 1) of 4")
          PrimaryButton(title: step == 0 ? "See how Kouchd works" : step == 3 ? (replay ? "Done" : "Let’s get started") : "Continue") {
            if replay && step == 3 { finish(nil) } else { move(to: step + 1) }
          }
        }
        if !replay {
          Button("Already have an account? Sign in") { finish(nil) }
            .frame(minHeight: 44).foregroundStyle(Palette.forest)
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
        .background(Palette.brandForest, in: RoundedRectangle(cornerRadius: 24))
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
    withAnimation(KouchdMotion.animation(reduceMotion)) { step = value }
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
      IntroductionScreen(replay: true) { _ in previewPresented = false }
    }
  }
}
