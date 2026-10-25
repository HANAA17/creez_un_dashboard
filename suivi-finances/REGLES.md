# Suivi de finances perso : règles validées

Plateforme : iPhone (Expo / React Native), données locales (SQLite), usage perso, saisie manuelle, EUR.

## Montants
- Saisie et affichage en décimales (`12,50 €`) ; stockage en centimes entiers.
- Maximum 2 décimales, montant strictement positif ; le sens vient du type de transaction.

## Comptes
- Types : courant, épargne, espèces. Plusieurs comptes d'épargne possibles.
- Solde = solde initial + revenus − dépenses ± virements (calculé, jamais saisi).
- Les transactions futures sont « prévues » et ne comptent pas dans le solde.
- Un compte avec des transactions s'archive, il ne se supprime pas.

## Transactions
- Types : dépense, revenu, virement entre comptes.
- Un virement n'est ni une dépense ni un revenu (comptes différents obligatoires).

## Catégories et épargne
- Types : dépense, revenu, épargne.
- Un objectif d'épargne est lié à une catégorie d'épargne. Plusieurs objectifs possibles, chacun avec sa catégorie.
- Dépense sur une catégorie d'épargne = versement ; revenu sur cette catégorie = retrait.
- Les versements d'épargne ne comptent pas comme dépenses et sont affichés à part.
- Progression = versements − retraits ; versement mensuel conseillé si date cible.

## Budgets
- Mois civil (du 1er au dernier jour). Budget par catégorie de dépense, sous-catégories incluses.
- Alerte à 80 %, limite atteinte à 100 %. Pas de report d'un mois sur l'autre.

## Planification répétée (revenus, dépenses, virements)
- Fréquence : hebdomadaire, mensuelle, annuelle, tous les N périodes ; date de fin optionnelle.
- Le 31 tombe le dernier jour des mois plus courts, sans dérive.
- Les échéances sont créées à l'ouverture de l'app ; identifiant déterministe, donc pas de doublon.

## Code
- `src/domain` : règles métier pures et testées (`npm test`).
