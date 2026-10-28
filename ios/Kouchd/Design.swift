import SwiftUI
import UIKit

enum Palette {
  static let canvas = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.055, green: 0.090, blue: 0.073, alpha: 1)
      : UIColor(red: 0.937, green: 0.961, blue: 0.945, alpha: 1)
  })
  static let card = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.105, green: 0.145, blue: 0.125, alpha: 1)
      : UIColor.white
  })
  static let forest = Color(red: 0.090, green: 0.306, blue: 0.224)
  static let link = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.42, green: 0.82, blue: 0.62, alpha: 1)
      : UIColor(red: 0.090, green: 0.306, blue: 0.224, alpha: 1)
  })
  static let ink = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.930, green: 0.955, blue: 0.940, alpha: 1)
      : UIColor(red: 0.086, green: 0.141, blue: 0.118, alpha: 1)
  })
  static let muted = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark
      ? UIColor(red: 0.690, green: 0.750, blue: 0.710, alpha: 1)
      : UIColor(red: 0.412, green: 0.443, blue: 0.412, alpha: 1)
  })
  static let lime = Color(red: 0.870, green: 0.950, blue: 0.370)
  static let line = Color(red: 0.875, green: 0.870, blue: 0.829)
  static let heading = Font.system(size: 33, weight: .bold, design: .rounded)
  static let section = Font.system(size: 23, weight: .bold, design: .rounded)
}

struct Page<Content: View>: View {
  let title: String
  @ViewBuilder let content: Content
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        Text(title).font(Palette.heading)
          .foregroundStyle(Palette.ink).accessibilityAddTraits(.isHeader)
        content
      }
      .padding(20)
      .padding(.bottom, 72)
      .frame(maxWidth: 720, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.canvas.ignoresSafeArea())
  }
}

struct Card<Content: View>: View {
  @ViewBuilder let content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 14) { content }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Palette.card, in: RoundedRectangle(cornerRadius: 24))
  }
}

struct ActionCard<Content: View>: View {
  @ViewBuilder let content: Content
  init(@ViewBuilder content: () -> Content) { self.content = content() }
  var body: some View {
    VStack(alignment: .leading, spacing: 14) { content }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(Palette.card, in: RoundedRectangle(cornerRadius: 24))
      .overlay {
        RoundedRectangle(cornerRadius: 24)
          .stroke(Palette.link.opacity(0.38), lineWidth: 1.5)
      }
  }
}

struct Pill: View {
  let text: String
  var body: some View {
    Text(text.uppercased())
      .font(.caption2.weight(.bold))
      .tracking(1)
      .foregroundStyle(Color.black.opacity(0.82))
      .padding(.horizontal, 12).padding(.vertical, 7)
      .background(Palette.lime, in: Capsule())
  }
}

/// Small marker for anything that needs Kouchd Plus.
struct PlusBadge: View {
  var text = "Plus"
  var body: some View {
    Text(text.uppercased())
      .font(.caption2.weight(.bold))
      .tracking(0.8)
      .foregroundStyle(Color.black.opacity(0.82))
      .padding(.horizontal, 8).padding(.vertical, 4)
      .background(Palette.lime, in: Capsule())
  }
}

struct PrimaryButton: View {
  @Environment(\.isEnabled) private var isEnabled
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      ZStack {
        RoundedRectangle(cornerRadius: 16)
          .fill(Palette.forest)
        Text(title)
          .font(.headline)
          .foregroundStyle(.white)
      }
      .frame(maxWidth: .infinity)
      .frame(height: 52)
      .contentShape(RoundedRectangle(cornerRadius: 16))
    }
    .buttonStyle(.plain)
    .accessibilityLabel(title)
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

/// A consistent visual affordance for destinations shown inside cards and pages.
/// Informational rows stay neutral; navigation rows use the app accent, an icon,
/// and a chevron so people can immediately tell that the whole row is tappable.
struct NavigationRow<Destination: View>: View {
  let title: String
  let subtitle: String?
  let symbol: String
  let badge: String?
  @ViewBuilder let destination: Destination

  init(
    _ title: String,
    subtitle: String? = nil,
    symbol: String,
    badge: String? = nil,
    @ViewBuilder destination: () -> Destination
  ) {
    self.title = title
    self.subtitle = subtitle
    self.symbol = symbol
    self.badge = badge
    self.destination = destination()
  }

  var body: some View {
    NavigationLink {
      destination
    } label: {
      HStack(spacing: 12) {
        Image(systemName: symbol)
          .font(.subheadline.weight(.semibold))
          .frame(width: 30, height: 30)
          .foregroundStyle(Palette.link)
          .background(Palette.link.opacity(0.13), in: RoundedRectangle(cornerRadius: 9))
        VStack(alignment: .leading, spacing: 3) {
          Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(Palette.ink)
          if let subtitle {
            Text(subtitle)
              .font(.caption)
              .foregroundStyle(Palette.muted)
          }
        }
        Spacer(minLength: 12)
        if let badge { PlusBadge(text: badge) }
        Image(systemName: "chevron.right")
          .font(.caption.weight(.bold))
          .foregroundStyle(Palette.link)
          .accessibilityHidden(true)
      }
      .padding(.horizontal, 12)
      .frame(minHeight: 48)
      .background(Palette.link.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityIdentifier(
      "navigation." + title.lowercased().replacingOccurrences(of: " ", with: "-")
    )
    .accessibilityHint("Opens a new screen")
  }
}

struct EmptyCard: View {
  let title: String
  let message: String
  var body: some View {
    Card {
      Image(systemName: "sparkle").font(.title2).foregroundStyle(Palette.link)
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
            .background(Palette.canvas.ignoresSafeArea()).transition(.opacity)
        }
      }
      .animation(KouchdMotion.animation(reduceMotion), value: loading)
  }
}
