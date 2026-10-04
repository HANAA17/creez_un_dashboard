import Foundation
import Observation

@MainActor
@Observable
final class DocumentsViewModel {
    private(set) var documents: [MedicalDocument] = []

    private let repository: any DocumentRepository

    init(repository: any DocumentRepository) {
        self.repository = repository
    }

    func load() async {
        documents = (try? await repository.fetchDocuments()) ?? []
    }
}
