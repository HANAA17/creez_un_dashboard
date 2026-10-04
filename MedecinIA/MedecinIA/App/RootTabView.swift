import SwiftUI

/// Navigation principale : une barre d'onglets, chaque onglet possédant sa propre pile de navigation.
struct RootTabView: View {
    @State private var selectedTab: AppTab = .home

    private let services: ServiceContainer

    init(services: ServiceContainer) {
        self.services = services
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    screen(for: tab)
                }
                .tabItem { Label(tab.title, systemImage: tab.systemImage) }
                .tag(tab)
            }
        }
    }

    /// Construit l'écran d'un onglet en lui injectant ses dépendances.
    @ViewBuilder
    private func screen(for tab: AppTab) -> some View {
        switch tab {
        case .home:
            HomeView(viewModel: HomeViewModel(profileRepository: services.profileRepository),
                     selectedTab: $selectedTab)
        case .assistant:
            AssistantView(viewModel: AssistantViewModel(assistant: services.assistant))
        case .health:
            HealthView(viewModel: HealthViewModel(healthDataProvider: services.healthDataProvider))
        case .documents:
            DocumentsView(viewModel: DocumentsViewModel(repository: services.documentRepository))
        case .profile:
            ProfileView(viewModel: ProfileViewModel(profileRepository: services.profileRepository))
        }
    }
}

#Preview {
    RootTabView(services: .placeholder)
}
