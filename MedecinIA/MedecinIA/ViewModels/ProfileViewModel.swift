import Foundation
import Observation

@MainActor
@Observable
final class ProfileViewModel {
    private(set) var profile: UserProfile

    init(profileRepository: any ProfileRepository) {
        profile = profileRepository.loadProfile()
    }

    var initials: String {
        [profile.firstName, profile.lastName]
            .compactMap(\.first)
            .map { String($0) }
            .joined()
    }
}
