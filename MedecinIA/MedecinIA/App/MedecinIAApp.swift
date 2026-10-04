import SwiftUI

/// Point d'entrée de l'application Médecin IA.
@main
struct MedecinIAApp: App {
    /// Conteneur unique des services de l'application.
    /// Les implémentations actuelles sont des placeholders sans données réelles.
    private let services = ServiceContainer.placeholder

    var body: some Scene {
        WindowGroup {
            RootTabView(services: services)
                .tint(AppTheme.Colors.primary)
        }
    }
}
