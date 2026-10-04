import SwiftUI
import UIKit

/// Thème visuel de l'application : sobre, clair, inspiré des interfaces médicales.
/// Toutes les couleurs s'adaptent automatiquement au mode sombre.
enum AppTheme {
    enum Colors {
        /// Bleu-vert médical, couleur principale.
        static let primary = Color(light: 0x0E7C86, dark: 0x3FBFC9)
        /// Bleu doux, couleur secondaire.
        static let secondary = Color(light: 0x3A6EA5, dark: 0x7FA8D6)
        /// Fond général des écrans.
        static let background = Color(light: 0xF4F7F9, dark: 0x0F1417)
        /// Fond des cartes.
        static let surface = Color(light: 0xFFFFFF, dark: 0x1A2126)
        /// Texte secondaire.
        static let textSecondary = Color(light: 0x5B6B75, dark: 0x9AA9B2)
        /// Couleur d'avertissement (mentions importantes).
        static let warning = Color(light: 0xB7791F, dark: 0xE0B354)
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let s: CGFloat = 8
        static let m: CGFloat = 16
        static let l: CGFloat = 24
        static let xl: CGFloat = 32
    }

    enum Radius {
        static let card: CGFloat = 16
        static let small: CGFloat = 10
    }
}

extension Color {
    /// Couleur dynamique définie par deux valeurs hexadécimales (mode clair / mode sombre).
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(hex: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255,
                  green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255,
                  alpha: 1)
    }
}

/// Style de carte commun à toute l'application.
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(AppTheme.Spacing.m)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.Colors.surface,
                        in: RoundedRectangle(cornerRadius: AppTheme.Radius.card, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }

    /// Fond standard d'un écran.
    func screenBackground() -> some View {
        background(AppTheme.Colors.background.ignoresSafeArea())
    }
}
