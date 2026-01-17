// src/model/hex/Edge.ts
var Edge = class _Edge {
  constructor(hex1, hex2) {
    this.hex1 = hex1;
    this.hex2 = hex2;
    const distance = hex1.distanceTo(hex2);
    if (distance !== 1) {
      throw new Error(
        `Les hexagones doivent \xEAtre adjacents pour former une ar\xEAte. Distance: ${distance}`
      );
    }
  }
  /**
   * Crée une arête entre deux hexagones adjacents.
   * Normalise l'ordre pour garantir l'unicité.
   */
  static create(hex1, hex2) {
    const normalized = _Edge.normalize(hex1, hex2);
    return new _Edge(normalized[0], normalized[1]);
  }
  /**
   * Normalise l'ordre de deux coordonnées pour garantir l'unicité.
   * Ordre: q d'abord, puis r si égalité.
   */
  static normalize(hex1, hex2) {
    if (hex1.q < hex2.q || hex1.q === hex2.q && hex1.r < hex2.r) {
      return [hex1, hex2];
    }
    return [hex2, hex1];
  }
  /**
   * Vérifie si cette arête est égale à une autre.
   */
  equals(other) {
    return this.hex1.equals(other.hex1) && this.hex2.equals(other.hex2) || this.hex1.equals(other.hex2) && this.hex2.equals(other.hex1);
  }
  /**
   * Retourne les deux hexagones de cette arête.
   */
  getHexes() {
    return [this.hex1, this.hex2];
  }
  /**
   * Vérifie si cette arête est adjacente à un hexagone donné.
   */
  isAdjacentTo(hex) {
    return this.hex1.equals(hex) || this.hex2.equals(hex);
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `Edge(${this.hex1.toString()} - ${this.hex2.toString()})`;
  }
  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode() {
    const normalized = _Edge.normalize(this.hex1, this.hex2);
    return `${normalized[0].hashCode()}-${normalized[1].hashCode()}`;
  }
};

// src/model/hex/Vertex.ts
var Vertex = class _Vertex {
  constructor(hex1, hex2, hex3) {
    this.hex1 = hex1;
    this.hex2 = hex2;
    this.hex3 = hex3;
    if (!_Vertex.isValidTriangle(hex1, hex2, hex3)) {
      throw new Error(
        "Les trois hexagones doivent former un triangle valide pour cr\xE9er un sommet."
      );
    }
  }
  /**
   * Crée un sommet à partir de trois hexagones adjacents.
   * Normalise l'ordre pour garantir l'unicité.
   */
  static create(hex1, hex2, hex3) {
    const normalized = _Vertex.normalize(hex1, hex2, hex3);
    return new _Vertex(normalized[0], normalized[1], normalized[2]);
  }
  /**
   * Vérifie si trois hexagones forment un triangle valide (se rencontrent à un sommet).
   * Dans une grille hexagonale, trois hexagones se rencontrent à un sommet si et seulement si
   * ils sont tous mutuellement adjacents (distance 1 entre chaque paire).
   */
  static isValidTriangle(hex1, hex2, hex3) {
    const d12 = hex1.distanceTo(hex2);
    const d13 = hex1.distanceTo(hex3);
    const d23 = hex2.distanceTo(hex3);
    return d12 === 1 && d13 === 1 && d23 === 1;
  }
  /**
   * Normalise l'ordre de trois coordonnées pour garantir l'unicité.
   * Trie par q puis r.
   */
  static normalize(hex1, hex2, hex3) {
    const hexes = [hex1, hex2, hex3];
    hexes.sort((a, b) => {
      if (a.q !== b.q) return a.q - b.q;
      return a.r - b.r;
    });
    return [hexes[0], hexes[1], hexes[2]];
  }
  /**
   * Vérifie si ce sommet est égal à un autre.
   */
  equals(other) {
    const thisHexes = _Vertex.normalize(this.hex1, this.hex2, this.hex3);
    const otherHexes = _Vertex.normalize(other.hex1, other.hex2, other.hex3);
    return thisHexes[0].equals(otherHexes[0]) && thisHexes[1].equals(otherHexes[1]) && thisHexes[2].equals(otherHexes[2]);
  }
  /**
   * Retourne les trois hexagones de ce sommet.
   */
  getHexes() {
    return [this.hex1, this.hex2, this.hex3];
  }
  /**
   * Vérifie si ce sommet est adjacent à un hexagone donné.
   */
  isAdjacentTo(hex) {
    return this.hex1.equals(hex) || this.hex2.equals(hex) || this.hex3.equals(hex);
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `Vertex(${this.hex1.toString()}, ${this.hex2.toString()}, ${this.hex3.toString()})`;
  }
  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode() {
    const normalized = _Vertex.normalize(this.hex1, this.hex2, this.hex3);
    return `${normalized[0].hashCode()}-${normalized[1].hashCode()}-${normalized[2].hashCode()}`;
  }
};

// src/model/hex/HexDirection.ts
var ALL_DIRECTIONS = [
  0 /* N */,
  1 /* NE */,
  2 /* SE */,
  3 /* S */,
  4 /* SW */,
  5 /* NW */
];

