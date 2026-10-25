# Mes Finances

App iPhone de suivi de dépenses, revenus, comptes, épargnes et budgets. Données locales (SQLite), saisie manuelle.
Les règles de gestion sont dans [REGLES.md](REGLES.md).

## Lancer l'app sur ton iPhone
1. Installe **Expo Go** depuis l'App Store.
2. Sur un ordinateur : `cd suivi-finances && npm install && npx expo start`
3. Scanne le QR code avec l'appareil photo de l'iPhone (même réseau Wi-Fi).

## Développement
- `npm test` : tests des règles métier et de la sauvegarde
- `npm run typecheck` : vérification TypeScript

## Organisation
- `src/domain` : règles métier pures (montants, soldes, budgets, objectifs, récurrences)
- `src/db` : schéma SQLite et accès aux données
- `src/state` : contexte React qui relie base de données et règles
- `src/screens`, `src/ui` : écrans et composants
