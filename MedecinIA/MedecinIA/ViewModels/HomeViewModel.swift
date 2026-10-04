import Foundation
import Observation

@MainActor
@Observable
final class HomeViewModel {
    private(set) var greetingName: String

    init(profileRepository: any ProfileRepository) {
        greetingName = profileRepository.loadProfile().firstName
    }

    /// Raccourcis affichés sur l'écran d'accueil.
    let shortcuts: [AppTab] = [.assistant, .health, .documents]
}
