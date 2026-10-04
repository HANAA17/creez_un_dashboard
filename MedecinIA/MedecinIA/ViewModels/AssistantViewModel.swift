import Foundation
import Observation

@MainActor
@Observable
final class AssistantViewModel {
    private(set) var messages: [ChatMessage] = []
    var draft: String = ""

    private let assistant: any AIAssistantService

    init(assistant: any AIAssistantService) {
        self.assistant = assistant
    }

    var isAssistantAvailable: Bool { assistant.isAvailable }

    var canSend: Bool {
        isAssistantAvailable && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