// src/model/hex/HexGrid.ts
var HexGrid = class {
  /**
   * Crée une nouvelle grille hexagonale.
   * @param hexes - Tableau d'hexagones à ajouter à la grille
   */
  constructor(hexes = []) {
    this.hexMap = /* @__PURE__ */ new Map();
    this.edgeCache = /* @__PURE__ */ new Map();
    this.vertexCache = /* @__PURE__ */ new Map();
    for (const hex of hexes) {
      this.hexMap.set(hex.coord.hashCode(), hex);
    }
    this.precomputeEdgesAndVertices();
  }
  /**
   * Retourne l'hexagone à la coordonnée spécifiée, ou undefined s'il n'existe pas.
   */
  getHex(coord) {
    return this.hexMap.get(coord.hashCode());
  }
  /**
   * Retourne tous les hexagones de la grille.
   */
  getAllHexes() {
    return Array.from(this.hexMap.values());
  }
  /**
   * Retourne les hexagones voisins de l'hexagone à la coordonnée spécifiée.
   * Ne retourne que les voisins qui existent dans la grille.
   */
  getNeighbors(coord) {
    const neighbors = [];
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const neighbor = this.getHex(neighborCoord);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }
  /**
   * Retourne les coordonnées des voisins (même s'ils n'existent pas dans la grille).
   */
  getNeighborCoords(coord) {
    return coord.neighbors();
  }
  /**
   * Retourne toutes les arêtes adjacentes à un hexagone donné.
   * Une arête est adjacente si elle connecte cet hexagone à un voisin.
   */
  getEdges(coord) {
    const edges = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return edges;
    }
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const neighbor = this.getHex(neighborCoord);
      if (neighbor) {
        const edge = Edge.create(coord, neighborCoord);
        edges.push(edge);
      }
    }
    return edges;
  }
  /**
   * Retourne toutes les arêtes de la grille.
   */
  getAllEdges() {
    return Array.from(this.edgeCache.values());
  }
  /**
   * Retourne toutes les arêtes adjacentes à un hexagone donné.
   * Inclut toutes les arêtes qui touchent cet hexagone, même celles
   * qui ne connectent pas à un autre hexagone de la grille.
   */
  getEdgesForHex(coord) {
    const edges = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return edges;
    }
    for (const direction of ALL_DIRECTIONS) {
      const neighborCoord = coord.neighbor(direction);
      const edge = Edge.create(coord, neighborCoord);
      const edgeKey = edge.hashCode();
      if (!this.edgeCache.has(edgeKey)) {
        this.edgeCache.set(edgeKey, edge);
      }
      edges.push(this.edgeCache.get(edgeKey));
    }
    return edges;
  }
  /**
   * Retourne tous les sommets adjacents à un hexagone donné.
   * Un sommet est adjacent s'il est formé par cet hexagone et deux de ses voisins.
   */
  getVertices(coord) {
    const vertices = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return vertices;
    }
    const directions = ALL_DIRECTIONS;
    for (let i = 0; i < directions.length; i++) {
      const dir1 = directions[i];
      const dir2 = directions[(i + 1) % directions.length];
      const neighbor1 = coord.neighbor(dir1);
      const neighbor2 = coord.neighbor(dir2);
      const hex1 = this.getHex(neighbor1);
      const hex2 = this.getHex(neighbor2);
      if (hex1 && hex2) {
        try {
          const vertex = Vertex.create(coord, neighbor1, neighbor2);
          const vertexKey = vertex.hashCode();
          if (!this.vertexCache.has(vertexKey)) {
            this.vertexCache.set(vertexKey, vertex);
          }
          vertices.push(this.vertexCache.get(vertexKey));
        } catch (e) {
        }
      }
    }
    return vertices;
  }
  /**
   * Retourne tous les sommets de la grille.
   */
  getAllVertices() {
    return Array.from(this.vertexCache.values());
  }
  /**
   * Retourne tous les sommets qui touchent un hexagone donné.
   * Inclut les sommets même si certains voisins n'existent pas dans la grille.
   */
  getVerticesForHex(coord) {
    const vertices = [];
    const hex = this.getHex(coord);
    if (!hex) {
      return vertices;
    }
    const directions = ALL_DIRECTIONS;
    for (let i = 0; i < directions.length; i++) {
      const dir1 = directions[i];
      const dir2 = directions[(i + 1) % directions.length];
      const neighbor1 = coord.neighbor(dir1);
      const neighbor2 = coord.neighbor(dir2);
      try {
        const vertex = Vertex.create(coord, neighbor1, neighbor2);
        const vertexKey = vertex.hashCode();
        if (!this.vertexCache.has(vertexKey)) {
          this.vertexCache.set(vertexKey, vertex);
        }
        vertices.push(this.vertexCache.get(vertexKey));
      } catch (e) {
      }
    }
    return vertices;
  }
  /**
   * Pré-calcule toutes les arêtes et sommets pour optimiser les recherches.
   */
  precomputeEdgesAndVertices() {
    for (const hex of this.hexMap.values()) {
      this.getEdgesForHex(hex.coord);
    }
    for (const hex of this.hexMap.values()) {
      this.getVerticesForHex(hex.coord);
    }
  }
  /**
   * Retourne le nombre d'hexagones dans la grille.
   */
  size() {
    return this.hexMap.size;
  }
  /**
   * Vérifie si un hexagone existe à la coordonnée spécifiée.
   */
  hasHex(coord) {
    return this.hexMap.has(coord.hashCode());
  }
};

// src/model/hex/Hex.ts
var Hex = class {
  constructor(coord) {
    this.coord = coord;
  }
  /**
   * Vérifie l'égalité avec un autre Hex (égalité structurelle sur la coordonnée).
   */
  equals(other) {
    return this.coord.equals(other.coord);
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `Hex(${this.coord.toString()})`;
  }
};

