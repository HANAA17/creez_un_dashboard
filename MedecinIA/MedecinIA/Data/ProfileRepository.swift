import Foundation

/// Contrat de lecture et d'enregistrement du profil utilisateur.
protocol ProfileRepository {
    func loadProfile() -> UserProfile
    func save(_ profile: UserProfile)
}

/// Implémentation provisoire en mémoire (rien n'est persisté).
final class InMemoryProfileRepository: ProfileRepository {
    private var profile: UserProfile

    init(profile: UserProfile = MockData.demoProfile) {
        self.profile = profile
    }

    func loadProfile() -> UserProfile {
        profile
    }

    func save(_ profile: UserProfile) {
        self.profile = profile
    }
}
