import SwiftUI

struct DocumentsView: View {
    @State private var viewModel: DocumentsViewModel

    init(viewModel: DocumentsViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        Group {
            if viewModel.documents.isEmpty {
                ContentUnavailableView(
                    "Aucun document",
                    systemImage: "folder",
                    description: Text("Vous pourrez bientôt ajouter vos ordonnances, analyses et comptes rendus.")
                )
            } else {
                List(viewModel.documents) { document in
                    VStack(alignment: .leading, spacing: AppTheme.Spacing.xs) {
                        Text(document.title)
                            .font(.body.weight(.medium))
                        Text("\(document.category.title) · \(document.date.formatted(date: .abbreviated, time: .omitted))")
                            .font(.footnote)
                            .foregroundStyle(AppTheme.Colors.textSecondary)
                    }
                }
                .scrollContentBackground(.hidden)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .screenBackground()
        .navigationTitle(AppTab.documents.title)
        .task { await viewModel.load() }
    }
}

#Preview {
    NavigationStack {
        DocumentsView(viewModel: DocumentsViewModel(repository: InMemoryDocumentRepository()))
    }
}
