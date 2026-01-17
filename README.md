# Colons of Idlestan

Jeu de stratégie avec génération procédurale de cartes hexagonales.

## Structure du projet

- `src/model/` : Modèle de domaine (hexagones, cartes, ressources)
- `src/controller/` : Logique de contrôle (génération de cartes)
- `src/view/` : Couche d'affichage (rendu des hexagones)
- `src/application/` : Point d'entrée principal (MainGame)

## Installation

```bash
npm install
```

## Développement

### Build du projet

```bash
npm run build
```

### Lancer le serveur de développement

```bash
npm start
```

Ou séparément :

```bash
npm run build  # Compiler le TypeScript
npm run serve  # Lancer le serveur HTTP
```

Le serveur démarre sur `http://localhost:3000`

Ouvrez cette adresse dans votre navigateur pour voir l'application.

### Tests

```bash
npm test
```

## Utilisation

1. Lancez `npm start`
2. Ouvrez `http://localhost:3000` dans votre navigateur
3. Une carte hexagonale sera générée automatiquement avec 5 ressources de chaque type
4. Cliquez sur "Nouvelle Carte" pour générer une nouvelle carte

## Ressources

Les hexagones sont coloriés selon leur ressource :
- **Bois** : Marron
- **Brique** : Rouge brique
- **Blé** : Or
- **Mouton** : Vert clair
- **Minerai** : Gris ardoise
- **Désert** : Sable
- **Eau** : Bleu royal
