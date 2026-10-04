import Foundation

/// Contrat de l'assistant conversationnel.
/// L'implémentation réelle (appel à un modèle d'IA) sera ajoutée dans une étape ultérieure.
protocol AIAssistantService {
    /// Indique si l'assistant est opérationnel.
    var isAvailable: Bool { get }

    /// Produit une réponse à partir de l'historique de conversation.
    func reply(to conversation: [ChatMessage]) async throws -> ChatMessage
}

/// Implémentation provisoire : aucune API n'est appelée, aucune analyse n'est faite.
struct PlaceholderAIAssistantService: AIAssistantService {
    let isAvailable = false

    func reply(to conversation: [ChatMessage]) async throws -> ChatMessage {
        ChatMessage(role: .assistant,
                    text: "L'assistant Médecin IA n'est pas encore disponible.")
    }
}
