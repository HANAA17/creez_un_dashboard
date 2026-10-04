import SwiftUI

/// Mention rappelant que l'application ne remplace pas un professionnel de santé.
struct MedicalDisclaimer: View {
    var body: some View {
        Label {
            Text("Médecin IA est un assistant d'information. Il ne remplace pas l'avis d'un professionnel de santé. En cas d'urgence, appelez le 15 ou le 112.")
                .font(.footnote)
                .foregroundStyle(AppTheme.Colors.textSecondary)
        } icon: {
            Image(systemName: "exclamationmark.shield")
                .foregroundStyle(AppTheme.Colors.warning)
        }
        .cardStyle()
    }
}

#Preview {
    MedicalDisclaimer()
        .padding()
        .screenBackground()
}