// src/model/hex/HexCoord.ts
var HexCoord = class _HexCoord {
  constructor(q, r) {
    this.q = q;
    this.r = r;
  }
  /**
   * Retourne la coordonnée s (dérivée) pour compatibilité avec système cubique.
   * Dans le système axial, s = -q - r
   */
  get s() {
    return -this.q - this.r;
  }
  /**
   * Retourne les coordonnées du voisin dans la direction spécifiée.
   * Les déplacements sont définis pour le système de coordonnées axiales.
   */
  neighbor(direction) {
    const deltas = {
      [0 /* N */]: [0, -1],
      [1 /* NE */]: [1, -1],
      [2 /* SE */]: [1, 0],
      [3 /* S */]: [0, 1],
      [4 /* SW */]: [-1, 1],
      [5 /* NW */]: [-1, 0]
    };
    const [dq, dr] = deltas[direction];
    return new _HexCoord(this.q + dq, this.r + dr);
  }
  /**
   * Retourne tous les voisins de cet hexagone.
   */
  neighbors() {
    return ALL_DIRECTIONS.map((dir) => this.neighbor(dir));
  }
  /**
   * Calcule la distance entre deux hexagones.
   */
  distanceTo(other) {
    return (Math.abs(this.q - other.q) + Math.abs(this.q + this.r - other.q - other.r) + Math.abs(this.r - other.r)) / 2;
  }
  /**
   * Vérifie l'égalité avec un autre HexCoord.
   */
  equals(other) {
    return this.q === other.q && this.r === other.r;
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `(${this.q}, ${this.r})`;
  }
  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode() {
    return `${this.q},${this.r}`;
  }
};

// src/model/map/GameMap.ts
var GameMap = class {
  /**
   * Crée une nouvelle carte de jeu à partir d'une grille hexagonale.
   * @param grid - La grille hexagonale sous-jacente
   */
  constructor(grid) {
    this.grid = grid;
    this.resourceMap = /* @__PURE__ */ new Map();
    this.cities = /* @__PURE__ */ new Set();
    this.roads = /* @__PURE__ */ new Set();
    this.registeredCivilizations = /* @__PURE__ */ new Set();
    this.cityOwner = /* @__PURE__ */ new Map();
    this.roadOwner = /* @__PURE__ */ new Map();
    for (const hex of grid.getAllHexes()) {
      this.resourceMap.set(hex.coord.hashCode(), "Desert" /* Desert */);
    }
  }
  /**
   * Retourne la grille hexagonale sous-jacente.
   */
  getGrid() {
    return this.grid;
  }
  /**
   * Définit le type de ressource pour un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @param resource - Le type de ressource
   * @throws Error si l'hexagone n'existe pas dans la grille
   */
  setResource(hex, resource) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      throw new Error(`L'hexagone \xE0 la coordonn\xE9e ${coord.toString()} n'existe pas dans la grille.`);
    }
    this.resourceMap.set(coord.hashCode(), resource);
  }
  /**
   * Retourne le type de ressource d'un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @returns Le type de ressource, ou undefined si l'hexagone n'existe pas
   */
  getResource(hex) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return void 0;
    }
    return this.resourceMap.get(coord.hashCode());
  }
  /**
   * Enregistre une civilisation dans la carte.
   * @param civId - L'identifiant de la civilisation
   */
  registerCivilization(civId) {
    this.registeredCivilizations.add(civId.hashCode());
  }
  /**
   * Vérifie si une civilisation est enregistrée.
   * @param civId - L'identifiant de la civilisation
   * @returns true si la civilisation est enregistrée
   */
  isCivilizationRegistered(civId) {
    return this.registeredCivilizations.has(civId.hashCode());
  }
  /**
   * Ajoute une ville sur un sommet pour une civilisation donnée.
   * @param vertex - Le sommet où placer la ville
   * @param civId - L'identifiant de la civilisation propriétaire
   * @throws Error si le sommet n'est pas valide dans la grille
   * @throws Error si une ville existe déjà sur ce sommet
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addCity(vertex, civId) {
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistr\xE9e.`);
    }
    const vertexKey = vertex.hashCode();
    if (this.cities.has(vertexKey)) {
      throw new Error(`Une ville existe d\xE9j\xE0 sur le sommet ${vertex.toString()}.`);
    }
    const hexes = vertex.getHexes();
    const hasValidHex = hexes.some((coord) => this.grid.hasHex(coord));
    if (!hasValidHex) {
      throw new Error(`Le sommet ${vertex.toString()} n'est pas valide dans la grille.`);
    }
    this.cities.add(vertexKey);
    this.cityOwner.set(vertexKey, civId);
  }
  /**
   * Vérifie si une ville existe sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns true si une ville existe sur ce sommet
   */
  hasCity(vertex) {
    return this.cities.has(vertex.hashCode());
  }
  /**
   * Ajoute une route sur une arête pour une civilisation donnée.
   * @param edge - L'arête où placer la route
   * @param civId - L'identifiant de la civilisation propriétaire
   * @throws Error si l'arête n'est pas valide dans la grille
   * @throws Error si une route existe déjà sur cette arête
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addRoad(edge, civId) {
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistr\xE9e.`);
    }
    const edgeKey = edge.hashCode();
    if (this.roads.has(edgeKey)) {
      throw new Error(`Une route existe d\xE9j\xE0 sur l'ar\xEAte ${edge.toString()}.`);
    }
    const [hex1, hex2] = edge.getHexes();
    const hasValidHex = this.grid.hasHex(hex1) || this.grid.hasHex(hex2);
    if (!hasValidHex) {
      throw new Error(`L'ar\xEAte ${edge.toString()} n'est pas valide dans la grille.`);
    }
    this.roads.add(edgeKey);
    this.roadOwner.set(edgeKey, civId);
  }
  /**
   * Retourne le propriétaire d'une ville sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de ville
   */
  getCityOwner(vertex) {
    return this.cityOwner.get(vertex.hashCode());
  }
  /**
   * Retourne le propriétaire d'une route sur une arête.
   * @param edge - L'arête à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de route
   */
  getRoadOwner(edge) {
    return this.roadOwner.get(edge.hashCode());
  }
  /**
   * Retourne toutes les villes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des sommets contenant des villes de cette civilisation
   */
  getCitiesForCivilization(civId) {
    const cities = [];
    const civKey = civId.hashCode();
    for (const vertex of this.grid.getAllVertices()) {
      const owner = this.cityOwner.get(vertex.hashCode());
      if (owner && owner.hashCode() === civKey) {
        cities.push(vertex);
      }
    }
    return cities;
  }
  /**
   * Retourne toutes les routes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des arêtes contenant des routes de cette civilisation
   */
  getRoadsForCivilization(civId) {
    const roads = [];
    const civKey = civId.hashCode();
    for (const hex of this.grid.getAllHexes()) {
      const edges = this.grid.getEdgesForHex(hex.coord);
      for (const edge of edges) {
        const owner = this.roadOwner.get(edge.hashCode());
        if (owner && owner.hashCode() === civKey && !roads.some((e) => e.equals(edge))) {
          roads.push(edge);
        }
      }
    }
    return roads;
  }
  /**
   * Vérifie si une route existe sur une arête.
   * @param edge - L'arête à vérifier
   * @returns true si une route existe sur cette arête
   */
  hasRoad(edge) {
    return this.roads.has(edge.hashCode());
  }
  /**
   * Détermine si un hexagone est visible.
   * 
   * Un hexagone est visible si au moins un de ses sommets (vertices) a une ville ou une route connectée.
   * Par défaut, tous les hexagones commencent non visibles.
   * Un hexagone devient visible lorsqu'une ville ou une route est placée sur l'un de ses vertices.
   * 
   * @param hex - L'hexagone ou sa coordonnée
   * @returns true si l'hexagone est visible, false sinon
   */
  isHexVisible(hex) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return false;
    }
    const vertices = this.grid.getVerticesForHex(coord);
    for (const vertex of vertices) {
      if (this.hasCity(vertex)) {
        return true;
      }
      const hexes = vertex.getHexes();
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const edge = Edge.create(hexes[i], hexes[j]);
            if (this.hasRoad(edge)) {
              return true;
            }
          } catch (e) {
          }
        }
      }
    }
    return false;
  }
};

