# Médecin IA — prototype iOS

Assistant de santé personnel pour iPhone (SwiftUI). **Étape 1 : initialisation du projet.**

## Prérequis

- Xcode 16 ou plus récent (le projet utilise les « dossiers synchronisés » d'Xcode 16)
- iOS 17.0 minimum (framework `Observation`)
- Aucune dépendance externe

## Lancer l'application

1. Ouvrir `MedecinIA.xcodeproj`.
2. Choisir le schéma **MedecinIA** et un simulateur iPhone.
3. `⌘R`.

En ligne de commande :

```sh
xcodebuild -project MedecinIA.xcodeproj -scheme MedecinIA \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```

Pour un appareil réel, sélectionner une équipe dans *Signing & Capabilities*.

## Architecture

MVVM + services injectés via des protocoles.

```
MedecinIA/
├── App/          Point d'entrée, onglets (AppTab), navigation racine
├── Models/       Types de données simples (profil, message, mesure, document)
├── Views/        Écrans SwiftUI par section + Theme/ + Components/
├── ViewModels/   Un ViewModel @Observable par écran
├── Services/     ServiceContainer : point unique d'injection des dépendances
├── Data/         Dépôts de données locales et données fictives (MockData)
├── AI/           Contrat de l'assistant IA (implémentation placeholder)
├── HealthKit/    Contrat d'accès aux données de santé (sans HealthKit pour l'instant)
└── Documents/    Contrat de stockage des documents (en mémoire)
```

Principes :

- Chaque fonctionnalité future (IA, HealthKit, documents) est définie par un **protocole** ;
  l'implémentation réelle remplacera le placeholder dans `ServiceContainer` sans toucher aux vues.
- Les vues ne connaissent que leur ViewModel ; les ViewModels ne connaissent que des protocoles.
- Le thème (`Views/Theme/AppTheme.swift`) centralise couleurs, espacements et rayons ; mode sombre géré.
- Tout fichier ajouté dans `MedecinIA/` est automatiquement inclus dans la cible Xcode.

## État actuel

- Aucune API IA, aucune donnée médicale réelle, aucune logique de diagnostic, pas de HealthKit.
