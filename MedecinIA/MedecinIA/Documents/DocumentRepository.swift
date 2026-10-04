import Foundation

/// Contrat de stockage des documents de santé.
protocol DocumentRepository {
    func fetchDocuments() async throws -> [MedicalDocument]
}

/// Implémentation provisoire en mémoire, vide par défaut.
final class InMemoryDocumentRepository: DocumentRepository {
    private var documents: [MedicalDocument]

    init(documents: [MedicalDocument] = []) {
        self.documents = documents
    }

    func fetchDocuments() async throws -> [MedicalDocument] {
        documents.sorted { $0.date > $1.date }
    }
}