// src/controller/util/SeededRNG.ts
var SeededRNG = class {
  /**
   * Crée un nouveau générateur avec une seed initiale.
   * @param seed - La seed initiale
   */
  constructor(seed) {
    this.state = seed >>> 0;
  }
  /**
   * Génère le prochain nombre aléatoire entre 0 (inclus) et 1 (exclus).
   * @returns Un nombre aléatoire entre 0 et 1
   */
  next() {
    this.state = this.state * 1664525 + 1013904223 >>> 0;
    return (this.state >>> 0) / 4294967296;
  }
  /**
   * Génère un nombre entier aléatoire entre min (inclus) et max (exclus).
   * @param min - Borne inférieure (inclus)
   * @param max - Borne supérieure (exclus)
   * @returns Un entier aléatoire dans l'intervalle [min, max)
   */
  nextInt(min, max) {
    if (min >= max) {
      throw new Error(`min (${min}) doit \xEAtre strictement inf\xE9rieur \xE0 max (${max})`);
    }
    const range = max - min;
    return min + Math.floor(this.next() * range);
  }
  /**
   * Sélectionne un élément aléatoire dans un tableau.
   * @param array - Le tableau source
   * @returns Un élément du tableau, ou undefined si le tableau est vide
   */
  pick(array) {
    if (array.length === 0) {
      return void 0;
    }
    const index = this.nextInt(0, array.length);
    return array[index];
  }
  /**
   * Mélange un tableau de manière aléatoire (algorithme de Fisher-Yates).
   * Modifie le tableau en place.
   * @param array - Le tableau à mélanger
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  /**
   * Retourne l'état actuel du générateur (utile pour les tests).
   */
  getState() {
    return this.state;
  }
};

