import Foundation

/// Client-side mirrors of household coordination rules enforced by Convex.
/// The server stays authoritative; these only decide which controls to show.
enum HouseholdRules {
  static let choreRepeatOptions = ["none", "daily", "weekly"]

  /// Mirrors `requireItemEditor` in convex/shopping.ts: shared items are editable by any member,
  /// personal items only by their creator. Hosts get no exception.
  static func canEditShoppingItem(_ item: Value, viewerID: String) -> Bool {
    item["visibility"].text == "shared" || isCreator(item, viewerID: viewerID)
  }

  /// Mirrors `shopping:update`: only the creator may mark an item personal.
  static func canSetShoppingItemPersonal(_ item: Value, viewerID: String) -> Bool {
    isCreator(item, viewerID: viewerID)
  }

  /// The `repeatCadence` value `chores:create` accepts, or nil when the chore does not repeat.
  static func choreRepeatCadence(_ selection: String) -> String? {
    selection == "daily" || selection == "weekly" ? selection : nil
  }

  static func choreScheduleLabel(_ chore: Value) -> String {
    var label = chore["assignee"].text.capitalized + " · " + chore["dueDate"].text
    let cadence = chore["repeatCadence"].text
    if !cadence.isEmpty { label += " · Repeats " + cadence }
    return label
  }

  private static func isCreator(_ item: Value, viewerID: String) -> Bool {
    !viewerID.isEmpty && item["createdBy"].text == viewerID
  }
}
