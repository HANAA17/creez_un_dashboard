import Foundation

/// Profil de l'utilisateur. Volontairement minimal à ce stade.
struct UserProfile: Equatable {
    var firstName: String
    var lastName: String

    var displayName: String {
        [firstName, lastName]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
    }
}
