import Foundation

/// Les sections principales de l'application, dans l'ordre de la barre d'onglets.
enum AppTab: String, CaseIterable, Identifiable, Hashable {
    case home
    case assistant
    case health
    case documents
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Accueil"
        case .assistant: "Médecin IA"
        case .health: "Santé"
        case .documents: "Documents"
        case .profile: "Profil"
        }
    }

    /// Nom du symbole SF Symbols associé à l'onglet.
    var systemImage: String {
        switch self {
        case .home: "house"
        case .assistant: "stethoscope"
        case .health: "heart.text.square"
        case .documents: "folder"
        case .profile: "person.crop.circle"
        }
    }
}