// src/controller/MapGenerator.ts
var MapGenerator = class {
  /**
   * Génère une nouvelle GameMap selon la configuration fournie.
   * 
   * @param config - Configuration de génération
   * @returns Une GameMap complètement initialisée avec ressources assignées
   * @throws Error si la configuration est invalide
   */
  generate(config) {
    this.validateConfig(config);
    const rng = new SeededRNG(config.seed);
    const { hexes: terrestrialHexes, woodCoord, brickCoord } = this.generateTerrestrialHexes(config, rng);
    const allHexes = this.addWaterLayer(terrestrialHexes);
    const hexGrid = new HexGrid(allHexes);
    const gameMap = new GameMap(hexGrid);
    for (const civId of config.civilizations) {
      gameMap.registerCivilization(civId);
    }
    this.assignResources(gameMap, terrestrialHexes, config, rng, woodCoord, brickCoord);
    this.assignWaterResources(gameMap, terrestrialHexes);
    if (config.civilizations.length > 0) {
      console.log(`[MapGenerator] Hexagone initial Bois: (${woodCoord.q}, ${woodCoord.r})`);
      console.log(`[MapGenerator] Hexagone initial Argile: (${brickCoord.q}, ${brickCoord.r})`);
      this.addInitialCity(gameMap, woodCoord, brickCoord, config.civilizations[0]);
    }
    return gameMap;
  }
  /**
   * Valide la configuration de génération.
   * @throws Error si la configuration est invalide
   */
  validateConfig(config) {
    if (!config.civilizations || config.civilizations.length === 0) {
      throw new Error("Au moins une civilisation est requise.");
    }
    let totalHexes = 0;
    for (const count of config.resourceDistribution.values()) {
      if (count < 0) {
        throw new Error("La distribution de ressources ne peut pas contenir de valeurs n\xE9gatives.");
      }
      totalHexes += count;
    }
    if (totalHexes === 0) {
      throw new Error("Au moins un hexagone est requis (distribution de ressources vide).");
    }
    if (typeof config.seed !== "number" || !isFinite(config.seed)) {
      throw new Error("Le seed doit \xEAtre un nombre fini.");
    }
  }
  /**
   * Génère uniquement les hexagones terrestres selon les règles de placement.
   * - Les 2 premiers hexagones sont placés adjacents
   * - Chaque hexagone suivant doit être adjacent à au moins 2 hexagones déjà placés
   * - Après génération, trouve un vertex au bord (2 hexagones + 1 emplacement eau) pour Bois et Argile
   */
  generateTerrestrialHexes(config, rng) {
    const totalHexes = this.calculateTotalHexes(config.resourceDistribution);
    const placedCoords = /* @__PURE__ */ new Set();
    const hexes = [];
    const firstCoord = new HexCoord(0, 0);
    const secondCoord = firstCoord.neighbor(0 /* N */);
    hexes.push(new Hex(firstCoord));
    hexes.push(new Hex(secondCoord));
    placedCoords.add(firstCoord.hashCode());
    placedCoords.add(secondCoord.hashCode());
    while (hexes.length < totalHexes) {
      const candidateCoord = this.findValidPlacement(placedCoords, rng);
      if (!candidateCoord) {
        throw new Error(
          `Impossible de placer tous les hexagones requis. Plac\xE9s: ${hexes.length}/${totalHexes}. V\xE9rifiez que la distribution de ressources est raisonnable.`
        );
      }
      hexes.push(new Hex(candidateCoord));
      placedCoords.add(candidateCoord.hashCode());
    }
    const borderVertex = this.findBorderVertex(placedCoords, rng);
    if (!borderVertex) {
      throw new Error("Impossible de trouver un vertex au bord pour placer Bois et Argile.");
    }
    const { woodCoord, brickCoord } = borderVertex;
    return { hexes, woodCoord, brickCoord };
  }
  /**
   * Trouve un vertex au bord de la carte terrestre.
   * Un vertex au bord est formé par 2 hexagones terrestres adjacents
   * qui ont un voisin commun qui n'est pas terrestre (sera l'eau).
   */
  findBorderVertex(terrestrialCoords, rng) {
    const borderCandidates = [];
    for (const coordHash of terrestrialCoords) {
      const [q, r] = coordHash.split(",").map(Number);
      const coord1 = new HexCoord(q, r);
      for (const direction of ALL_DIRECTIONS) {
        const coord2 = coord1.neighbor(direction);
        if (terrestrialCoords.has(coord2.hashCode())) {
          const neighbors1 = coord1.neighbors();
          const neighbors2 = coord2.neighbors();
          for (const n1 of neighbors1) {
            if (neighbors2.some((n2) => n2.equals(n1))) {
              if (!terrestrialCoords.has(n1.hashCode())) {
                borderCandidates.push({
                  woodCoord: coord1,
                  brickCoord: coord2
                });
                break;
              }
            }
          }
        }
      }
    }
    if (borderCandidates.length === 0) {
      return null;
    }
    return rng.pick(borderCandidates) || null;
  }
  /**
   * Trouve une coordonnée valide pour le prochain hexagone.
   * Un placement est valide si le nouvel hexagone est adjacent à au moins 2 hexagones déjà placés.
   */
  findValidPlacement(placedCoords, rng) {
    const candidateMap = /* @__PURE__ */ new Map();
    for (const coordHash of placedCoords) {
      const [q, r] = coordHash.split(",").map(Number);
      const coord = new HexCoord(q, r);
      for (const direction of ALL_DIRECTIONS) {
        const neighbor = coord.neighbor(direction);
        const neighborHash = neighbor.hashCode();
        if (!placedCoords.has(neighborHash)) {
          candidateMap.set(neighborHash, neighbor);
        }
      }
    }
    const validCandidates = [];
    for (const candidate of candidateMap.values()) {
      let adjacentCount = 0;
      for (const dir of ALL_DIRECTIONS) {
        const neighbor = candidate.neighbor(dir);
        if (placedCoords.has(neighbor.hashCode())) {
          adjacentCount++;
        }
      }
      if (adjacentCount >= 2) {
        validCandidates.push(candidate);
      }
    }
    return rng.pick(validCandidates) || null;
  }
  /**
   * Calcule le nombre total d'hexagones requis.
   */
  calculateTotalHexes(resourceDistribution) {
    let total = 0;
    for (const count of resourceDistribution.values()) {
      total += count;
    }
    return total;
  }
  /**
   * Ajoute une couche d'hexagones d'eau autour des hexagones terrestres.
   * Retourne tous les hexagones (terrestres + eau).
   */
  addWaterLayer(terrestrialHexes) {
    const terrestrialCoords = /* @__PURE__ */ new Set();
    const waterCoords = /* @__PURE__ */ new Set();
    for (const hex of terrestrialHexes) {
      terrestrialCoords.add(hex.coord.hashCode());
    }
    for (const hex of terrestrialHexes) {
      for (const direction of ALL_DIRECTIONS) {
        const neighborCoord = hex.coord.neighbor(direction);
        const neighborHash = neighborCoord.hashCode();
        if (!terrestrialCoords.has(neighborHash) && !waterCoords.has(neighborHash)) {
          waterCoords.add(neighborHash);
        }
      }
    }
    const allHexes = [...terrestrialHexes];
    for (const coordHash of waterCoords) {
      const [q, r] = coordHash.split(",").map(Number);
      const waterCoord = new HexCoord(q, r);
      allHexes.push(new Hex(waterCoord));
    }
    return allHexes;
  }
  /**
   * Assignë les ressources aux hexagones terrestres selon la distribution.
   * Exclut les hexagones d'eau.
   * Les deux premiers hexagones (Bois et Argile) sont assignés en premier.
   */
  assignResources(gameMap, terrestrialHexes, config, rng, woodCoord, brickCoord) {
    const resourcesToAssign = [];
    for (const [resourceType, count] of config.resourceDistribution.entries()) {
      if (resourceType === "Water" /* Water */) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        resourcesToAssign.push(resourceType);
      }
    }
    const woodIndex = resourcesToAssign.indexOf("Wood" /* Wood */);
    const brickIndex = resourcesToAssign.indexOf("Brick" /* Brick */);
    if (woodIndex !== -1) {
      resourcesToAssign.splice(woodIndex, 1);
    }
    if (brickIndex !== -1 && brickIndex !== woodIndex) {
      const adjustedBrickIndex = resourcesToAssign.indexOf("Brick" /* Brick */);
      if (adjustedBrickIndex !== -1) {
        resourcesToAssign.splice(adjustedBrickIndex, 1);
      }
    }
    rng.shuffle(resourcesToAssign);
    gameMap.setResource(woodCoord, "Wood" /* Wood */);
    gameMap.setResource(brickCoord, "Brick" /* Brick */);
    const remainingHexes = terrestrialHexes.filter(
      (hex) => !hex.coord.equals(woodCoord) && !hex.coord.equals(brickCoord)
    );
    const shuffledHexes = [...remainingHexes];
    rng.shuffle(shuffledHexes);
    for (let i = 0; i < resourcesToAssign.length && i < shuffledHexes.length; i++) {
      const hex = shuffledHexes[i];
      const resource = resourcesToAssign[i];
      gameMap.setResource(hex.coord, resource);
    }
  }
  /**
   * Assignë Water à tous les hexagones d'eau de la carte.
   */
  assignWaterResources(gameMap, terrestrialHexes) {
    const grid = gameMap.getGrid();
    const terrestrialCoords = /* @__PURE__ */ new Set();
    for (const hex of terrestrialHexes) {
      terrestrialCoords.add(hex.coord.hashCode());
    }
    for (const hex of grid.getAllHexes()) {
      if (!terrestrialCoords.has(hex.coord.hashCode())) {
        gameMap.setResource(hex.coord, "Water" /* Water */);
      }
    }
  }
  /**
   * Ajoute la ville initiale sur le vertex bois-argile-eau.
   */
  addInitialCity(gameMap, woodCoord, brickCoord, civId) {
    const grid = gameMap.getGrid();
    const woodVertices = grid.getVerticesForHex(woodCoord);
    for (const vertex of woodVertices) {
      const hexes = vertex.getHexes();
      const hasWood = hexes.some((h) => h.equals(woodCoord));
      const hasBrick = hexes.some((h) => h.equals(brickCoord));
      if (hasWood && hasBrick) {
        const waterHex = hexes.find((h) => !h.equals(woodCoord) && !h.equals(brickCoord));
        if (waterHex) {
          const resource = gameMap.getResource(waterHex);
          if (resource === "Water" /* Water */) {
            try {
              gameMap.addCity(vertex, civId);
              const hexList = hexes.map((h) => `(${h.q},${h.r})`).join(", ");
              console.log(`[MapGenerator] \u2713 Ville cr\xE9\xE9e avec succ\xE8s sur le vertex: [${hexList}]`);
              return;
            } catch (e) {
              console.warn(`[MapGenerator] \xC9chec lors de l'ajout de la ville (m\xE9thode 1): ${e}`);
            }
          }
        }
      }
    }
    const woodNeighbors = woodCoord.neighbors();
    const brickNeighbors = brickCoord.neighbors();
    for (const neighborCoord of woodNeighbors) {
      const isNeighborOfBrick = brickNeighbors.some((n) => n.equals(neighborCoord));
      if (isNeighborOfBrick) {
        const neighborHex = grid.getHex(neighborCoord);
        if (neighborHex) {
          const resource = gameMap.getResource(neighborCoord);
          if (resource === "Water" /* Water */) {
            const vertices = grid.getVerticesForHex(woodCoord);
            for (const vertex of vertices) {
              const hexes = vertex.getHexes();
              if (hexes.some((h) => h.equals(woodCoord)) && hexes.some((h) => h.equals(brickCoord)) && hexes.some((h) => h.equals(neighborCoord))) {
                try {
                  gameMap.addCity(vertex, civId);
                  const hexList = hexes.map((h) => `(${h.q},${h.r})`).join(", ");
                  console.log(`[MapGenerator] \u2713 Ville cr\xE9\xE9e avec succ\xE8s sur le vertex: [${hexList}]`);
                  return;
                } catch (e) {
                  console.warn(`[MapGenerator] \xC9chec lors de l'ajout de la ville (m\xE9thode 2): ${e}`);
                }
              }
            }
          }
        }
      }
    }
    console.error(`[MapGenerator] \u2717 \xC9CHEC: Impossible de cr\xE9er la ville initiale sur le vertex Bois(${woodCoord.q},${woodCoord.r})-Argile(${brickCoord.q},${brickCoord.r})-Eau`);
  }
};

