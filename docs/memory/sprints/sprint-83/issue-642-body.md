=====ISSUE #642
[FEATURE] Exposer la bascule de thème hors connexion — landing et Auth (DEC-S82-009)
---
## Contexte

`DEC-S82-009` acte une **bascule de thème globale, exposée aussi hors connexion**. Le mode sombre est une préférence système : imposer du clair à un visiteur dont l'OS est en sombre est une mauvaise première impression, sans recours puisque la bascule n'existe qu'après connexion.

Tout est déjà en place — `ThemeProvider`, tokens complets sur les deux thèmes, persistance `next-themes`. Seule l'exposition du contrôle manque.

## À faire

- Exposer la bascule dans la nav de la landing (`HeaderSection.tsx`) et son menu mobile.
- L'exposer sur les 4 pages Auth, à côté du `LanguageSelector` déjà présent en haut à droite.
- Implémenter le motif de persistance :
  1. avant connexion, le choix vit dans le stockage local (`next-themes` le fait déjà) ;
  2. à la connexion, la préférence de compte gagne si elle existe, sinon le choix local est adopté et devient celle du compte ;
  3. ensuite, la préférence de compte fait foi et suit l'utilisateur entre appareils.

## Critères d'acceptation

- [ ] Bascule accessible sur la landing et sur les 4 pages Auth
- [ ] Le choix fait avant connexion est conservé après
- [ ] Un compte avec préférence explicite n'est pas écrasé par le choix local
- [ ] **Aucun flash de thème au premier rendu** des routes publiques (statiques) — vérifier le script de pré-hydratation de `next-themes`
- [ ] Rendu vérifié dans les deux thèmes sur les deux surfaces

## Dépendances

Ferme le volet thème de #590. La frise reste **sans** bascule propre, conformément à la décision (le thème est une préférence d'application, pas de vue).

## Estimation

S.

## Origine

Mise en œuvre d'un arbitrage de l'audit de conformité du 7 septembre 2026. La décision est prise et consignée ; cette issue porte le travail qui en découle.

