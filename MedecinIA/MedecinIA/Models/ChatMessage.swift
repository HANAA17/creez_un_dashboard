import Foundation

/// Un message échangé avec l'assistant Médecin IA.
struct ChatMessage: Identifiable, Equatable {
    enum Role: Equatable {
        case user
        case assistant
    }

    let id: UUID
    let role: Role
    let text: String
    let date: Date

    init(id: UUID = UUID(), role: Role, text: String, date: Date = .now) {
        self.id = id
        self.role = role
        self.text = text
        self.date = date
    }
}
