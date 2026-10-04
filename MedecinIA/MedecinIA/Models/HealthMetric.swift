import Foundation

/// Une mesure de santé affichable. Aucune donnée réelle n'est encore lue.
struct HealthMetric: Identifiable, Equatable {
    enum Kind: String, CaseIterable, Identifiable {
        case steps
        case heartRate
        case sleep
        case weight

        var id: String { rawValue }

        var title: String {
            switch self {
            case .steps: "Pas"
            case .heartRate: "Fréquence cardiaque"
            case .sleep: "Sommeil"
            case .weight: "Poids"
            }
        }

        var unit: String {
            switch self {
            case .steps: "pas"
            case .heartRate: "bpm"
            case .sleep: "h"
            case .weight: "kg"
            }
        }

        var systemImage: String {
            switch self {
            case .steps: "figure.walk"
            case .heartRate: "heart"
            case .sleep: "bed.double"
            case .weight: "scalemass"
            }
        }
    }

    var id: Kind { kind }
    let kind: Kind
    /// `nil` tant qu'aucune source de données n'est connectée.
    let value: Double?
    let date: Date?
}
