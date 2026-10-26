import SwiftUI

enum StayFeature: CaseIterable, Hashable {
  case schedule, occupancy, rewards, shopping, checkins
}

private struct StayFeatureScope: ViewModifier {
  let feature: StayFeature
  let store: KouchdStore
  @State private var owner = UUID()

  func body(content: Content) -> some View {
    content
      .disabled(store.featureLoading.contains(feature))
      .overlay(alignment: .top) {
        if store.featureLoading.contains(feature) { ProgressView("Loading stay details…").padding() }
      }
      .onAppear { store.beginFeature(feature, owner: owner) }
      .onDisappear { store.endFeature(feature, owner: owner) }
  }
}

extension View {
  func stayFeature(_ feature: StayFeature, store: KouchdStore) -> some View {
    modifier(StayFeatureScope(feature: feature, store: store))
  }
}