// src/model/map/CivilizationId.ts
var CivilizationId = class _CivilizationId {
  constructor(value) {
    this.value = value;
    if (!value || value.trim().length === 0) {
      throw new Error("L'identifiant de civilisation ne peut pas \xEAtre vide.");
    }
  }
  /**
   * Crée un identifiant de civilisation.
   * @param value - La valeur unique de l'identifiant
   */
  static create(value) {
    return new _CivilizationId(value.trim());
  }
  /**
   * Retourne la valeur de l'identifiant.
   */
  getValue() {
    return this.value;
  }
  /**
   * Vérifie si cet identifiant est égal à un autre.
   */
  equals(other) {
    return this.value === other.value;
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `CivilizationId(${this.value})`;
  }
  /**
   * Génère un hash pour utiliser comme clé dans des Maps/Sets.
   */
  hashCode() {
    return this.value;
  }
};

// src/application/MainGame.ts
var MainGame = class {
  constructor() {
    this.gameMap = null;
    this.mapGenerator = new MapGenerator();
  }
  /**
   * Initialise une nouvelle partie en générant une carte.
   * @param seed - Seed optionnel pour la génération (par défaut: timestamp)
   */
  initialize(seed) {
    const actualSeed = seed ?? Date.now();
    const resourceDistribution = /* @__PURE__ */ new Map([
      ["Wood" /* Wood */, 5],
      ["Brick" /* Brick */, 5],
      ["Wheat" /* Wheat */, 5],
      ["Sheep" /* Sheep */, 5],
      ["Ore" /* Ore */, 5],
      ["Desert" /* Desert */, 5]
    ]);
    const civilizations = [CivilizationId.create("player1")];
    const config = {
      resourceDistribution,
      civilizations,
      seed: actualSeed
    };
    this.gameMap = this.mapGenerator.generate(config);
  }
  /**
   * Retourne la carte de jeu actuelle.
   * @returns La GameMap, ou null si non initialisée
   */
  getGameMap() {
    return this.gameMap;
  }
  /**
   * Génère une nouvelle carte avec un nouveau seed.
   */
  regenerate() {
    this.initialize();
  }
};

