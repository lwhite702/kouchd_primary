// Generated file: placements and variant shares. Don't edit by hand — regenerate it instead.
import Foundation

enum FunnelRuntime {
    static let server: URL? = URL(string: "https://app-api.lee-183.workers.dev/v1")
    static let appKey: String? = "e5KP2WL9C92eSCiYklh6NQ"
    static let placements: [String: (exp: String, variants: [String: Int])] = [
        "host_onboarding": (exp: "2", variants: ["compact": 0, "current": 100, "guided": 0]),
        "guest_onboarding": (exp: "1", variants: ["current": 100]),
        "kouchd_plus_paywall": (exp: "1", variants: ["annual_trial": 50, "current": 50]),
    ]
}
