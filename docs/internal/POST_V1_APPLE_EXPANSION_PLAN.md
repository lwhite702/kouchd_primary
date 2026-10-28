# Post-1.0 Technical Specification & Architecture Plan: iPadOS & iPhone Duo Expansion

**Status:** Draft / Planned (Post-1.0 Exploration)  
**Target Release Phase:** Post-1.0 (`codex/post-v1-*` worktree isolation)  
**References:**  
- [Apple Human Interface Guidelines: Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)  
- [Apple Developer Documentation: Preparing Your App for iPhone Duo](https://developer.apple.com/documentation/technologyoverviews/preparing-your-app-for-iphone-duo)  
- Kouchd Operating Policy: `AGENTS.md` & `release/feature-lock.json`

---

## 1. Executive Summary

As Kouchd approaches its the then-current Version 1.0 Release Candidate labels (since renamed `0.7.x`), the primary launch line is restricted to bug fixes, accessibility polish, and stabilization. To support the next generation of Apple hardware and form factors without compromising 1.0 RC stability, this document outlines the architecture, UX patterns, and implementation strategy for two post-1.0 initiatives:

1. **iPadOS Native Adaptation:** Transforming Kouchd's iOS client from an iPhone-first layout into a first-class tablet experience with `NavigationSplitView`, sidebar navigation, Stage Manager multitasking, and trackpad/keyboard shortcuts.
2. **iPhone Duo Dual-Screen & Foldable Experience:** Adapting navigation and layout systems for foldable displays, handling posture transitions (folded, flat open, tabletop mode), hinge avoidance via `reservedRegions`, and outer-to-inner display continuity.

---

## 2. iPadOS Native Adaptation Plan

### 2.1 Navigation & Structural Architecture
Currently, `ios/Kouchd/KouchdApp.swift` renders a 5-tab `TabView` wrapping independent `NavigationStack`s (`Home`, `Ledger`, `Chores`, `Stay`, `More`). On iPadOS, this single-stack pattern wastes screen real estate and feels stretched.

```
+---------------------------------------------------------------------------------------+
|  Sidebar (Column 1)   |  Primary List (Column 2)      |  Detail / Inspector (Column 3) |
|-----------------------+-------------------------------+-------------------------------|
|  [Stay Switcher v]    |  Ledger Contributions         |  Contribution Record #1042    |
|                       |  - Groceries ($45.00) [Sel]   |  Guest: Alex R.               |
|  * Home               |  - Utilities ($30.00)         |  Amount: $45.00               |
|  * Ledger             |  - Electric ($62.50)          |  Status: Confirmed            |
|  * Chores             |  - Wi-Fi ($25.00)             |  Date: Oct 24, 2026           |
|  * Stay Info          |                               |  Notes: Trader Joe's run      |
|  * Activity           |  + Add Contribution           |                               |
|  * Settings           |                               |  [Dispute]      [Void Record] |
+---------------------------------------------------------------------------------------+
```

#### Key Architectural Changes:
- **`NavigationSplitView` Adoption:**
  - Implement dynamic 2-column or 3-column layouts when `horizontalSizeClass == .regular`.
  - **Sidebar:** Household switcher, core tabs (`Home`, `Ledger`, `Chores`, `Stay`), and secondary utilities (`Activity`, `Shopping`, `Check-ins`, `Settings`).
  - **Content List:** Active collection (e.g. Ledger obligations & contribution records, Household Chores, or Stay Guidelines).
  - **Detail View:** Deep record view (e.g. contribution receipt details, chore assignments, or stay agreement terms).
- **iPadOS 18+ Sidebar Adaptation:**
  - Use `.tabViewStyle(.sidebarAdaptable)` on supported SDKs so users can switch seamlessly between a compact floating tab bar and a full sidebar.
- **Form Presentation & Readable Width:**
  - Wrap full-screen forms (such as `ContributionForm`, `ChoreForm`, `TermsEditScreen`) in `.frame(maxWidth: 640)` or present them as `.sheet` / `.formSheet` to avoid awkward full-screen stretching.

### 2.2 Multitasking, Windowing & Input Ergonomics
- **Stage Manager & Multi-Window:**
  - Declare multi-window support in `project.yml` (`UIApplicationSupportsMultipleScenes = YES`).
  - Allow users to open multiple windows (e.g., viewing the **Ledger** in one window while reviewing the **Stay Agreement** or **Chores** in another).
  - Handle live window resizing gracefully without resetting view state or dismissing active sheets.
- **Pointer & Trackpad Interactions:**
  - Add `.hoverEffect(.highlight)` and `.hoverEffect(.lift)` on cards, action buttons (`Add contribution`), and list items.
- **Hardware Keyboard Shortcuts:**
  - `Cmd + 1` through `Cmd + 5`: Switch between main views.
  - `Cmd + N`: New contribution or chore (context-sensitive).
  - `Cmd + F`: Filter/search contribution ledger.
  - `Cmd + ,`: Open Settings.

---

## 3. iPhone Duo Dual-Screen & Foldable Plan

### 3.1 Hardware Paradigms & Form Factor
The iPhone Duo introduces an outer compact cover screen and an inner expansive dual display with a physical hinge. 

```
   [Outer Cover Display]                 [Inner Display (Flat Open)]                 [Tabletop / Book Pose]
  +--------------------+             +-------------------+-------------------+         +-------------------+
  |  Compact Layout    |             |  Pane A           |  Pane B           |         |  Top: Visual /    |
  |  (Single-Stack     |  ======>    |  (Ledger List)    |  (Detail / Form)  |         |  Ledger Overview  |
  |   Navigation)      |   Unfold    |                   |  *Hinge Safe Area*|         +===================+ <- Fold Hinge
  |                    |             |                   |                   |         |  Bottom: Keypad / |
  +--------------------+             +-------------------+-------------------+         |  Action Controls  |
                                                                                       +-------------------+
```

### 3.2 Display Continuity & Adaptive Architecture
- **Continuous Flow Across Postures:**
  - Transitioning between folded (compact) and unfolded (regular) must be completely seamless.
  - State preservation: In-progress contribution entry or chore drafts must not reset or lose focus when the device is unfolded mid-flow.
- **Eliminating Device Idiom & Orientation Assumptions:**
  - Replace any legacy checks for `UIDevice.current.userInterfaceIdiom` or `UIDevice.current.orientation`.
  - Solely rely on `@Environment(\.horizontalSizeClass)`, `@Environment(\.verticalSizeClass)`, and `GeometryReader` / window geometry.
- **Handling Hinge & Occlusion (`reservedRegions`):**
  - Query `geometry.reservedRegions(kind:options:)` to identify the hinge/crease position.
  - Ensure interactive buttons, text fields, and two-party confirmation prompts are inset away from the crease.
  - In wide 2-pane modes, place the master list on Pane A (left) and detail/action controls on Pane B (right) with the hinge serving as a natural divider.
- **Tabletop / Folded Angle Mode:**
  - When the device is placed on a table in a half-folded 90°-120° posture:
    - **Top Pane:** Displays non-interactive content (e.g. household guidelines, ledger balance card, or occupancy calendar).
    - **Bottom Pane:** Displays interactive controls (e.g. contribution amount keypad, quick category selector, or confirmation buttons).

---

## 4. Phased Implementation Roadmap (Post-1.0)

| Phase | Milestone | Key Deliverables | Verification Gateway |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Shared Adaptive Layout Foundation** | • Refactor `RootView` to conditionally load `NavigationSplitView` on Regular width classes.<br>• Clean up hardcoded bounds (`UIScreen.main.bounds`). | Unit tests on layout state; simulator checks across compact and regular size classes. |
| **Phase 2** | **iPadOS Ergonomics & Multitasking** | • Sidebar navigation & toolbar items.<br>• Keyboard shortcuts & hover effects.<br>• Multi-window scene configuration. | Xcode iPad Pro (11" & 13") simulators, Stage Manager resizing, trackpad hover testing. |
| **Phase 3** | **iPhone Duo Hinge & Posture Support** | • Integrate `reservedRegions` API for hinge margins.<br>• Implement Tabletop posture layout for ledger & contribution forms.<br>• Outer-to-inner display continuity verification. | Xcode 27.1+ **Device Hub** simulating fold/unfold, tabletop pose, and orientation shifts. |
| **Phase 4** | **TestFlight & App Store Assets** | • Capture iPad & iPhone Duo App Store screenshots.<br>• Update App Store Connect metadata for compatibility badge. | TestFlight deployment to internal dogfooding devices. |

---

## 5. Development Isolation & Feature Lock Compliance

Per the Kouchd operating policy:
1. **Launch Branch Restriction:** All changes described in this document belong strictly to post-1.0 development. No branch merging to `main` or RC release lines may occur during the 1.0 RC lock.
2. **Dedicated Git Worktree:**
   - iPadOS implementation will occur in: `/Volumes/Projects/CodexWorktrees/kouchd-wre-ipados-adaptation` on branch `codex/post-v1-ipados-adaptation`.
   - iPhone Duo implementation will occur in: `/Volumes/Projects/CodexWorktrees/kouchd-wre-iphone-duo-support` on branch `codex/post-v1-iphone-duo-support`.
3. **Public Roadmap Transparency:** Public capabilities are registered in `help/product/roadmap.mdx` under **Being explored** without promised delivery dates.
