import Foundation

/// Un document de santé (ordonnance, compte rendu, analyse…).
struct MedicalDocument: Identifiable, Equatable {
    enum Category: String, CaseIterable, Identifiable {
        case prescription
        case labResult
        case report
        case other

        var id: String { rawValue }

        var title: String {
            switch self {
            case .prescription: "Ordonnance"
            case .labResult: "Analyse"
            case .report: "Compte rendu"
            case .other: "Autre"
            }
        }
    }

    let id: UUID
    var title: String
    var category: Category
    var date: Date

    init(id: UUID = UUID(), title: String, category: Category, date: Date) {
        self.id = id
        self.title = title
        self.category = category
        self.date = date
    }
}
