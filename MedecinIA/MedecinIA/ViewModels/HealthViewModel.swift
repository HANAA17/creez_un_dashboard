import Foundation
import Observation

@MainActor
@Observable
final class HealthViewModel {
    private(set) var metrics: [HealthMetric] = []

    private let healthDataProvider: any HealthDataProvider

    init(healthDataProvider: any HealthDataProvider) {
        self.healthDataProvider = healthDataProvider
    }

    var isSourceConnected: Bool { healthDataProvider.isAvailable }

    func load() async {
        metrics = (try? await healthDataProvider.latestMetrics(for: HealthMetric.Kind.allCases)) ?? []
    }
}