// src/view/HexMapRenderer.ts
var RESOURCE_COLORS = {
  ["Wood" /* Wood */]: "#8B4513",
  // Marron (bois)
  ["Brick" /* Brick */]: "#CD5C5C",
  // Rouge brique
  ["Wheat" /* Wheat */]: "#FFD700",
  // Or (blé)
  ["Sheep" /* Sheep */]: "#90EE90",
  // Vert clair (mouton)
  ["Ore" /* Ore */]: "#708090",
  // Gris ardoise (minerai)
  ["Desert" /* Desert */]: "#F4A460",
  // Sable (désert)
  ["Water" /* Water */]: "#4169E1"
  // Bleu royal (eau)
};
var HexMapRenderer = class {
  constructor(canvas) {
    this.showCoordinates = false;
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Impossible d'obtenir le contexte 2D du canvas");
    }
    this.ctx = context;
  }
  /**
   * Active ou désactive l'affichage des coordonnées.
   */
  setShowCoordinates(show) {
    this.showCoordinates = show;
  }
  /**
   * Dessine la carte complète sur le canvas.
   * @param gameMap - La carte à dessiner
   */
  render(gameMap) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();
    if (allHexes.length === 0) {
      return;
    }
    const visibleHexes = allHexes.filter((hex) => gameMap.isHexVisible(hex.coord));
    if (visibleHexes.length === 0) {
      return;
    }
    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;
    for (const hex of visibleHexes) {
      minQ = Math.min(minQ, hex.coord.q);
      maxQ = Math.max(maxQ, hex.coord.q);
      minR = Math.min(minR, hex.coord.r);
      maxR = Math.max(maxR, hex.coord.r);
    }
    const hexSize = this.calculateHexSize(minQ, maxQ, minR, maxR);
    const centerQ = (minQ + maxQ) / 2;
    const centerR = (minR + maxR) / 2;
    const offsetX = this.canvas.width / 2 - Math.sqrt(3) * (centerQ + centerR / 2) * hexSize;
    const offsetY = this.canvas.height / 2 - 3 / 2 * centerR * hexSize;
    const config = {
      hexSize,
      offsetX,
      offsetY
    };
    for (const hex of visibleHexes) {
      this.drawHex(hex, gameMap, config);
    }
    if (this.showCoordinates) {
      for (const hex of visibleHexes) {
        this.drawCoordinates(hex, config);
      }
    }
    this.drawCities(gameMap, config);
  }
  /**
   * Calcule la taille optimale des hexagones pour que la carte tienne dans le canvas.
   */
  calculateHexSize(minQ, maxQ, minR, maxR) {
    const width = maxQ - minQ + 1;
    const height = maxR - minR + 1;
    const hexWidth = Math.sqrt(3);
    const hexHeight = 2;
    const maxWidth = this.canvas.width * 0.9 / (width * hexWidth);
    const maxHeight = this.canvas.height * 0.9 / (height * hexHeight);
    return Math.min(maxWidth, maxHeight, 40);
  }
  /**
   * Dessine un hexagone sur le canvas.
   */
  drawHex(hex, gameMap, config) {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + 3 / 2 * coord.r * hexSize;
    const resource = gameMap.getResource(coord) || "Desert" /* Desert */;
    const color = RESOURCE_COLORS[resource] || "#CCCCCC";
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const hx = x + hexSize * Math.cos(angle) * 0.9;
      const hy = y + hexSize * Math.sin(angle) * 0.9;
      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }
  /**
   * Dessine les coordonnées (q, r) au centre d'un hexagone.
   */
  drawCoordinates(hex, config) {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + 3 / 2 * coord.r * hexSize;
    const text = `(${coord.q},${coord.r})`;
    this.ctx.fillStyle = "#000000";
    this.ctx.font = `${Math.max(8, hexSize / 4)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = parseInt(this.ctx.font) || 12;
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    this.ctx.fillRect(
      x - textWidth / 2 - 2,
      y - textHeight / 2 - 2,
      textWidth + 4,
      textHeight + 4
    );
    this.ctx.fillStyle = "#000000";
    this.ctx.fillText(text, x, y);
  }
  /**
   * Dessine les villes sur leurs sommets.
   */
  drawCities(gameMap, config) {
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();
    const processedVertices = /* @__PURE__ */ new Set();
    for (const hex of allHexes) {
      const vertices = grid.getVerticesForHex(hex.coord);
      for (const vertex of vertices) {
        const vertexKey = vertex.hashCode();
        if (!processedVertices.has(vertexKey)) {
          processedVertices.add(vertexKey);
          if (gameMap.hasCity(vertex)) {
            this.drawCity(vertex, config);
          }
        }
      }
    }
    const allVertices = grid.getAllVertices();
    for (const vertex of allVertices) {
      const vertexKey = vertex.hashCode();
      if (gameMap.hasCity(vertex)) {
        if (!processedVertices.has(vertexKey)) {
          this.drawCity(vertex, config);
        }
      }
    }
  }
  /**
   * Dessine une ville sur un sommet (petit carré noir).
   */
  drawCity(vertex, config) {
    const { hexSize, offsetX, offsetY } = config;
    const hexes = vertex.getHexes();
    let sumX = 0;
    let sumY = 0;
    for (const coord of hexes) {
      const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
      const y = offsetY + 3 / 2 * coord.r * hexSize;
      sumX += x;
      sumY += y;
    }
    const centerX = sumX / 3;
    const centerY = sumY / 3;
    const citySize = 6;
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(
      centerX - citySize / 2,
      centerY - citySize / 2,
      citySize,
      citySize
    );
  }
  /**
   * Redimensionne le canvas pour qu'il s'adapte à la fenêtre.
   */
  resize() {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - headerHeight - footerHeight;
  }
};

// src/main.ts
function main() {
  const canvas = document.getElementById("map-canvas");
  const regenerateBtn = document.getElementById("regenerate-btn");
  const coordinatesBtn = document.getElementById("coordinates-btn");
  if (!canvas) {
    throw new Error("Canvas introuvable");
  }
  if (!regenerateBtn) {
    throw new Error("Bouton de r\xE9g\xE9n\xE9ration introuvable");
  }
  if (!coordinatesBtn) {
    throw new Error("Bouton de coordonn\xE9es introuvable");
  }
  const resourcesPanel = document.getElementById("resources-panel");
  const resourcesList = document.getElementById("resources-list");
  if (!resourcesPanel || !resourcesList) {
    throw new Error("Panneau de ressources introuvable");
  }
  const game = new MainGame();
  const renderer = new HexMapRenderer(canvas);
  renderer.resize();
  window.addEventListener("resize", () => {
    renderer.resize();
    const gameMap2 = game.getGameMap();
    if (gameMap2) {
      renderer.render(gameMap2);
    }
  });
  function updateResourcesDisplay(gameMap2) {
    if (!resourcesList) return;
    const resourceCounts = /* @__PURE__ */ new Map();
    const grid = gameMap2.getGrid();
    const allHexes = grid.getAllHexes();
    for (const hex of allHexes) {
      if (gameMap2.isHexVisible(hex.coord)) {
        const resource = gameMap2.getResource(hex.coord);
        if (resource) {
          const currentCount = resourceCounts.get(resource) || 0;
          resourceCounts.set(resource, currentCount + 1);
        }
      }
    }
    const resourceNames = {
      ["Wood" /* Wood */]: "Bois",
      ["Brick" /* Brick */]: "Brique",
      ["Wheat" /* Wheat */]: "Bl\xE9",
      ["Sheep" /* Sheep */]: "Mouton",
      ["Ore" /* Ore */]: "Minerai",
      ["Desert" /* Desert */]: "D\xE9sert",
      ["Water" /* Water */]: "Eau"
    };
    const resourceColors = {
      ["Wood" /* Wood */]: "#8B4513",
      ["Brick" /* Brick */]: "#CD5C5C",
      ["Wheat" /* Wheat */]: "#FFD700",
      ["Sheep" /* Sheep */]: "#90EE90",
      ["Ore" /* Ore */]: "#708090",
      ["Desert" /* Desert */]: "#F4A460",
      ["Water" /* Water */]: "#4169E1"
    };
    const resourceOrder = [
      "Wood" /* Wood */,
      "Brick" /* Brick */,
      "Wheat" /* Wheat */,
      "Sheep" /* Sheep */,
      "Ore" /* Ore */,
      "Desert" /* Desert */,
      "Water" /* Water */
    ];
    resourcesList.innerHTML = "";
    for (const resourceType of resourceOrder) {
      const count = resourceCounts.get(resourceType) || 0;
      if (count > 0) {
        const item = document.createElement("div");
        item.className = "resource-item";
        item.style.borderLeftColor = resourceColors[resourceType];
        const color = document.createElement("div");
        color.className = "resource-color";
        color.style.backgroundColor = resourceColors[resourceType];
        const name = document.createElement("span");
        name.className = "resource-name";
        name.textContent = resourceNames[resourceType];
        const countEl = document.createElement("span");
        countEl.className = "resource-count";
        countEl.textContent = count.toString();
        item.appendChild(color);
        item.appendChild(name);
        item.appendChild(countEl);
        resourcesList.appendChild(item);
      }
    }
    if (resourceCounts.size === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.style.padding = "1rem";
      emptyMessage.style.color = "#666";
      emptyMessage.style.textAlign = "center";
      emptyMessage.textContent = "Aucune ressource visible";
      resourcesList.appendChild(emptyMessage);
    }
  }
  game.initialize();
  const gameMap = game.getGameMap();
  if (gameMap) {
    renderer.render(gameMap);
    updateResourcesDisplay(gameMap);
  }
  regenerateBtn.addEventListener("click", () => {
    game.regenerate();
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      renderer.render(newGameMap);
      updateResourcesDisplay(newGameMap);
    }
  });
  let showCoordinates = false;
  coordinatesBtn.addEventListener("click", () => {
    showCoordinates = !showCoordinates;
    renderer.setShowCoordinates(showCoordinates);
    const gameMap2 = game.getGameMap();
    if (gameMap2) {
      renderer.render(gameMap2);
      updateResourcesDisplay(gameMap2);
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
//# sourceMappingURL=main.js.map
