import SwiftUI

struct HomeView: View {
    @State private var viewModel: HomeViewModel
    @Binding private var selectedTab: AppTab

    init(viewModel: HomeViewModel, selectedTab: Binding<AppTab>) {
        _viewModel = State(initialValue: viewModel)
        _selectedTab = selectedTab
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.l) {
                header

                VStack(spacing: AppTheme.Spacing.s) {
                    SectionHeader(title: "Raccourcis")
                    ForEach(viewModel.shortcuts) { tab in
                        Button {
                            selectedTab = tab
                        } label: {
                            shortcutRow(for: tab)
                        }
                        .buttonStyle(.plain)
                    }
                }

                MedicalDisclaimer()
            }
            .padding(AppTheme.Spacing.m)
        }
        .screenBackground()
        .navigationTitle(AppTab.home.title)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
            Text("Bonjour \(viewModel.greetingName)")
                .font(.title2.weight(.semibold))
            Text("Votre assistant de santé personnel.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.Colors.textSecondary)
        }
    }

    private func shortcutRow(for tab: AppTab) -> some View {
        HStack(spacing: AppTheme.Spacing.m) {
            Image(systemName: tab.systemImage)
                .font(.title3)
                .foregroundStyle(AppTheme.Colors.primary)
                .frame(width: 32)
            Text(tab.title)
                .font(.body.weight(.medium))
            Spacer()
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(AppTheme.Colors.textSecondary)
        }
        .contentShape(Rectangle())
        .cardStyle()
    }
}

#Preview {
    NavigationStack {
        HomeView(viewModel: HomeViewModel(profileRepository: InMemoryProfileRepository()),
                 selectedTab: .constant(.home))
    }
}
