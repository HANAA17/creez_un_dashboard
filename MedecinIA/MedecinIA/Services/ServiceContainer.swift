import Foundation

/// Regroupe les services de l'application et permet de les remplacer facilement
/// (implémentations réelles, données de test, aperçus).
struct ServiceContainer {
    let assistant: any AIAssistantService
    let healthDataProvider: any HealthDataProvider
    let documentRepository: any DocumentRepository
    let profileRepository: any ProfileRepository
}

extension ServiceContainer {
    /// Services provisoires : aucune API, aucune donnée réelle, aucun accès HealthKit.
    static let placeholder = ServiceContainer(
        assistant: PlaceholderAIAssistantService(),
        healthDataProvider: PlaceholderHealthDataProvider(),
        documentRepository: InMemoryDocumentRepository(),
        profileRepository: InMemoryProfileRepository()
    )
}
