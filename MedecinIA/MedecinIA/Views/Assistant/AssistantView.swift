import SwiftUI

struct AssistantView: View {
    @State private var viewModel: AssistantViewModel

    init(viewModel: AssistantViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: AppTheme.Spacing.m) {
                    if viewModel.messages.isEmpty {
                        ContentUnavailableView(
                            "Médecin IA",
                            systemImage: "stethoscope",
                            description: Text("L'assistant conversationnel sera disponible dans une prochaine version.")
                        )
                        .padding(.top, AppTheme.Spacing.xl)
                    }
                    MedicalDisclaimer()
                }
                .padding(AppTheme.Spacing.m)
            }

            inputBar
        }
        .screenBackground()
        .navigationTitle(AppTab.assistant.title)
    }

    private var inputBar: some View {
        HStack(spacing: AppTheme.Spacing.s) {
            TextField("Posez votre question…", text: $viewModel.draft, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)
            Button {
                // L'envoi sera branché sur l'assistant lors d'une étape ultérieure.
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.title)
            }
            .disabled(!viewModel.canSend)
            .accessibilityLabel("Envoyer")
        }
        .disabled(!viewModel.isAssistantAvailable)
        .padding(AppTheme.Spacing.m)
        .background(.bar)
    }
}

#Preview {
    NavigationStack {
        AssistantView(viewModel: AssistantViewModel(assistant: PlaceholderAIAssistantService()))
    }
}
