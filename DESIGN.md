# DESIGN – Progression Multi-Couches

## 1. Progression par Île
Chaque partie débute sur une île générée procéduralement. Le joueur doit conquérir, développer et exploiter cette île jusqu’à atteindre des objectifs définis (ex : domination, ressources, développement urbain). La fin d’une île déclenche la transition vers une nouvelle phase de progression.

- Cycle court, gameplay localisé
- Réinitialisation totale des ressources et de la carte à chaque nouvelle île
- Les choix et succès sur l’île influencent la progression de la civilisation

## 2. Progression par Civilisation
Après avoir terminé une île, la civilisation du joueur évolue. Cette couche représente l’accumulation de progrès, de technologies ou de traits hérités des îles précédentes.

- Cycle moyen, gameplay cumulatif
- Héritage de bonus, technologies, ou traits civilisationnels
- Réinitialisation partielle à chaque nouvelle civilisation, mais conservation de certains acquis
- Prépare la transition vers la couche divine

## 3. Progression Divine
Lorsque la civilisation atteint son apogée, le joueur accède à la couche divine. Cette phase permet d’incarner un dieu, d’influencer les civilisations futures, et d’accumuler des pouvoirs ou des méta-bonus.

- Cycle long, gameplay méta
- Ascension et évolution du dieu
- Réinitialisation quasi-totale, mais conservation de pouvoirs divins ou de méta-progrès
- Boucle de jeu : recommencer une nouvelle civilisation avec des avantages divins

## 4. Suggestions techniques
- Structurer les modèles en trois niveaux imbriqués : Île (GameMap, GameState), Civilisation (CivilizationState), Dieu (GodState)
- Chaque couche doit être sérialisable indépendamment pour faciliter la sauvegarde et la reprise
- Découpler strictement les logiques de chaque couche pour faciliter l’extension et la maintenance
- Prévoir des points d’extension pour ajouter des effets d’héritage, des bonus, ou des événements spécifiques à chaque transition
- Documenter clairement les interfaces et les flux de données entre couches dans le code et la documentation
