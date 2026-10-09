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
    .kouchdEntrance()
  }
}

struct Card<Content: View>: View {
  @ViewBuilder let content: Content
  var body: some View {
    VStack(alignment: .leading, spacing: 14) { content }
      .padding(20)
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(.white, in: RoundedRectangle(cornerRadius: 24))
      .kouchdEntrance(delay: 0.04)
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
  @Environment(\.isEnabled) private var isEnabled
  let title: String
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      Text(title).font(.headline).frame(maxWidth: .infinity)
        .padding(.vertical, 15)
    }
    .buttonStyle(KouchdButtonStyle())
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

private struct KouchdEntrance: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var visible = false
  var delay: Double
  func body(content: Content) -> some View {
    content.opacity(visible ? 1 : 0)
      .offset(y: visible || reduceMotion ? 0 : 10)
      .onAppear {
        withAnimation(KouchdMotion.animation(reduceMotion).delay(reduceMotion ? 0 : delay)) { visible = true }
      }
  }
}

extension View {
  func kouchdEntrance(delay: Double = 0) -> some View {
    modifier(KouchdEntrance(delay: delay))
  }
}

private struct KouchdButtonStyle: ButtonStyle {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  func makeBody(configuration: Configuration) -> some View {
    configuration.label.foregroundStyle(.white)
      .background(Palette.forest, in: RoundedRectangle(cornerRadius: 16))
      .scaleEffect(configuration.isPressed && !reduceMotion ? 0.98 : 1)
      .opacity(configuration.isPressed ? 0.85 : 1)
      .animation(KouchdMotion.animation(reduceMotion), value: configuration.isPressed)
  }
}
