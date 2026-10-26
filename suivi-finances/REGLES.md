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

## Catégories
- Chaque catégorie a une couleur (palette de 8 teintes validées pour le daltonisme, plus un gris) et une icône (48 choix).
- Création, modification, archivage et restauration depuis Plus › Catégories, ou à la volée dans le formulaire d'ajout.
- Un nom ne peut pas être utilisé deux fois pour un même type. Une catégorie archivée garde ses transactions passées.
- Une catégorie liée à un objectif d'épargne se renomme et se recolore, mais ne s'archive pas.

## Planifications
- Écran dédié (Plus › Planifications) : créer, modifier (montant, comptes, catégorie, note, date de fin), mettre en pause, supprimer.
- Le type, le rythme et la date de début sont figés après création (supprimer puis recréer pour les changer).
- Pause : plus aucune échéance créée. À la reprise, les échéances manquées sont ignorées (pas de rattrapage).
- Une planification terminée (date de fin passée) reste visible dans « Terminées ».

## Statistiques
- Dépenses par catégorie (anneau + liste, 5 catégories maximum puis « Autres », hors épargne).
- Revenus et dépenses sur 6 ou 12 mois, avec vue tableau.
- Évolution du solde total à la fin de chaque mois.

## Code
- `src/domain` : règles métier pures et testées (`npm test`).
