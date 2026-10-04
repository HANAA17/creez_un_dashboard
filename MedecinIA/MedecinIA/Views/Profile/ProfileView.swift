import SwiftUI

struct ProfileView: View {
    @State private var viewModel: ProfileViewModel

    init(viewModel: ProfileViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        List {
            Section {
                HStack(spacing: AppTheme.Spacing.m) {
                    Text(viewModel.initials)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white)
                        .frame(width: 56, height: 56)
                        .background(AppTheme.Colors.primary, in: Circle())
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text(viewModel.profile.displayName)
                            .font(.headline)
                        Text("Profil de démonstration")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.Colors.textSecondary)
                    }
                }
                .padding(.vertical, AppTheme.Spacing.xs)
            }

            Section("Bientôt disponible") {
                Label("Informations médicales", systemImage: "cross.case")
                Label("Confidentialité et données", systemImage: "lock.shield")
                Label("Notifications", systemImage: "bell")
            }
            .foregroundStyle(AppTheme.Colors.textSecondary)

            Section {
                LabeledContent("Version", value: appVersion)
            }
        }
        .scrollContentBackground(.hidden)
        .screenBackground()
        .navigationTitle(AppTab.profile.title)
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }
}

#Preview {
    NavigationStack {
        ProfileView(viewModel: ProfileViewModel(profileRepository: InMemoryProfileRepository()))
    }
}
