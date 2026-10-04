import SwiftUI

struct HealthView: View {
    @State private var viewModel: HealthViewModel

    init(viewModel: HealthViewModel) {
        _viewModel = State(initialValue: viewModel)
    }

    private let columns = [GridItem(.flexible(), spacing: AppTheme.Spacing.m),
                           GridItem(.flexible(), spacing: AppTheme.Spacing.m)]

    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.Spacing.l) {
                if !viewModel.isSourceConnected {
                    ComingSoonCard(title: "Apple Santé non connecté",
                                   message: "La synchronisation avec Apple Santé sera proposée dans une prochaine version.",
                                   systemImage: "heart.text.square")
                }

                LazyVGrid(columns: columns, spacing: AppTheme.Spacing.m) {
                    ForEach(viewModel.metrics) { metric in
                        MetricTile(metric: metric)
                    }
                }
            }
            .padding(AppTheme.Spacing.m)
        }
        .screenBackground()
        .navigationTitle(AppTab.health.title)
        .task { await viewModel.load() }
    }
}

/// Tuile affichant une mesure de santé (ou un tiret en l'absence de donnée).
private struct MetricTile: View {
    let metric: HealthMetric

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.s) {
            Image(systemName: metric.kind.systemImage)
                .foregroundStyle(AppTheme.Colors.primary)
            Text(metric.kind.title)
                .font(.footnote)
                .foregroundStyle(AppTheme.Colors.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(valueText)
                .font(.title3.weight(.semibold))
        }
        .cardStyle()
    }

    private var valueText: String {
        guard let value = metric.value else { return "—" }
        return "\(value.formatted(.number.precision(.fractionLength(0...1)))) \(metric.kind.unit)"
    }
}

#Preview {
    NavigationStack {
        HealthView(viewModel: HealthViewModel(healthDataProvider: PlaceholderHealthDataProvider()))
    }
}
