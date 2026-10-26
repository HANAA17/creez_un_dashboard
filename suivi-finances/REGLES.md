# Suivi de finances perso : règles validées

Plateforme : iPhone (Expo / React Native), données locales (SQLite), usage perso, saisie manuelle.
Devise : dirham (DH) par défaut, euro en option (Plus › Réglages). Seul l'affichage change, les montants ne sont pas convertis.

## Montants
- Saisie et affichage en décimales (`125,50 DH`) ; stockage en centimes entiers.
- Maximum 2 décimales, montant strictement positif ; le sens vient du type de transaction.

## Comptes
- Types : courant, épargne, espèces. Plusieurs comptes possibles.
- Solde = solde de départ + revenus − dépenses ± virements (calculé, jamais saisi).
- Les transactions futures sont « prévues » et ne comptent pas dans le solde.
- Modifier : nom, type, solde de départ. Archiver : le compte disparaît des listes, l'historique reste.
- Supprimer : direct si le compte est vide ; sinon, choix entre archiver ou tout supprimer (transactions, virements liés, planifications), avec le nombre d'éléments concernés.

## Transactions
- Types : dépense, revenu, virement entre comptes. Toutes modifiables et supprimables.
- Un virement n'est ni une dépense ni un revenu (comptes différents obligatoires).
- Une dépense peut être payée depuis une enveloppe d'épargne (par exemple le voyage). Un revenu ne va jamais sur une catégorie d'épargne.

## Enveloppes (budget)
- Chaque catégorie de dépense et chaque objectif d'épargne est une **enveloppe**.
- L'argent reste dans les comptes ; l'enveloppe est une réservation.
- **À répartir** = total des comptes − somme des enveloppes. Il est calculé : il se met à jour tout seul quand un compte ou une transaction change. Le contrôle « enveloppes + à répartir = total des comptes » tient donc toujours.
- **Répartir** : mettre de l'argent « à répartir » dans des enveloppes (à la main ou avec le plan mensuel). Répartir plus que disponible est possible après confirmation ; « à répartir » est alors négatif et signalé.
- **Solde d'une enveloppe** = argent réparti (cumulé) − dépenses de la catégorie. **Pas de remise à zéro en fin de mois** : ce qui n'est pas dépensé s'accumule.
- **Dépassement** autorisé : l'enveloppe passe en négatif, en rouge, avec un bouton « Couvrir » qui la renfloue depuis une autre enveloppe ou depuis « à répartir ».
- **Transférer** : déplacer de l'argent entre deux enveloppes, ou entre une enveloppe et « à répartir ». Rien ne bouge sur les comptes.
- **Plan mensuel** : montant habituel par enveloppe, repris en un geste dans « Répartir ».
- Les dépenses ne vident les enveloppes qu'à partir de la **date de départ** (jour de la mise en place des enveloppes). Les dépenses plus anciennes n'y changent rien.
- Une bannière sur l'accueil signale l'argent à répartir et les enveloppes dépassées.
- Chaque mouvement est consultable (et supprimable) dans le détail de l'enveloppe.

## Épargne
- Un objectif = une enveloppe d'épargne, avec montant cible et date optionnelle.
- Verser = transfert depuis « à répartir » ; retirer = transfert vers « à répartir » ; dépenser = dépense sur la catégorie d'épargne.
- Progression = solde de l'enveloppe ; versement mensuel conseillé si date cible.
- Modifier ou supprimer un objectif : nom, cible, date, couleur, icône.

## Catégories
- Chaque catégorie a une couleur (palette de 8 teintes validées pour le daltonisme, plus un gris) et une icône (48 choix).
- Création, modification, archivage et restauration depuis Plus › Catégories, ou à la volée dans les formulaires.
- Un nom ne peut pas être utilisé deux fois pour un même type.
- **Suppression** : si la catégorie est utilisée, on choisit entre déplacer ses transactions, planifications et l'argent de son enveloppe vers une autre catégorie du même type, ou tout supprimer (l'argent de l'enveloppe retourne alors dans « à répartir »).

## Planifications
- Revenus, dépenses et virements qui se répètent (semaine, mois, an, tous les N). Écran dédié : créer, modifier, mettre en pause, supprimer.
- Le type, le rythme et la date de début sont figés après création.
- Pause : plus aucune échéance créée. À la reprise, les échéances manquées sont ignorées.
- Les échéances sont créées à l'ouverture de l'app ; identifiant déterministe, donc pas de doublon.
- Le 31 tombe le dernier jour des mois plus courts, sans dérive.
- Les planifications d'épargne n'existent plus : l'épargne se fait par répartition (plan mensuel).

## Statistiques
- Dépenses par catégorie (anneau + liste, 5 catégories maximum puis « Autres »).
- Revenus et dépenses sur 6 ou 12 mois, avec vue tableau.
- Évolution du solde total à la fin de chaque mois.
- Répartir n'est pas dépenser ; l'argent mis de côté est compté à part.

## Sauvegarde
- Export / import en fichier JSON (version 2 : inclut les enveloppes). Une sauvegarde ancienne (version 1) est convertie à l'import : les versements d'épargne deviennent des répartitions.

## Code
- `src/domain` : règles métier pures et testées (`npm test`).
