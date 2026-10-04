import SwiftUI

/// Titre de section réutilisable.
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    SectionHeader(title: "Raccourcis")
        .padding()
}
