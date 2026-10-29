#if DEBUG
import SwiftUI

/// Exercises the real introduction without configuring Clerk, loading a household,
/// modifying onboarding preferences, or creating a network-backed store.
/// This host and its launch flags do not exist in Release builds.
struct IntroductionTestHost: View {
  static var isEnabled: Bool {
    ProcessInfo.processInfo.arguments.contains("--ui-test-introduction")
  }
  @State private var completed = false
  @State private var route: EntryRoute?
  private var arguments: [String] { ProcessInfo.processInfo.arguments }

  var body: some View {
    Group {
      if completed {
        Text("Introduction completed: \(route?.rawValue ?? "none")")
          .accessibilityIdentifier("introduction.testResult")
      } else {
        IntroductionScreen(replay: arguments.contains("--ui-test-replay")) { selection in
          route = selection
          completed = true
        }
      }
    }
    .preferredColorScheme(arguments.contains("--ui-test-dark") ? .dark : .light)
    .dynamicTypeSize(arguments.contains("--ui-test-accessibility-text") ? .accessibility5 : .large)
  }
}
#endif
