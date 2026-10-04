import SwiftUI

/// Carte indiquant qu'une fonctionnalité sera disponible prochainement.
struct ComingSoonCard: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        HStack(alignment: .top, spacing: AppTheme.Spacing.m) {
            Image(systemName: systemImage)
                .font(.title2)
                .foregroundStyle(AppTheme.Colors.primary)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(AppTheme.Colors.textSecondary)
            }
        }
        .cardStyle()
    }
}

#Preview {
    ComingSoonCard(title: "Bientôt disponible",
                   message: "Cette fonctionnalité arrive prochainement.",
                   systemImage: "sparkles")
        .padding()
        .screenBackground()
}
