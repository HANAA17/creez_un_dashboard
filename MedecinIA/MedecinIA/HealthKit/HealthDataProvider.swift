import Foundation

/// Contrat d'accès aux données de santé.
/// Une implémentation basée sur HealthKit viendra plus tard ; ce fichier n'importe pas HealthKit.
protocol HealthDataProvider {
    /// Indique si une source de données de santé est connectée.
    var isAvailable: Bool { get }

    /// Dernières valeurs connues pour les mesures demandées.
    func latestMetrics(for kinds: [HealthMetric.Kind]) async throws -> [HealthMetric]
}

/// Implémentation provisoire : renvoie des mesures vides, sans aucune donnée.
struct PlaceholderHealthDataProvider: HealthDataProvider {
    let isAvailable = false

    func latestMetrics(for kinds: [HealthMetric.Kind]) async throws -> [HealthMetric] {
        kinds.map { HealthMetric(kind: $0, value: nil, date: nil) }
    }
}
