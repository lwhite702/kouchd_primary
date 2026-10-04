import SwiftUI

enum Palette {
  static let cream = Color(red: 0.966, green: 0.949, blue: 0.917)
  static let forest = Color(red: 0.090, green: 0.306, blue: 0.224)
  static let ink = Color(red: 0.086, green: 0.141, blue: 0.118)
  static let muted = Color(red: 0.412, green: 0.443, blue: 0.412)
  static let lime = Color(red: 0.870, green: 0.950, blue: 0.370)
  static let line = Color(red: 0.875, green: 0.870, blue: 0.829)
  static let heading = Font.custom("Manrope", size: 33, relativeTo: .largeTitle).weight(.bold)
  static let section = Font.custom("Manrope", size: 23, relativeTo: .title2).weight(.bold)
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
      .frame(maxWidth: 720, alignment: .leading)
      .frame(maxWidth: .infinity)
    }
    .background(Palette.cream.ignoresSafeArea())
  }
}

struct Card<Content: View>: View {
  @ViewBuilder let content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 14) { content }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(.white, in: RoundedRectangle(cornerRadius: 24))
  }
}

struct Pill: View {
  let text: String
  var body: some View {
    Text(text.uppercased())
      .font(.caption2.weight(.bold))
      .tracking(1)
      .foregroundStyle(Palette.forest)
      .padding(.horizontal, 12).padding(.vertical, 7)
      .background(Palette.lime, in: Capsule())
  }
}

struct PrimaryButton: View {
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title).font(.headline).frame(maxWidth: .infinity)
        .padding(.vertical, 15)
    }
    .buttonStyle(.plain)
    .foregroundStyle(.white)
    .background(Palette.forest, in: RoundedRectangle(cornerRadius: 16))
  }
}

struct DataRow: View {
  let title: String
  let detail: String
  var body: some View {
    HStack(alignment: .firstTextBaseline) {
      Text(title).foregroundStyle(Palette.muted)
      Spacer(minLength: 12)
      Text(detail).multilineTextAlignment(.trailing).foregroundStyle(Palette.ink)
    }.font(.subheadline)
  }
}

struct EmptyCard: View {
  let title: String
  let message: String
  var body: some View {
    Card {
      Image(systemName: "sparkle").font(.title2).foregroundStyle(Palette.forest)
      Text(title).font(.headline)
      Text(message).font(.subheadline).foregroundStyle(Palette.muted)
    }
  }
}
