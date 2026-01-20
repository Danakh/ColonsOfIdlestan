// src/model/hex/HexDirection.ts
var ALL_DIRECTIONS = [
  0 /* N */,
  1 /* NE */,
  2 /* SE */,
  3 /* S */,
  4 /* SW */,
  5 /* NW */
];

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
  /** Sérialise la coordonnée en [q, r]. */
  serialize() {
    return [this.q, this.r];
  }
  /** Désérialise depuis [q, r]. */
  static deserialize(data) {
    return new _HexCoord(data[0], data[1]);
  }
};

// src/model/hex/Hex.ts
var Hex = class _Hex {
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
  /** Sérialise l'hexagone (délègue à la coordonnée). */
  serialize() {
    return this.coord.serialize();
  }
  /** Désérialise depuis [q, r]. */
  static deserialize(data) {
    return new _Hex(HexCoord.deserialize(data));
  }
};

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
  /** Sérialise l'arête en [h1, h2] (chaque hi = [q, r]). */
  serialize() {
    const [a, b] = this.getHexes();
    return [a.serialize(), b.serialize()];
  }
  /** Désérialise depuis [[q1,r1],[q2,r2]]. */
  static deserialize(data) {
    return _Edge.create(HexCoord.deserialize(data[0]), HexCoord.deserialize(data[1]));
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
  /** Sérialise le sommet en [h1, h2, h3] (chaque hi = [q, r]). */
  serialize() {
    return this.getHexes().map((h) => h.serialize());
  }
  /** Désérialise depuis [[q1,r1],[q2,r2],[q3,r3]]. */
  static deserialize(data) {
    return _Vertex.create(
      HexCoord.deserialize(data[0]),
      HexCoord.deserialize(data[1]),
      HexCoord.deserialize(data[2])
    );
  }
};

// src/model/hex/HexGrid.ts
var HexGrid = class _HexGrid {
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
  /** Sérialise la grille en { hexes: [coord, ...] }. */
  serialize() {
    return { hexes: this.getAllHexes().map((h) => h.serialize()) };
  }
  /** Désérialise depuis { hexes }. */
  static deserialize(data) {
    return new _HexGrid(data.hexes.map((h) => Hex.deserialize(h)));
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
  /** Sérialise l'identifiant (valeur string). */
  serialize() {
    return this.value;
  }
  /** Désérialise depuis une chaîne. */
  static deserialize(data) {
    return _CivilizationId.create(data);
  }
};

// src/model/city/CityLevel.ts
function isValidCityLevel(level) {
  return level >= 0 /* Outpost */ && level <= 4 /* Capital */;
}

// src/model/map/ResourceType.ts
var ResourceType = /* @__PURE__ */ ((ResourceType2) => {
  ResourceType2["Wood"] = "Wood";
  ResourceType2["Brick"] = "Brick";
  ResourceType2["Wheat"] = "Wheat";
  ResourceType2["Sheep"] = "Sheep";
  ResourceType2["Ore"] = "Ore";
  return ResourceType2;
})(ResourceType || {});

// src/model/city/BuildingType.ts
var BuildingType = /* @__PURE__ */ ((BuildingType5) => {
  BuildingType5["Seaport"] = "Seaport";
  BuildingType5["Market"] = "Market";
  BuildingType5["TownHall"] = "TownHall";
  BuildingType5["Sawmill"] = "Sawmill";
  BuildingType5["Brickworks"] = "Brickworks";
  BuildingType5["Mill"] = "Mill";
  BuildingType5["Sheepfold"] = "Sheepfold";
  BuildingType5["Mine"] = "Mine";
  return BuildingType5;
})(BuildingType || {});
var BUILDING_TYPE_NAMES = {
  ["Seaport" /* Seaport */]: "Port maritime",
  ["Market" /* Market */]: "March\xE9",
  ["TownHall" /* TownHall */]: "H\xF4tel de ville",
  ["Sawmill" /* Sawmill */]: "Scierie",
  ["Brickworks" /* Brickworks */]: "Briqueterie",
  ["Mill" /* Mill */]: "Moulin",
  ["Sheepfold" /* Sheepfold */]: "Bergerie",
  ["Mine" /* Mine */]: "Mine"
};
var BUILDING_COSTS = {
  ["Seaport" /* Seaport */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 5]
  ]),
  ["Market" /* Market */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 5]
  ]),
  ["TownHall" /* TownHall */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 5],
    ["Brick" /* Brick */, 5],
    ["Ore" /* Ore */, 1]
  ]),
  ["Sawmill" /* Sawmill */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 3],
    ["Brick" /* Brick */, 2]
  ]),
  ["Brickworks" /* Brickworks */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 3],
    ["Brick" /* Brick */, 2]
  ]),
  ["Mill" /* Mill */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 3],
    ["Brick" /* Brick */, 2]
  ]),
  ["Sheepfold" /* Sheepfold */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 3],
    ["Brick" /* Brick */, 2]
  ]),
  ["Mine" /* Mine */]: /* @__PURE__ */ new Map([
    ["Wood" /* Wood */, 3],
    ["Brick" /* Brick */, 2]
  ])
};
function getBuildingCost(buildingType) {
  return new Map(BUILDING_COSTS[buildingType]);
}
function getBuildingTypeName(buildingType) {
  return BUILDING_TYPE_NAMES[buildingType];
}
function getAllBuildingTypes() {
  return Object.values(BuildingType);
}
function getResourceProductionBuildings() {
  return [
    "Sawmill" /* Sawmill */,
    "Brickworks" /* Brickworks */,
    "Mill" /* Mill */,
    "Sheepfold" /* Sheepfold */,
    "Mine" /* Mine */
  ];
}
var BUILDING_REQUIRED_HEX_TYPE = {
  ["Sawmill" /* Sawmill */]: "Wood" /* Wood */,
  ["Brickworks" /* Brickworks */]: "Brick" /* Brick */,
  ["Mill" /* Mill */]: "Wheat" /* Wheat */,
  ["Sheepfold" /* Sheepfold */]: "Sheep" /* Sheep */,
  ["Mine" /* Mine */]: "Ore" /* Ore */,
  ["Seaport" /* Seaport */]: "Water" /* Water */,
  // Nécessite de l'eau adjacente
  ["Market" /* Market */]: null,
  // Pas de contrainte d'hex
  ["TownHall" /* TownHall */]: null
  // Pas de contrainte d'hex
};
function getRequiredHexType(buildingType) {
  return BUILDING_REQUIRED_HEX_TYPE[buildingType] ?? null;
}
function getBuildingAction(buildingType) {
  switch (buildingType) {
    case "Seaport" /* Seaport */:
    case "Market" /* Market */:
      return "Trade" /* Trade */;
    case "TownHall" /* TownHall */:
      return "Upgrade" /* Upgrade */;
    default:
      return null;
  }
}
var BUILDING_ACTION_NAMES = {
  ["Trade" /* Trade */]: "Commerce",
  ["Upgrade" /* Upgrade */]: "Am\xE9liorer"
};

// src/model/city/City.ts
var City = class {
  /**
   * Crée une nouvelle ville.
   * @param vertex - Le sommet où se trouve la ville
   * @param owner - L'identifiant de la civilisation propriétaire
   * @param level - Le niveau de la ville (par défaut: Outpost)
   */
  constructor(vertex, owner, level = 0 /* Outpost */) {
    this.vertex = vertex;
    this.owner = owner;
    this.level = level;
    this.buildings = [];
    /** Temps de dernière production pour chaque bâtiment de ressource (en secondes depuis le début) */
    this.buildingProductionTimes = /* @__PURE__ */ new Map();
    if (!isValidCityLevel(level)) {
      throw new Error(`Niveau de ville invalide: ${level}. Doit \xEAtre entre ${0 /* Outpost */} et ${4 /* Capital */}.`);
    }
  }
  /**
   * Retourne le nombre maximum de bâtiments qu'une ville de ce niveau peut construire.
   * @returns Le nombre maximum de bâtiments
   */
  getMaxBuildings() {
    return (this.level + 1) * 2;
  }
  /**
   * Retourne le nombre de bâtiments actuellement construits.
   * @returns Le nombre de bâtiments construits
   */
  getBuildingCount() {
    return this.buildings.length;
  }
  /**
   * Vérifie si la ville peut construire un bâtiment supplémentaire.
   * @returns true si la ville peut construire un nouveau bâtiment
   */
  canBuildBuilding() {
    return this.getBuildingCount() < this.getMaxBuildings();
  }
  /**
   * Ajoute un bâtiment à la ville.
   * @param buildingType - Le type de bâtiment à ajouter
   * @throws Error si la ville ne peut pas construire de bâtiment supplémentaire
   * @throws Error si le bâtiment n'est pas constructible dans cette ville
   * @throws Error si le bâtiment est déjà construit
   */
  addBuilding(buildingType) {
    if (!this.canBuildBuilding()) {
      throw new Error(
        `La ville ne peut pas construire plus de ${this.getMaxBuildings()} b\xE2timents (niveau ${this.level}).`
      );
    }
    if (!this.canBuildBuildingType(buildingType)) {
      throw new Error(
        `Le b\xE2timent ${buildingType} n'est pas constructible dans cette ville (niveau ${this.level}).`
      );
    }
    if (this.hasBuilding(buildingType)) {
      throw new Error(`Le b\xE2timent ${buildingType} est d\xE9j\xE0 construit dans cette ville.`);
    }
    this.buildings.push(buildingType);
  }
  /**
   * Retourne la liste des bâtiments construits.
   * @returns Un tableau des types de bâtiments construits
   */
  getBuildings() {
    return [...this.buildings];
  }
  /**
   * Vérifie si un type de bâtiment est construit dans la ville.
   * @param buildingType - Le type de bâtiment à vérifier
   * @returns true si le bâtiment est construit
   */
  hasBuilding(buildingType) {
    return this.buildings.includes(buildingType);
  }
  /**
   * Retourne la liste des bâtiments constructibles pour cette ville.
   * Les bâtiments constructibles dépendent du niveau de la ville.
   * @returns Un tableau des types de bâtiments constructibles
   */
  getBuildableBuildings() {
    const allBuildings = getAllBuildingTypes();
    const buildableBuildings = [];
    for (const buildingType of allBuildings) {
      if (this.canBuildBuildingType(buildingType)) {
        buildableBuildings.push(buildingType);
      }
    }
    return buildableBuildings;
  }
  /**
   * Vérifie si un type de bâtiment peut être construit dans cette ville.
   * @param buildingType - Le type de bâtiment à vérifier
   * @returns true si le bâtiment peut être construit
   */
  canBuildBuildingType(buildingType) {
    if (this.hasBuilding(buildingType)) {
      return false;
    }
    if (!this.canBuildBuilding()) {
      return false;
    }
    switch (buildingType) {
      case "Seaport" /* Seaport */:
        return this.level >= 2 /* Town */;
      // Niveau 2 (Ville)
      case "Market" /* Market */:
      case "TownHall" /* TownHall */:
        return this.level >= 0 /* Outpost */;
      case "Sawmill" /* Sawmill */:
      case "Brickworks" /* Brickworks */:
      case "Mill" /* Mill */:
      case "Sheepfold" /* Sheepfold */:
      case "Mine" /* Mine */:
        return this.level >= 1 /* Colony */;
      default:
        return false;
    }
  }
  /**
   * Vérifie si la ville peut être améliorée au niveau suivant.
   * @returns true si la ville peut être améliorée
   */
  canUpgrade() {
    return this.level < 4 /* Capital */;
  }
  /**
   * Améliore la ville au niveau suivant.
   * @throws Error si la ville ne peut pas être améliorée (déjà au niveau maximum)
   */
  upgrade() {
    if (!this.canUpgrade()) {
      throw new Error(`La ville ne peut pas \xEAtre am\xE9lior\xE9e au-del\xE0 du niveau ${4 /* Capital */} (Capitale).`);
    }
    this.level = this.level + 1;
  }
  /**
   * Vérifie si la ville a un hôtel de ville (requis pour l'amélioration).
   * @returns true si la ville a un hôtel de ville
   */
  hasCityHall() {
    return this.hasBuilding("TownHall" /* TownHall */);
  }
  /**
   * Enregistre le temps de dernière production pour un bâtiment de ressource.
   * @param buildingType - Le type de bâtiment
   * @param timeSeconds - Le temps en secondes
   */
  setBuildingProductionTime(buildingType, timeSeconds) {
    const resourceBuildings = getResourceProductionBuildings();
    if (!resourceBuildings.includes(buildingType)) {
      throw new Error(`Le b\xE2timent ${buildingType} n'est pas un b\xE2timent de production de ressources.`);
    }
    if (!this.hasBuilding(buildingType)) {
      throw new Error(`Le b\xE2timent ${buildingType} n'est pas construit dans cette ville.`);
    }
    this.buildingProductionTimes.set(buildingType, timeSeconds);
  }
  /**
   * Retourne le temps de dernière production d'un bâtiment de ressource.
   * @param buildingType - Le type de bâtiment
   * @returns Le temps de dernière production en secondes, ou undefined si jamais produit
   */
  getBuildingProductionTime(buildingType) {
    return this.buildingProductionTimes.get(buildingType);
  }
  /**
   * Met à jour le temps de dernière production après une production réussie.
   * Le nouveau temps est calculé comme : ancien temps + intervalle de production.
   * @param buildingType - Le type de bâtiment
   * @param newTimeSeconds - Le nouveau temps (ancien temps + intervalle)
   */
  updateBuildingProductionTime(buildingType, newTimeSeconds) {
    this.setBuildingProductionTime(buildingType, newTimeSeconds);
  }
  /**
   * Vérifie l'égalité avec une autre ville (basé sur le vertex).
   */
  equals(other) {
    return this.vertex.equals(other.vertex);
  }
  /**
   * Retourne une représentation en chaîne pour le débogage.
   */
  toString() {
    return `City(vertex=${this.vertex.toString()}, level=${this.level}, owner=${this.owner.toString()})`;
  }
  /** Sérialise la ville (vertex, owner, level, buildings, buildingProductionTimes). */
  serialize() {
    const bpt = {};
    for (const bt of getResourceProductionBuildings()) {
      if (this.hasBuilding(bt)) {
        const t = this.getBuildingProductionTime(bt);
        if (t !== void 0) bpt[bt] = t;
      }
    }
    return {
      vertex: this.vertex.serialize(),
      owner: this.owner.serialize(),
      level: this.level,
      buildings: [...this.getBuildings()],
      buildingProductionTimes: bpt
    };
  }
};

// src/model/map/GameMap.ts
var GameMap = class _GameMap {
  // Map<edgeKey, distance>
  /**
   * Crée une nouvelle carte de jeu à partir d'une grille hexagonale.
   * @param grid - La grille hexagonale sous-jacente
   */
  constructor(grid) {
    this.grid = grid;
    this.hexTypeMap = /* @__PURE__ */ new Map();
    this.cityMap = /* @__PURE__ */ new Map();
    this.roads = /* @__PURE__ */ new Set();
    this.registeredCivilizations = /* @__PURE__ */ new Set();
    this.roadOwner = /* @__PURE__ */ new Map();
    this.roadDistanceToCity = /* @__PURE__ */ new Map();
    for (const hex of grid.getAllHexes()) {
      this.hexTypeMap.set(hex.coord.hashCode(), "Desert" /* Desert */);
    }
  }
  /**
   * Retourne la grille hexagonale sous-jacente.
   */
  getGrid() {
    return this.grid;
  }
  /**
   * Définit le type d'hexagone pour un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @param hexType - Le type d'hexagone
   * @throws Error si l'hexagone n'existe pas dans la grille
   */
  setHexType(hex, hexType) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      throw new Error(`L'hexagone \xE0 la coordonn\xE9e ${coord.toString()} n'existe pas dans la grille.`);
    }
    this.hexTypeMap.set(coord.hashCode(), hexType);
  }
  /**
   * Retourne le type d'hexagone d'un hexagone.
   * @param hex - L'hexagone ou sa coordonnée
   * @returns Le type d'hexagone, ou undefined si l'hexagone n'existe pas
   */
  getHexType(hex) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return void 0;
    }
    return this.hexTypeMap.get(coord.hashCode());
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
   * Retourne les valeurs (getValue) des civilisations enregistrées.
   * Utilisé pour la sérialisation.
   */
  getRegisteredCivilizationValues() {
    return Array.from(this.registeredCivilizations);
  }
  /**
   * Ajoute une ville sur un sommet pour une civilisation donnée.
   * La ville est créée au niveau Outpost (0) par défaut.
   * @param vertex - Le sommet où placer la ville
   * @param civId - L'identifiant de la civilisation propriétaire
   * @param level - Le niveau initial de la ville (par défaut: Outpost)
   * @throws Error si le sommet n'est pas valide dans la grille
   * @throws Error si une ville existe déjà sur ce sommet
   * @throws Error si la civilisation n'est pas enregistrée
   */
  addCity(vertex, civId, level = 0 /* Outpost */) {
    if (!this.isCivilizationRegistered(civId)) {
      throw new Error(`La civilisation ${civId.toString()} n'est pas enregistr\xE9e.`);
    }
    const vertexKey = vertex.hashCode();
    if (this.cityMap.has(vertexKey)) {
      throw new Error(`Une ville existe d\xE9j\xE0 sur le sommet ${vertex.toString()}.`);
    }
    const hexes = vertex.getHexes();
    const hasValidHex = hexes.some((coord) => this.grid.hasHex(coord));
    if (!hasValidHex) {
      throw new Error(`Le sommet ${vertex.toString()} n'est pas valide dans la grille.`);
    }
    const city = new City(vertex, civId, level);
    this.cityMap.set(vertexKey, city);
    this.updateRoadDistances(civId);
  }
  /**
   * Vérifie si une ville existe sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns true si une ville existe sur ce sommet
   */
  hasCity(vertex) {
    return this.cityMap.has(vertex.hashCode());
  }
  /**
   * Retourne la ville sur un sommet donné.
   * @param vertex - Le sommet à vérifier
   * @returns La ville, ou undefined s'il n'y a pas de ville sur ce sommet
   */
  getCity(vertex) {
    return this.cityMap.get(vertex.hashCode());
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
    this.updateRoadDistances(civId);
  }
  /**
   * Retourne le propriétaire d'une ville sur un sommet.
   * @param vertex - Le sommet à vérifier
   * @returns L'identifiant de la civilisation propriétaire, ou undefined s'il n'y a pas de ville
   */
  getCityOwner(vertex) {
    const city = this.cityMap.get(vertex.hashCode());
    return city ? city.owner : void 0;
  }
  /**
   * Retourne toutes les villes appartenant à une civilisation donnée.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des villes appartenant à cette civilisation
   */
  getCitiesByCivilization(civId) {
    const cities = [];
    for (const city of this.cityMap.values()) {
      if (city.owner.equals(civId)) {
        cities.push(city);
      }
    }
    return cities;
  }
  /**
   * Retourne le nombre total de villes sur la carte.
   * @returns Le nombre de villes
   */
  getCityCount() {
    return this.cityMap.size;
  }
  /**
   * Améliore une ville au niveau suivant.
   * @param vertex - Le sommet où se trouve la ville à améliorer
   * @throws Error si aucune ville n'existe sur ce sommet
   * @throws Error si la ville ne peut pas être améliorée (déjà au niveau maximum)
   * @throws Error si une capitale existe déjà sur l'île et que la ville devient capitale
   */
  upgradeCity(vertex) {
    const city = this.cityMap.get(vertex.hashCode());
    if (!city) {
      throw new Error(`Aucune ville n'existe sur le sommet ${vertex.toString()}.`);
    }
    if (city.level === 3 /* Metropolis */) {
      if (this.hasCapital()) {
        throw new Error("Une seule capitale est autoris\xE9e par \xEEle.");
      }
    }
    city.upgrade();
  }
  /**
   * Vérifie s'il existe une capitale sur cette carte (île).
   * @returns true s'il existe au moins une capitale
   */
  hasCapital() {
    for (const city of this.cityMap.values()) {
      if (city.level === 4 /* Capital */) {
        return true;
      }
    }
    return false;
  }
  /**
   * Retourne le sommet où se trouve la capitale, s'il y en a une.
   * @returns Le sommet de la capitale, ou undefined s'il n'y a pas de capitale
   */
  getCapital() {
    for (const city of this.cityMap.values()) {
      if (city.level === 4 /* Capital */) {
        return city.vertex;
      }
    }
    return void 0;
  }
  /**
   * Vérifie si une capitale peut être créée sur cette carte (île).
   * @returns true si aucune capitale n'existe déjà
   */
  isCapitalAllowed() {
    return !this.hasCapital();
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
   * @returns Un tableau des villes de cette civilisation
   */
  getCitiesForCivilization(civId) {
    const cities = [];
    const civKey = civId.hashCode();
    for (const city of this.cityMap.values()) {
      if (city.owner.hashCode() === civKey) {
        cities.push(city);
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
   * Retourne toutes les routes constructibles pour une civilisation donnée.
   * Une route est constructible si elle touche une ville de la civilisation
   * ou si elle touche une route existante de la civilisation.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des arêtes constructibles pour cette civilisation
   */
  getBuildableRoadsForCivilization(civId) {
    const buildableRoads = [];
    const civKey = civId.hashCode();
    if (!this.isCivilizationRegistered(civId)) {
      return buildableRoads;
    }
    const allEdges = this.grid.getAllEdges();
    for (const edge of allEdges) {
      const [hex1, hex2] = edge.getHexes();
      if (!this.grid.hasHex(hex1) || !this.grid.hasHex(hex2)) {
        continue;
      }
      const hex1Type = this.getHexType(hex1);
      const hex2Type = this.getHexType(hex2);
      if (hex1Type === "Water" /* Water */ && hex2Type === "Water" /* Water */) {
        continue;
      }
      if (this.hasRoad(edge)) {
        continue;
      }
      const vertices = this.getVerticesForEdge(edge);
      let touchesCity = false;
      for (const vertex of vertices) {
        const vertexHexes = vertex.getHexes();
        const allVertexHexesExist = vertexHexes.every((h) => this.grid.hasHex(h));
        if (!allVertexHexesExist) {
          continue;
        }
        if (this.hasCity(vertex)) {
          const owner = this.getCityOwner(vertex);
          if (owner && owner.hashCode() === civKey) {
            touchesCity = true;
            break;
          }
        }
      }
      if (touchesCity) {
        buildableRoads.push(edge);
        continue;
      }
      const adjacentEdges = this.getAdjacentEdges(edge);
      for (const adjacentEdge of adjacentEdges) {
        const [adjHex1, adjHex2] = adjacentEdge.getHexes();
        if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
          continue;
        }
        const adjHex1Type = this.getHexType(adjHex1);
        const adjHex2Type = this.getHexType(adjHex2);
        if (adjHex1Type === "Water" /* Water */ && adjHex2Type === "Water" /* Water */) {
          continue;
        }
        if (this.hasRoad(adjacentEdge)) {
          const owner = this.getRoadOwner(adjacentEdge);
          if (owner && owner.hashCode() === civKey) {
            buildableRoads.push(edge);
            break;
          }
        }
      }
    }
    return buildableRoads;
  }
  /**
   * Retourne les edges adjacents à un edge donné.
   * Deux edges sont adjacents s'ils partagent un vertex et que tous les hexagones existent dans la grille.
   * @param edge - L'arête pour laquelle trouver les edges adjacents
   * @returns Un tableau des edges adjacents à cette arête
   */
  getAdjacentEdges(edge) {
    const adjacentEdges = [];
    const vertices = this.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      const hexes = vertex.getHexes();
      const allHexesExist = hexes.every((h) => this.grid.hasHex(h));
      if (!allHexesExist) {
        continue;
      }
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const adjacentEdge = Edge.create(hexes[i], hexes[j]);
            const [adjHex1, adjHex2] = adjacentEdge.getHexes();
            if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
              continue;
            }
            const adjHex1Type = this.getHexType(adjHex1);
            const adjHex2Type = this.getHexType(adjHex2);
            if (adjHex1Type === "Water" /* Water */ && adjHex2Type === "Water" /* Water */) {
              continue;
            }
            if (!adjacentEdge.equals(edge)) {
              if (!adjacentEdges.some((e) => e.equals(adjacentEdge))) {
                adjacentEdges.push(adjacentEdge);
              }
            }
          } catch (e) {
          }
        }
      }
    }
    return adjacentEdges;
  }
  /**
   * Retourne les edges qui touchent un vertex donné.
   * Un edge touche un vertex s'il contient deux des trois hexagones qui forment le vertex.
   * @param vertex - Le vertex pour lequel trouver les edges
   * @returns Un tableau des edges qui touchent ce vertex
   */
  getEdgesForVertex(vertex) {
    const edges = [];
    const hexes = vertex.getHexes();
    const allHexesExist = hexes.every((h) => this.grid.hasHex(h));
    if (!allHexesExist) {
      return edges;
    }
    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        try {
          const edge = Edge.create(hexes[i], hexes[j]);
          const [edgeHex1, edgeHex2] = edge.getHexes();
          if (!this.grid.hasHex(edgeHex1) || !this.grid.hasHex(edgeHex2)) {
            continue;
          }
          const hex1Type = this.getHexType(edgeHex1);
          const hex2Type = this.getHexType(edgeHex2);
          if (hex1Type === "Water" /* Water */ && hex2Type === "Water" /* Water */) {
            continue;
          }
          if (!edges.some((e) => e.equals(edge))) {
            edges.push(edge);
          }
        } catch (e) {
        }
      }
    }
    return edges;
  }
  /**
   * Retourne les vertices adjacents à une arête donnée.
   * Un vertex est adjacent à un edge s'il contient les deux hexagones de l'edge.
   * @param edge - L'arête pour laquelle trouver les vertices adjacents
   * @returns Un tableau des vertices adjacents à cette arête
   */
  getVerticesForEdge(edge) {
    const vertices = [];
    const [hex1, hex2] = edge.getHexes();
    for (const vertex of this.grid.getAllVertices()) {
      const hexes = vertex.getHexes();
      const containsHex1 = hexes.some((h) => h.equals(hex1));
      const containsHex2 = hexes.some((h) => h.equals(hex2));
      const allHexesExist = hexes.every((h) => this.grid.hasHex(h));
      if (containsHex1 && containsHex2 && allHexesExist) {
        if (!vertices.some((v) => v.equals(vertex))) {
          vertices.push(vertex);
        }
      }
    }
    return vertices;
  }
  /**
   * Détermine si un hexagone est visible.
   * 
   * Un hexagone terrestre est visible si au moins un de ses sommets a une ville ou une route connectée.
   * Un hexagone d'eau est visible s'il touche au moins un hexagone terrestre visible.
   * 
   * @param hex - L'hexagone ou sa coordonnée
   * @returns true si l'hexagone est visible, false sinon
   */
  isHexVisible(hex) {
    const coord = hex instanceof Hex ? hex.coord : hex;
    if (!this.grid.hasHex(coord)) {
      return false;
    }
    const hexType = this.getHexType(coord);
    if (hexType === "Water" /* Water */) {
      const neighbors = this.grid.getNeighbors(coord);
      for (const neighbor of neighbors) {
        const neighborType = this.getHexType(neighbor.coord);
        if (neighborType !== "Water" /* Water */ && neighborType !== void 0) {
          if (this.isTerrestrialHexVisible(neighbor.coord)) {
            return true;
          }
        }
      }
      return false;
    }
    return this.isTerrestrialHexVisible(coord);
  }
  /**
   * Détermine si un hexagone terrestre est visible.
   * Un hexagone terrestre est visible si au moins un de ses sommets a une ville ou une route connectée.
   * 
   * @param coord - La coordonnée de l'hexagone
   * @returns true si l'hexagone terrestre est visible, false sinon
   */
  isTerrestrialHexVisible(coord) {
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
  /**
   * Retourne la distance d'une route à la ville la plus proche de la même civilisation.
   * @param edge - L'arête de la route
   * @returns La distance (1 si elle touche une ville, D+1 si elle touche une route de distance D), ou undefined si la route n'existe pas
   */
  getRoadDistanceToCity(edge) {
    return this.roadDistanceToCity.get(edge.hashCode());
  }
  /**
   * Calcule la distance d'une route constructible à la ville la plus proche.
   * Cette méthode simule la construction de la route et calcule sa distance basée sur les routes existantes.
   * @param edge - L'arête constructible à vérifier
   * @param civId - L'identifiant de la civilisation
   * @returns La distance calculée (distance minimale + 1), ou undefined si la route ne peut pas être construite
   */
  calculateBuildableRoadDistance(edge, civId) {
    const civKey = civId.hashCode();
    const vertices = this.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every((h) => this.grid.hasHex(h));
      if (!allVertexHexesExist) {
        continue;
      }
      if (this.hasCity(vertex)) {
        const owner = this.getCityOwner(vertex);
        if (owner && owner.hashCode() === civKey) {
          return 1;
        }
      }
    }
    const adjacentEdges = this.getAdjacentEdges(edge);
    let minDistance = void 0;
    for (const adjacentEdge of adjacentEdges) {
      const [adjHex1, adjHex2] = adjacentEdge.getHexes();
      if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
        continue;
      }
      const adjHex1Type = this.getHexType(adjHex1);
      const adjHex2Type = this.getHexType(adjHex2);
      if (adjHex1Type === "Water" /* Water */ && adjHex2Type === "Water" /* Water */) {
        continue;
      }
      if (this.hasRoad(adjacentEdge)) {
        const owner = this.getRoadOwner(adjacentEdge);
        if (owner && owner.hashCode() === civKey) {
          const adjacentDistance = this.getRoadDistanceToCity(adjacentEdge);
          if (adjacentDistance !== void 0) {
            const newDistance = adjacentDistance + 1;
            if (minDistance === void 0 || newDistance < minDistance) {
              minDistance = newDistance;
            }
          }
        }
      }
    }
    return minDistance;
  }
  /**
   * Calcule la distance minimale d'un vertex à une ville de la civilisation (en nombre de routes).
   * Utilise un algorithme BFS depuis les villes.
   * Un vertex qui touche une route de distance D a lui-même une distance de D.
   * @param vertex - Le vertex pour lequel calculer la distance
   * @param civId - L'identifiant de la civilisation
   * @returns La distance minimale, ou undefined si aucune ville de la civilisation n'est accessible
   */
  calculateVertexDistanceToCity(vertex, civId) {
    const civKey = civId.hashCode();
    const vertexHexes = vertex.getHexes();
    const allVertexHexesExist = vertexHexes.every((h) => this.grid.hasHex(h));
    if (!allVertexHexesExist) {
      return void 0;
    }
    if (this.hasCity(vertex)) {
      const owner = this.getCityOwner(vertex);
      if (owner && owner.hashCode() === civKey) {
        return 0;
      }
    }
    const edgesForVertex = this.getEdgesForVertex(vertex);
    let minDistance = void 0;
    for (const edge of edgesForVertex) {
      if (!this.hasRoad(edge)) {
        continue;
      }
      const owner = this.getRoadOwner(edge);
      if (!owner || owner.hashCode() !== civKey) {
        continue;
      }
      const roadDistance = this.getRoadDistanceToCity(edge);
      if (roadDistance !== void 0) {
        if (minDistance === void 0 || roadDistance < minDistance) {
          minDistance = roadDistance;
        }
      }
    }
    return minDistance;
  }
  /**
   * Retourne tous les vertices où un avant-poste peut être construit pour une civilisation.
   * @param civId - L'identifiant de la civilisation
   * @returns Un tableau des vertices constructibles
   */
  getBuildableOutpostVertices(civId) {
    const buildableVertices = [];
    const civKey = civId.hashCode();
    if (!this.isCivilizationRegistered(civId)) {
      return buildableVertices;
    }
    const allVertices = this.grid.getAllVertices();
    for (const vertex of allVertices) {
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every((h) => this.grid.hasHex(h));
      if (!allVertexHexesExist) {
        continue;
      }
      if (this.hasCity(vertex)) {
        continue;
      }
      const edgesForVertex = this.getEdgesForVertex(vertex);
      let touchesRoad = false;
      for (const edge of edgesForVertex) {
        if (this.hasRoad(edge)) {
          const owner = this.getRoadOwner(edge);
          if (owner && owner.hashCode() === civKey) {
            touchesRoad = true;
            break;
          }
        }
      }
      if (!touchesRoad) {
        continue;
      }
      const distance = this.calculateVertexDistanceToCity(vertex, civId);
      if (distance !== void 0 && distance >= 2) {
        buildableVertices.push(vertex);
      }
    }
    return buildableVertices;
  }
  /**
   * Met à jour les distances de toutes les routes à la ville la plus proche pour une civilisation donnée.
   * Utilise un algorithme BFS pour calculer les distances depuis les villes.
   * @param civId - L'identifiant de la civilisation
   */
  updateRoadDistances(civId) {
    const civKey = civId.hashCode();
    const civRoads = this.getRoadsForCivilization(civId);
    for (const road of civRoads) {
      this.roadDistanceToCity.delete(road.hashCode());
    }
    const queue = [];
    const processed = /* @__PURE__ */ new Set();
    for (const road of civRoads) {
      const vertices = this.getVerticesForEdge(road);
      let touchesCity = false;
      for (const vertex of vertices) {
        const vertexHexes = vertex.getHexes();
        const allVertexHexesExist = vertexHexes.every((h) => this.grid.hasHex(h));
        if (!allVertexHexesExist) {
          continue;
        }
        if (this.hasCity(vertex)) {
          const owner = this.getCityOwner(vertex);
          if (owner && owner.hashCode() === civKey) {
            touchesCity = true;
            break;
          }
        }
      }
      if (touchesCity) {
        const roadKey = road.hashCode();
        this.roadDistanceToCity.set(roadKey, 1);
        queue.push({ edge: road, distance: 1 });
        processed.add(roadKey);
      }
    }
    while (queue.length > 0) {
      const { edge: currentRoad, distance: currentDistance } = queue.shift();
      const adjacentEdges = this.getAdjacentEdges(currentRoad);
      for (const adjacentEdge of adjacentEdges) {
        const adjRoadKey = adjacentEdge.hashCode();
        const adjOwner = this.getRoadOwner(adjacentEdge);
        if (!adjOwner || adjOwner.hashCode() !== civKey || processed.has(adjRoadKey)) {
          continue;
        }
        const [adjHex1, adjHex2] = adjacentEdge.getHexes();
        if (!this.grid.hasHex(adjHex1) || !this.grid.hasHex(adjHex2)) {
          continue;
        }
        const adjHex1Type = this.getHexType(adjHex1);
        const adjHex2Type = this.getHexType(adjHex2);
        if (adjHex1Type === "Water" /* Water */ && adjHex2Type === "Water" /* Water */) {
          continue;
        }
        const newDistance = currentDistance + 1;
        const existingDistance = this.roadDistanceToCity.get(adjRoadKey);
        if (existingDistance === void 0 || newDistance < existingDistance) {
          this.roadDistanceToCity.set(adjRoadKey, newDistance);
          queue.push({ edge: adjacentEdge, distance: newDistance });
        }
        processed.add(adjRoadKey);
      }
    }
  }
  /** Format sérialisé de la carte (pour GameMap.serialize). */
  serialize() {
    const roads = [];
    for (const s of this.getRegisteredCivilizationValues()) {
      const civId = CivilizationId.create(s);
      for (const edge of this.getRoadsForCivilization(civId)) {
        roads.push({ edge: edge.serialize(), owner: s });
      }
    }
    return {
      grid: this.grid.serialize(),
      hexTypes: Object.fromEntries(this.hexTypeMap),
      civilizations: this.getRegisteredCivilizationValues(),
      cities: [...this.cityMap.values()].map((c) => c.serialize()),
      roads
    };
  }
  /** Désérialise depuis l'objet produit par serialize. */
  static deserialize(data) {
    const grid = HexGrid.deserialize(data.grid);
    const map = new _GameMap(grid);
    for (const [key, type] of Object.entries(data.hexTypes)) {
      const [q, r] = key.split(",").map(Number);
      map.setHexType(HexCoord.deserialize([q, r]), type);
    }
    for (const s of data.civilizations) {
      map.registerCivilization(CivilizationId.deserialize(s));
    }
    for (const c of data.cities) {
      const v = Vertex.deserialize(c.vertex);
      const owner = CivilizationId.deserialize(c.owner);
      map.addCity(v, owner, c.level);
      const city = map.getCity(v);
      for (const b of c.buildings) {
        city.addBuilding(b);
      }
      for (const [bt, time] of Object.entries(c.buildingProductionTimes)) {
        city.setBuildingProductionTime(bt, time);
      }
    }
    for (const r of data.roads) {
      map.addRoad(Edge.deserialize(r.edge), CivilizationId.deserialize(r.owner));
    }
    return map;
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
    const hexTypesToAssign = [];
    for (const [hexType, count] of config.resourceDistribution.entries()) {
      if (hexType === "Water" /* Water */) {
        continue;
      }
      for (let i = 0; i < count; i++) {
        hexTypesToAssign.push(hexType);
      }
    }
    const woodIndex = hexTypesToAssign.indexOf("Wood" /* Wood */);
    const brickIndex = hexTypesToAssign.indexOf("Brick" /* Brick */);
    if (woodIndex !== -1) {
      hexTypesToAssign.splice(woodIndex, 1);
    }
    if (brickIndex !== -1 && brickIndex !== woodIndex) {
      const adjustedBrickIndex = hexTypesToAssign.indexOf("Brick" /* Brick */);
      if (adjustedBrickIndex !== -1) {
        hexTypesToAssign.splice(adjustedBrickIndex, 1);
      }
    }
    rng.shuffle(hexTypesToAssign);
    gameMap.setHexType(woodCoord, "Wood" /* Wood */);
    gameMap.setHexType(brickCoord, "Brick" /* Brick */);
    const remainingHexes = terrestrialHexes.filter(
      (hex) => !hex.coord.equals(woodCoord) && !hex.coord.equals(brickCoord)
    );
    const shuffledHexes = [...remainingHexes];
    rng.shuffle(shuffledHexes);
    for (let i = 0; i < hexTypesToAssign.length && i < shuffledHexes.length; i++) {
      const hex = shuffledHexes[i];
      const hexType = hexTypesToAssign[i];
      gameMap.setHexType(hex.coord, hexType);
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
        gameMap.setHexType(hex.coord, "Water" /* Water */);
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
          const hexType = gameMap.getHexType(waterHex);
          if (hexType === "Water" /* Water */) {
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
          const hexType = gameMap.getHexType(neighborCoord);
          if (hexType === "Water" /* Water */) {
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

// src/controller/MainGameController.ts
var MainGameController = class {
  constructor(gameState) {
    this.gameState = gameState;
  }
  getGameState() {
    return this.gameState;
  }
  setGameState(state) {
    this.gameState = state;
  }
  getGameMap() {
    return this.gameState.getGameMap();
  }
  getPlayerResources() {
    return this.gameState.getPlayerResources();
  }
  getPlayerCivilizationId() {
    return this.gameState.getPlayerCivilizationId();
  }
  getGameClock() {
    return this.gameState.getGameClock();
  }
  getSeed() {
    return this.gameState.getSeed();
  }
  updateGameTime(timeSeconds) {
    this.gameState.getGameClock().updateTime(timeSeconds);
  }
};

// src/model/game/PlayerResources.ts
var PlayerResources = class _PlayerResources {
  /**
   * Crée un inventaire vide.
   */
  constructor() {
    this.resources = /* @__PURE__ */ new Map();
    this.resources.set("Wood" /* Wood */, 0);
    this.resources.set("Brick" /* Brick */, 0);
    this.resources.set("Wheat" /* Wheat */, 0);
    this.resources.set("Sheep" /* Sheep */, 0);
    this.resources.set("Ore" /* Ore */, 0);
  }
  /**
   * Ajoute une quantité de ressource à l'inventaire.
   * @param resource - Le type de ressource
   * @param amount - La quantité à ajouter (doit être positive)
   * @throws Error si la ressource n'est pas récoltable
   * @throws Error si la quantité est négative
   */
  addResource(resource, amount) {
    if (!this.isHarvestable(resource)) {
      throw new Error(`La ressource ${resource} n'est pas r\xE9coltable.`);
    }
    if (amount < 0) {
      throw new Error("La quantit\xE9 \xE0 ajouter doit \xEAtre positive.");
    }
    const current = this.resources.get(resource) || 0;
    this.resources.set(resource, current + amount);
  }
  /**
   * Retire une quantité de ressource de l'inventaire.
   * @param resource - Le type de ressource
   * @param amount - La quantité à retirer (doit être positive)
   * @throws Error si la ressource n'est pas récoltable
   * @throws Error si la quantité est négative
   * @throws Error si l'inventaire n'a pas assez de ressources
   */
  removeResource(resource, amount) {
    if (!this.isHarvestable(resource)) {
      throw new Error(`La ressource ${resource} n'est pas r\xE9coltable.`);
    }
    if (amount < 0) {
      throw new Error("La quantit\xE9 \xE0 retirer doit \xEAtre positive.");
    }
    const current = this.resources.get(resource) || 0;
    if (current < amount) {
      throw new Error(
        `Pas assez de ${resource}. Disponible: ${current}, requis: ${amount}.`
      );
    }
    this.resources.set(resource, current - amount);
  }
  /**
   * Retourne la quantité d'une ressource dans l'inventaire.
   * @param resource - Le type de ressource
   * @returns La quantité disponible (0 si la ressource n'est pas récoltable)
   */
  getResource(resource) {
    if (!this.isHarvestable(resource)) {
      return 0;
    }
    return this.resources.get(resource) || 0;
  }
  /**
   * Vérifie si le joueur a assez d'une ressource donnée.
   * @param resource - Le type de ressource
   * @param amount - La quantité requise
   * @returns true si l'inventaire contient au moins la quantité requise
   */
  hasEnough(resource, amount) {
    if (!this.isHarvestable(resource)) {
      return false;
    }
    return this.getResource(resource) >= amount;
  }
  /**
   * Vérifie si le joueur peut se permettre un coût donné.
   * Un coût est un objet avec des ressources et leurs quantités requises.
   * @param cost - Un objet Map ou Record avec les ressources et quantités requises
   * @returns true si toutes les ressources requises sont disponibles en quantité suffisante
   */
  canAfford(cost) {
    const costMap = cost instanceof Map ? cost : new Map(
      Object.entries(cost).map(([key, value]) => [
        key,
        value
      ])
    );
    for (const [resource, requiredAmount] of costMap.entries()) {
      if (!this.hasEnough(resource, requiredAmount)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Retire les ressources correspondant à un coût de l'inventaire.
   * @param cost - Un objet Map ou Record avec les ressources et quantités requises
   * @throws Error si le joueur ne peut pas se permettre le coût
   */
  payCost(cost) {
    if (!this.canAfford(cost)) {
      throw new Error("Le joueur ne peut pas se permettre ce co\xFBt.");
    }
    const costMap = cost instanceof Map ? cost : new Map(
      Object.entries(cost).map(([key, value]) => [
        key,
        value
      ])
    );
    for (const [resource, amount] of costMap.entries()) {
      this.removeResource(resource, amount);
    }
  }
  /**
   * Retourne toutes les ressources de l'inventaire.
   * @returns Un Map avec toutes les ressources et leurs quantités
   */
  getAllResources() {
    return new Map(this.resources);
  }
  /**
   * Réinitialise toutes les ressources à 0.
   */
  clear() {
    this.resources.set("Wood" /* Wood */, 0);
    this.resources.set("Brick" /* Brick */, 0);
    this.resources.set("Wheat" /* Wheat */, 0);
    this.resources.set("Sheep" /* Sheep */, 0);
    this.resources.set("Ore" /* Ore */, 0);
  }
  /**
   * Vérifie si une ressource est récoltable.
   * @param resource - Le type de ressource
   * @returns true si la ressource peut être récoltée (Wood, Brick, Wheat, Sheep, Ore)
   */
  isHarvestable(resource) {
    return resource === "Wood" /* Wood */ || resource === "Brick" /* Brick */ || resource === "Wheat" /* Wheat */ || resource === "Sheep" /* Sheep */ || resource === "Ore" /* Ore */;
  }
  /** Sérialise l'inventaire en Record<ResourceType, number>. */
  serialize() {
    return Object.fromEntries(this.resources);
  }
  /** Désérialise depuis un objet { [ResourceType]: number }. */
  static deserialize(data) {
    const pr = new _PlayerResources();
    pr.clear();
    for (const rt of Object.values(ResourceType)) {
      const n = data[rt] ?? 0;
      if (n > 0) pr.addResource(rt, n);
    }
    return pr;
  }
};

// src/model/game/GameClock.ts
var GameClock = class _GameClock {
  constructor() {
    this.currentTime = 0;
  }
  // Temps courant en secondes
  /**
   * Met à jour le temps courant de l'horloge.
   * Doit être appelée par la couche applicative à chaque frame.
   * 
   * @param nowSeconds - Le temps actuel en secondes (depuis un point de référence, ex: timestamp / 1000)
   */
  updateTime(nowSeconds) {
    this.currentTime = nowSeconds;
  }
  /**
   * Retourne le temps courant de l'horloge en secondes.
   * @returns Le temps courant en secondes
   */
  getCurrentTime() {
    return this.currentTime;
  }
  /**
   * Réinitialise l'horloge à 0.
   * Utile pour les tests ou lors d'une nouvelle partie.
   */
  reset() {
    this.currentTime = 0;
  }
  /** Sérialise l'horloge en { currentTime }. */
  serialize() {
    return { currentTime: this.currentTime };
  }
  /** Désérialise depuis { currentTime }. */
  static deserialize(data) {
    const gc = new _GameClock();
    gc.updateTime(data.currentTime);
    return gc;
  }
};

// src/model/game/GameState.ts
var GameState = class _GameState {
  constructor(playerResources, playerCivilizationId, gameClock) {
    this.playerResources = playerResources;
    this.playerCivilizationId = playerCivilizationId;
    this.gameClock = gameClock;
    this.gameMap = null;
    this.civilizations = [];
    /** Seed utilisé pour la génération de la carte (null si non initialisée). */
    this.seed = null;
  }
  /** Ressources du joueur. */
  getPlayerResources() {
    return this.playerResources;
  }
  /** Identifiant de la civilisation du joueur. */
  getPlayerCivilizationId() {
    return this.playerCivilizationId;
  }
  /** Liste des civilisations de la partie. */
  getCivilizations() {
    return this.civilizations;
  }
  /** Carte de jeu, ou null si non initialisée. */
  getGameMap() {
    return this.gameMap;
  }
  /** Horloge de jeu. */
  getGameClock() {
    return this.gameClock;
  }
  /** Seed de génération de la carte, ou null si non initialisée. */
  getSeed() {
    return this.seed;
  }
  /** Définit la carte de jeu (lors d'une nouvelle partie ou régénération). */
  setGameMap(map) {
    this.gameMap = map;
  }
  /** Définit la liste des civilisations de la partie. */
  setCivilizations(civs) {
    this.civilizations = [...civs];
  }
  /** Définit le seed de génération (lors d'une nouvelle partie ou régénération). */
  setSeed(seed) {
    this.seed = seed;
  }
  /**
   * Sérialise l'état en une chaîne JSON.
   * Chaque sous-objet (PlayerResources, GameClock, GameMap) se sérialise lui-même.
   */
  serialize() {
    const obj = {
      playerResources: this.playerResources.serialize(),
      playerCivilizationId: this.playerCivilizationId.serialize(),
      gameClock: this.gameClock.serialize(),
      gameMap: this.gameMap?.serialize() ?? null,
      civilizations: this.civilizations.map((c) => c.serialize()),
      seed: this.seed
    };
    return JSON.stringify(obj);
  }
  /**
   * Désérialise un GameState depuis une chaîne JSON.
   * Chaque sous-objet est reconstruit via sa méthode deserialize.
   */
  static deserialize(json) {
    const obj = JSON.parse(json);
    const pr = PlayerResources.deserialize(obj.playerResources);
    const civId = CivilizationId.deserialize(obj.playerCivilizationId);
    const gc = GameClock.deserialize(obj.gameClock);
    const gs = new _GameState(pr, civId, gc);
    gs.setCivilizations(obj.civilizations.map((s) => CivilizationId.deserialize(s)));
    gs.setSeed(obj.seed);
    if (obj.gameMap != null) {
      gs.setGameMap(GameMap.deserialize(obj.gameMap));
    }
    return gs;
  }
};

// src/application/MainGame.ts
var MainGame = class {
  constructor() {
    this.mapGenerator = new MapGenerator();
    const gameState = new GameState(
      new PlayerResources(),
      CivilizationId.create("player1"),
      new GameClock()
    );
    this.controller = new MainGameController(gameState);
  }
  /**
   * Retourne le contrôleur de partie (accès à la carte, ressources, horloge, etc.).
   */
  getController() {
    return this.controller;
  }
  /**
   * Démarre une nouvelle partie : génère une carte et réinitialise l'état.
   * @param seed - Seed optionnel pour la génération (par défaut: timestamp)
   */
  newGame(seed) {
    const actualSeed = seed ?? Date.now();
    const state = this.controller.getGameState();
    const resourceDistribution = /* @__PURE__ */ new Map([
      ["Wood" /* Wood */, 5],
      ["Brick" /* Brick */, 5],
      ["Wheat" /* Wheat */, 5],
      ["Sheep" /* Sheep */, 5],
      ["Ore" /* Ore */, 5],
      ["Desert" /* Desert */, 1]
    ]);
    const civilizations = [state.getPlayerCivilizationId()];
    const config = {
      resourceDistribution,
      civilizations,
      seed: actualSeed
    };
    const gameMap = this.mapGenerator.generate(config);
    state.setGameMap(gameMap);
    state.setCivilizations(civilizations);
    state.setSeed(actualSeed);
    state.getPlayerResources().clear();
    state.getGameClock().reset();
  }
  /**
   * Sauvegarde la partie en une chaîne (sérialisation de GameState).
   */
  saveGame() {
    return this.controller.getGameState().serialize();
  }
  /**
   * Charge une partie depuis une chaîne et remplace l'état du contrôleur.
   */
  loadGame(serialized) {
    const state = GameState.deserialize(serialized);
    this.controller.setGameState(state);
  }
  // ——— Délégations vers le contrôleur (compatibilité / raccourcis) ———
  getGameState() {
    return this.controller.getGameState();
  }
  getGameMap() {
    return this.controller.getGameMap();
  }
  getPlayerResources() {
    return this.controller.getPlayerResources();
  }
  getPlayerCivilizationId() {
    return this.controller.getPlayerCivilizationId();
  }
  getGameClock() {
    return this.controller.getGameClock();
  }
  getSeed() {
    return this.controller.getSeed();
  }
  updateGameTime(timeSeconds) {
    this.controller.updateGameTime(timeSeconds);
  }
};

// src/model/game/ResourceHarvest.ts
var ResourceHarvest = class {
  /**
   * Convertit un HexType en ResourceType si c'est une ressource récoltable.
   * @param hexType - Le type d'hexagone
   * @returns Le ResourceType correspondant, ou null si non récoltable
   */
  static hexTypeToResourceType(hexType) {
    switch (hexType) {
      case "Wood" /* Wood */:
        return "Wood" /* Wood */;
      case "Brick" /* Brick */:
        return "Brick" /* Brick */;
      case "Wheat" /* Wheat */:
        return "Wheat" /* Wheat */;
      case "Sheep" /* Sheep */:
        return "Sheep" /* Sheep */;
      case "Ore" /* Ore */:
        return "Ore" /* Ore */;
      default:
        return null;
    }
  }
  /**
   * Calcule le gain de ressource pour un hexagone donné.
   * Le gain de base est de 1 par hexagone, mais peut être modifié par des bonus futurs.
   * @param hexType - Le type d'hexagone
   * @returns La quantité de ressource gagnée (0 si non récoltable)
   */
  static calculateGain(hexType) {
    return this.hexTypeToResourceType(hexType) !== null ? 1 : 0;
  }
  /**
   * Vérifie si un hexagone est adjacent à une ville du joueur.
   * Un hexagone est adjacent à une ville si la ville est sur un vertex qui contient cet hexagone.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est adjacent à au moins une ville du joueur
   */
  static isAdjacentToPlayerCity(hexCoord, gameMap, civId) {
    return this.getAdjacentPlayerCity(hexCoord, gameMap, civId) !== null;
  }
  /**
   * Retourne la première ville du joueur adjacente à un hexagone.
   * Un hexagone est adjacent à une ville si la ville est sur un vertex qui contient cet hexagone.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns Le vertex avec la ville adjacente, ou null si aucune ville adjacente
   */
  static getAdjacentPlayerCity(hexCoord, gameMap, civId) {
    const grid = gameMap.getGrid();
    const vertices = grid.getVerticesForHex(hexCoord);
    for (const vertex of vertices) {
      if (gameMap.hasCity(vertex)) {
        const owner = gameMap.getCityOwner(vertex);
        if (owner && owner.equals(civId)) {
          return vertex;
        }
      }
    }
    return null;
  }
  /**
   * Vérifie si un hexagone peut être récolté par le joueur.
   * @param hexCoord - La coordonnée de l'hexagone
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @returns true si l'hexagone est récoltable
   */
  static canHarvest(hexCoord, gameMap, civId) {
    const grid = gameMap.getGrid();
    if (!grid.hasHex(hexCoord)) {
      return false;
    }
    if (!gameMap.isHexVisible(hexCoord)) {
      return false;
    }
    if (!this.isAdjacentToPlayerCity(hexCoord, gameMap, civId)) {
      return false;
    }
    const hexType = gameMap.getHexType(hexCoord);
    if (!hexType) {
      return false;
    }
    return this.hexTypeToResourceType(hexType) !== null;
  }
  /**
   * Récolte les ressources d'un hexagone et les ajoute à l'inventaire du joueur.
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param gameMap - La carte de jeu
   * @param civId - L'identifiant de la civilisation du joueur
   * @param playerResources - L'inventaire du joueur
   * @param cityVertex - Optionnel: le vertex de la ville qui récolte. Si fourni, cette ville sera utilisée au lieu de chercher automatiquement.
   * @returns Un objet contenant la quantité récoltée et la ville qui a permis la récolte
   * @throws Error si l'hexagone ne peut pas être récolté
   */
  static harvest(hexCoord, gameMap, civId, playerResources, cityVertex) {
    let actualCityVertex = null;
    if (cityVertex !== void 0) {
      const vertexHexes = cityVertex.getHexes();
      const isAdjacent = vertexHexes.some((h) => h.equals(hexCoord));
      if (!isAdjacent) {
        throw new Error(
          `Le vertex fourni n'est pas adjacent \xE0 l'hexagone \xE0 ${hexCoord.toString()}.`
        );
      }
      if (!gameMap.hasCity(cityVertex)) {
        throw new Error(
          `Aucune ville trouv\xE9e sur le vertex fourni pour l'hexagone \xE0 ${hexCoord.toString()}.`
        );
      }
      const owner = gameMap.getCityOwner(cityVertex);
      if (!owner || !owner.equals(civId)) {
        throw new Error(
          `La ville sur le vertex fourni n'appartient pas \xE0 la civilisation pour l'hexagone \xE0 ${hexCoord.toString()}.`
        );
      }
      actualCityVertex = cityVertex;
    } else {
      if (!this.canHarvest(hexCoord, gameMap, civId)) {
        throw new Error(
          `L'hexagone \xE0 ${hexCoord.toString()} ne peut pas \xEAtre r\xE9colt\xE9.`
        );
      }
      actualCityVertex = this.getAdjacentPlayerCity(hexCoord, gameMap, civId);
      if (!actualCityVertex) {
        throw new Error(
          `Aucune ville adjacente trouv\xE9e pour l'hexagone \xE0 ${hexCoord.toString()}.`
        );
      }
    }
    const grid = gameMap.getGrid();
    if (!grid.hasHex(hexCoord)) {
      throw new Error(
        `L'hexagone \xE0 ${hexCoord.toString()} n'existe pas dans la grille.`
      );
    }
    if (!gameMap.isHexVisible(hexCoord)) {
      throw new Error(
        `L'hexagone \xE0 ${hexCoord.toString()} n'est pas visible.`
      );
    }
    const hexType = gameMap.getHexType(hexCoord);
    if (!hexType) {
      throw new Error(
        `Aucun type d'hexagone trouv\xE9 sur l'hexagone \xE0 ${hexCoord.toString()}.`
      );
    }
    const resourceType = this.hexTypeToResourceType(hexType);
    if (!resourceType) {
      throw new Error(
        `L'hexagone \xE0 ${hexCoord.toString()} ne contient pas de ressource r\xE9coltable.`
      );
    }
    const gain = this.calculateGain(hexType);
    if (gain > 0) {
      playerResources.addResource(resourceType, gain);
    }
    return { gain, cityVertex: actualCityVertex };
  }
};

// src/controller/ResourceHarvestController.ts
var _ResourceHarvestController = class _ResourceHarvestController {
  // 1 seconde
  /**
   * Récolte une ressource d'un hexagone pour une civilisation donnée.
   * Applique une limitation de taux de 1 récolte par seconde maximum par hex.
   * 
   * @param hexCoord - La coordonnée de l'hexagone à récolter
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns Un objet indiquant le succès de la récolte et le temps restant
   */
  static harvest(hexCoord, civId, map, resources) {
    const hexKey = hexCoord.hashCode();
    const lastHarvestTime = _ResourceHarvestController.hexCooldowns.get(hexKey);
    if (lastHarvestTime !== void 0) {
      const now2 = Date.now();
      const timeSinceLastHarvest = now2 - lastHarvestTime;
      const remainingTime = Math.max(0, _ResourceHarvestController.MIN_HARVEST_INTERVAL_MS - timeSinceLastHarvest);
      if (timeSinceLastHarvest < _ResourceHarvestController.MIN_HARVEST_INTERVAL_MS) {
        return {
          success: false,
          remainingTimeMs: remainingTime,
          cityVertex: null
        };
      }
    }
    if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
      return {
        success: false,
        remainingTimeMs: 0,
        // Pas de limitation si la récolte n'est pas possible pour d'autres raisons
        cityVertex: null
      };
    }
    const harvestResult = ResourceHarvest.harvest(hexCoord, map, civId, resources);
    const now = Date.now();
    _ResourceHarvestController.hexCooldowns.set(hexKey, now);
    return {
      success: true,
      remainingTimeMs: _ResourceHarvestController.MIN_HARVEST_INTERVAL_MS,
      cityVertex: harvestResult.cityVertex
    };
  }
  /**
   * Retourne le temps restant avant qu'un hexagone puisse être récolté à nouveau.
   * @param hexCoord - La coordonnée de l'hexagone
   * @returns Le temps restant en millisecondes (0 si prêt à récolter)
   */
  static getRemainingCooldown(hexCoord) {
    const hexKey = hexCoord.hashCode();
    const lastHarvestTime = _ResourceHarvestController.hexCooldowns.get(hexKey);
    if (lastHarvestTime === void 0) {
      return 0;
    }
    const now = Date.now();
    const timeSinceLastHarvest = now - lastHarvestTime;
    return Math.max(0, _ResourceHarvestController.MIN_HARVEST_INTERVAL_MS - timeSinceLastHarvest);
  }
  /**
   * Réinitialise tous les cooldowns. Utile pour les tests.
   */
  static resetCooldowns() {
    _ResourceHarvestController.hexCooldowns.clear();
  }
};
_ResourceHarvestController.hexCooldowns = /* @__PURE__ */ new Map();
// Map<hexCoord.hashCode(), timestamp>
_ResourceHarvestController.MIN_HARVEST_INTERVAL_MS = 1e3;
var ResourceHarvestController = _ResourceHarvestController;

// src/controller/BuildingProductionController.ts
var BuildingProductionController = class {
  /**
   * Traite la production automatique pour toutes les villes d'une civilisation.
   * Pour chaque bâtiment de ressource, vérifie les hexagones adjacents et récolte
   * ceux qui sont prêts (intervalle de production écoulé + conditions de récolte).
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu pour gérer le temps
   * @returns Liste des productions effectuées (pour notifier la vue)
   */
  static processAutomaticProduction(civId, map, resources, gameClock) {
    const results = [];
    const cities = map.getCitiesByCivilization(civId);
    for (const city of cities) {
      const cityResults = this.processCityProduction(city, civId, map, resources, gameClock);
      results.push(...cityResults);
    }
    return results;
  }
  /**
   * Traite la production automatique pour une ville donnée.
   * 
   * @param city - La ville à traiter
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param gameClock - L'horloge de jeu pour gérer le temps
   * @returns Liste des productions effectuées pour cette ville
   */
  static processCityProduction(city, civId, map, resources, gameClock) {
    const results = [];
    const resourceBuildings = getResourceProductionBuildings();
    const cityBuildings = city.getBuildings();
    for (const buildingType of cityBuildings) {
      if (!resourceBuildings.includes(buildingType)) {
        continue;
      }
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType === null) {
        continue;
      }
      const currentTime = gameClock.getCurrentTime();
      const lastProductionTime = city.getBuildingProductionTime(buildingType);
      if (lastProductionTime === void 0) {
        city.setBuildingProductionTime(buildingType, currentTime);
        continue;
      }
      const timeElapsed = currentTime - lastProductionTime;
      if (timeElapsed < this.PRODUCTION_INTERVAL_SECONDS) {
        continue;
      }
      const adjacentHexes = this.getAdjacentHexesOfType(city.vertex, requiredHexType, map);
      for (const hexCoord of adjacentHexes) {
        if (!ResourceHarvest.canHarvest(hexCoord, map, civId)) {
          continue;
        }
        const hexType = map.getHexType(hexCoord);
        if (hexType !== requiredHexType) {
          continue;
        }
        try {
          const harvestResult = ResourceHarvest.harvest(hexCoord, map, civId, resources, city.vertex);
          const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
          if (resourceType) {
            const newProductionTime = lastProductionTime + this.PRODUCTION_INTERVAL_SECONDS;
            city.updateBuildingProductionTime(buildingType, newProductionTime);
            results.push({
              cityVertex: city.vertex,
              buildingType,
              hexCoord,
              resourceType
            });
          }
        } catch (error) {
          continue;
        }
        break;
      }
    }
    return results;
  }
  /**
   * Retourne les hexagones adjacents à un vertex qui ont le type requis.
   * Un hexagone est adjacent à un vertex s'il fait partie des 3 hexagones qui forment le vertex.
   * 
   * @param vertex - Le vertex (ville)
   * @param hexType - Le type d'hex recherché
   * @param map - La carte de jeu
   * @returns Liste des hexagones adjacents du type requis
   */
  static getAdjacentHexesOfType(vertex, hexType, map) {
    const matchingHexes = [];
    const hexes = vertex.getHexes();
    for (const hexCoord of hexes) {
      if (!map.getGrid().hasHex(hexCoord)) {
        continue;
      }
      const hexTypeInMap = map.getHexType(hexCoord);
      if (hexTypeInMap === hexType) {
        matchingHexes.push(hexCoord);
      }
    }
    return matchingHexes;
  }
  /**
   * Vérifie si un hexagone est automatiquement récolté par un bâtiment.
   * Un hex est automatiquement récolté s'il est adjacent à une ville qui a un bâtiment
   * de production de ressources capable de récolter ce type d'hex.
   * 
   * @param hexCoord - L'hexagone à vérifier
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'hex est automatiquement récolté
   */
  static isHexAutoHarvested(hexCoord, civId, map) {
    const hexType = map.getHexType(hexCoord);
    if (!hexType) {
      return false;
    }
    const grid = map.getGrid();
    const vertices = grid.getVertices(hexCoord);
    for (const vertex of vertices) {
      const city = map.getCity(vertex);
      if (!city || !city.owner.equals(civId)) {
        continue;
      }
      const resourceBuildings = getResourceProductionBuildings();
      const cityBuildings = city.getBuildings();
      for (const buildingType of cityBuildings) {
        if (!resourceBuildings.includes(buildingType)) {
          continue;
        }
        const requiredHexType = getRequiredHexType(buildingType);
        if (requiredHexType === hexType) {
          const vertexHexes = vertex.getHexes();
          if (vertexHexes.some((h) => h.equals(hexCoord))) {
            return true;
          }
        }
      }
    }
    return false;
  }
};
/**
 * Intervalle entre deux productions pour un bâtiment (en secondes).
 */
BuildingProductionController.PRODUCTION_INTERVAL_SECONDS = 1;

// src/model/game/RoadConstruction.ts
var _RoadConstruction = class _RoadConstruction {
  /**
   * Vérifie si un edge peut être construit par une civilisation donnée.
   * @param edge - L'arête à construire
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'edge peut être construit
   */
  static canBuildRoad(edge, civId, map) {
    if (!map.isCivilizationRegistered(civId)) {
      return false;
    }
    if (map.hasRoad(edge)) {
      return false;
    }
    const vertices = map.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      if (map.hasCity(vertex)) {
        const owner = map.getCityOwner(vertex);
        if (owner && owner.equals(civId)) {
          return true;
        }
      }
    }
    const adjacentEdges = this.getAdjacentEdges(edge, map);
    for (const adjacentEdge of adjacentEdges) {
      if (map.hasRoad(adjacentEdge)) {
        const owner = map.getRoadOwner(adjacentEdge);
        if (owner && owner.equals(civId)) {
          return true;
        }
      }
    }
    return false;
  }
  /**
   * Vérifie si le joueur a assez de ressources pour construire une route.
   * @param resources - Les ressources du joueur
   * @param distance - La distance à la ville (optionnel, pour vérifier le coût réel)
   * @returns true si le joueur a assez de ressources
   */
  static canAfford(resources, distance) {
    const cost = _RoadConstruction.getCost(distance);
    return resources.canAfford(cost);
  }
  /**
   * Retourne le coût de construction d'une route.
   * Le coût de base est multiplié par 2^distance.
   * @param distance - La distance à la ville la plus proche (optionnel, défaut = 0 pour coût de base)
   * @returns Le coût sous forme de Map
   */
  static getCost(distance) {
    const multiplier = distance !== void 0 ? Math.pow(2, distance) : 1;
    const cost = /* @__PURE__ */ new Map();
    for (const [resourceType, baseAmount] of _RoadConstruction.COST.entries()) {
      cost.set(resourceType, baseAmount * multiplier);
    }
    return cost;
  }
  /**
   * Retourne les edges adjacents à un edge donné.
   * Deux edges sont adjacents s'ils partagent un vertex.
   * @param edge - L'arête pour laquelle trouver les edges adjacents
   * @param map - La carte de jeu
   * @returns Un tableau des edges adjacents à cette arête
   */
  static getAdjacentEdges(edge, map) {
    const adjacentEdges = [];
    const vertices = map.getVerticesForEdge(edge);
    for (const vertex of vertices) {
      const hexes = vertex.getHexes();
      for (let i = 0; i < hexes.length; i++) {
        for (let j = i + 1; j < hexes.length; j++) {
          try {
            const adjacentEdge = Edge.create(hexes[i], hexes[j]);
            if (!adjacentEdge.equals(edge)) {
              if (!adjacentEdges.some((e) => e.equals(adjacentEdge))) {
                adjacentEdges.push(adjacentEdge);
              }
            }
          } catch (e) {
          }
        }
      }
    }
    return adjacentEdges;
  }
};
_RoadConstruction.COST = /* @__PURE__ */ new Map([
  ["Brick" /* Brick */, 1],
  ["Wood" /* Wood */, 1]
]);
var RoadConstruction = _RoadConstruction;

// src/controller/OutpostController.ts
var OutpostController = class {
  /**
   * Vérifie si un avant-poste peut être construit sur un vertex.
   * @param vertex - Le vertex où construire l'avant-poste
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si l'avant-poste peut être construit
   */
  static canBuildOutpost(vertex, civId, map) {
    if (!map.isCivilizationRegistered(civId)) {
      return false;
    }
    if (map.hasCity(vertex)) {
      return false;
    }
    const edgesForVertex = map.getEdgesForVertex(vertex);
    let touchesRoad = false;
    for (const edge of edgesForVertex) {
      if (map.hasRoad(edge)) {
        const owner = map.getRoadOwner(edge);
        if (owner && owner.equals(civId)) {
          touchesRoad = true;
          break;
        }
      }
    }
    if (!touchesRoad) {
      return false;
    }
    const distance = map.calculateVertexDistanceToCity(vertex, civId);
    if (distance === void 0 || distance < 2) {
      return false;
    }
    return true;
  }
  /**
   * Calcule le coût de construction d'un avant-poste en fonction du nombre de villes.
   * @param cityCount - Le nombre de villes existantes sur la carte
   * @returns Le coût sous forme de Map
   */
  static getBuildableOutpostCost(cityCount) {
    const cost = /* @__PURE__ */ new Map();
    for (const [resourceType, baseAmount] of this.BASE_COST.entries()) {
      cost.set(resourceType, baseAmount * cityCount);
    }
    return cost;
  }
  /**
   * Vérifie si le joueur a assez de ressources pour construire un avant-poste.
   * @param resources - Les ressources du joueur
   * @param cityCount - Le nombre de villes existantes sur la carte
   * @returns true si le joueur a assez de ressources
   */
  static canAfford(resources, cityCount) {
    const cost = this.getBuildableOutpostCost(cityCount);
    return resources.canAfford(cost);
  }
  /**
   * Construit un avant-poste sur un vertex.
   * @param vertex - Le vertex où construire l'avant-poste
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildOutpost(vertex, civId, map, resources) {
    if (!this.canBuildOutpost(vertex, civId, map)) {
      throw new Error(
        `L'avant-poste ne peut pas \xEAtre construit sur le vertex ${vertex.toString()}. Le vertex doit toucher une route de la civilisation et \xEAtre \xE0 au moins 2 routes de distance d'une ville.`
      );
    }
    const cityCount = map.getCityCount();
    const cost = this.getBuildableOutpostCost(cityCount);
    if (!this.canAfford(resources, cityCount)) {
      const woodCost = cost.get("Wood" /* Wood */) || 0;
      const brickCost = cost.get("Brick" /* Brick */) || 0;
      const wheatCost = cost.get("Wheat" /* Wheat */) || 0;
      const sheepCost = cost.get("Sheep" /* Sheep */) || 0;
      throw new Error(
        `Pas assez de ressources pour construire un avant-poste. Requis: ${woodCost} Bois, ${brickCost} Brique, ${wheatCost} Bl\xE9, ${sheepCost} Mouton (${cityCount} ville${cityCount > 1 ? "s" : ""}).`
      );
    }
    resources.payCost(cost);
    map.addCity(vertex, civId, 0 /* Outpost */);
  }
};
/**
 * Coût de base pour construire un avant-poste (multiplié par le nombre de villes).
 */
OutpostController.BASE_COST = /* @__PURE__ */ new Map([
  ["Wood" /* Wood */, 10],
  ["Brick" /* Brick */, 10],
  ["Wheat" /* Wheat */, 10],
  ["Sheep" /* Sheep */, 10]
]);

// src/view/HexMapRenderer.ts
var HEX_TYPE_COLORS = {
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
var _HexMapRenderer = class _HexMapRenderer {
  constructor(canvas) {
    this.showCoordinates = false;
    this.currentConfig = null;
    this.currentGameMap = null;
    this.onHexClickCallback = null;
    this.onEdgeClickCallback = null;
    this.onVertexClickCallback = null;
    this.onOutpostVertexClickCallback = null;
    this.hoveredEdge = null;
    this.hoveredVertex = null;
    this.hoveredOutpostVertex = null;
    this.selectedVertex = null;
    this.currentCivilizationId = null;
    this.renderCallback = null;
    this.harvestedHexes = /* @__PURE__ */ new Map();
    // Map<hexCoord.hashCode(), timestamp>
    this.citySprites = /* @__PURE__ */ new Map();
    this.citySpritesLoaded = false;
    this.hexTextures = /* @__PURE__ */ new Map();
    this.hexTexturesLoaded = false;
    this.lockSprite = null;
    this.lockSpriteLoaded = false;
    this.resourceParticles = [];
    this.animationFrameId = null;
    this.cooldownAnimationFrameId = null;
    this.tooltipElement = null;
    this.tooltipEdge = null;
    this.tooltipOutpostVertex = null;
    /**
     * Gestionnaire de mouvement de souris pour mettre en surbrillance les routes constructibles et les villes.
     */
    this.handleMouseMove = (event) => {
      if (!this.currentConfig || !this.currentGameMap) {
        return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const pixelX = (event.clientX - rect.left) * scaleX;
      const pixelY = (event.clientY - rect.top) * scaleY;
      let needsRender = false;
      const vertex = this.pixelToVertex(pixelX, pixelY);
      if (vertex && this.currentGameMap && this.currentGameMap.hasCity(vertex)) {
        if (!this.hoveredVertex || !this.hoveredVertex.equals(vertex)) {
          this.hoveredVertex = vertex;
          if (this.hoveredEdge !== null) {
            this.hoveredEdge = null;
          }
          if (this.hoveredOutpostVertex !== null) {
            this.hoveredOutpostVertex = null;
          }
          this.hideTooltip();
          needsRender = true;
        }
      } else {
        if (this.currentCivilizationId) {
          const vertex2 = this.pixelToVertexAny(pixelX, pixelY, 16);
          if (vertex2 && !this.currentGameMap.hasCity(vertex2)) {
            const buildableOutposts = this.currentGameMap.getBuildableOutpostVertices(this.currentCivilizationId);
            const isBuildableOutpost = buildableOutposts.some((buildableVertex) => buildableVertex.equals(vertex2));
            if (isBuildableOutpost) {
              if (!this.hoveredOutpostVertex || !this.hoveredOutpostVertex.equals(vertex2)) {
                this.hoveredOutpostVertex = vertex2;
                if (this.hoveredEdge !== null) {
                  this.hoveredEdge = null;
                }
                needsRender = true;
              }
              this.updateOutpostTooltip(vertex2, event);
            } else {
              if (this.hoveredOutpostVertex !== null) {
                this.hoveredOutpostVertex = null;
                needsRender = true;
              }
              const edge = this.pixelToEdge(pixelX, pixelY);
              if (edge) {
                const buildableRoads = this.currentGameMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
                const isBuildable = buildableRoads.some((buildableEdge) => buildableEdge.equals(edge));
                if (isBuildable) {
                  if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
                    this.hoveredEdge = edge;
                    needsRender = true;
                  }
                  this.updateTooltip(edge, event);
                } else {
                  if (this.hoveredEdge !== null) {
                    this.hoveredEdge = null;
                    needsRender = true;
                  }
                  this.hideTooltip();
                }
              } else {
                if (this.hoveredEdge !== null) {
                  this.hoveredEdge = null;
                  needsRender = true;
                }
                this.hideTooltip();
              }
            }
          } else {
            const edge = this.pixelToEdge(pixelX, pixelY);
            if (edge) {
              const buildableRoads = this.currentGameMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
              const isBuildable = buildableRoads.some((buildableEdge) => buildableEdge.equals(edge));
              if (isBuildable) {
                if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
                  this.hoveredEdge = edge;
                  needsRender = true;
                }
                this.updateTooltip(edge, event);
              } else {
                if (this.hoveredEdge !== null) {
                  this.hoveredEdge = null;
                  needsRender = true;
                }
                this.hideTooltip();
              }
            } else {
              if (this.hoveredEdge !== null) {
                this.hoveredEdge = null;
                needsRender = true;
              }
              this.hideTooltip();
            }
          }
        }
        if (this.hoveredVertex !== null) {
          this.hoveredVertex = null;
          needsRender = true;
        }
        if (this.hoveredOutpostVertex === null && this.currentCivilizationId) {
          const edge = this.pixelToEdge(pixelX, pixelY);
          if (edge) {
            const buildableRoads = this.currentGameMap.getBuildableRoadsForCivilization(this.currentCivilizationId);
            const isBuildable = buildableRoads.some((buildableEdge) => buildableEdge.equals(edge));
            if (isBuildable) {
              if (!this.hoveredEdge || !this.hoveredEdge.equals(edge)) {
                this.hoveredEdge = edge;
                needsRender = true;
              }
              this.updateTooltip(edge, event);
            } else {
              if (this.hoveredEdge !== null) {
                this.hoveredEdge = null;
                needsRender = true;
              }
              this.hideTooltip();
            }
          } else {
            if (this.hoveredEdge !== null) {
              this.hoveredEdge = null;
              needsRender = true;
            }
            this.hideTooltip();
          }
        }
        if (this.hoveredVertex !== null) {
          this.hoveredVertex = null;
          needsRender = true;
        }
        if (this.hoveredOutpostVertex !== null) {
          this.hoveredOutpostVertex = null;
          needsRender = true;
        }
      }
      if (needsRender && this.renderCallback) {
        this.renderCallback();
      }
    };
    /**
     * Gestionnaire quand la souris quitte le canvas.
     */
    this.handleMouseLeave = () => {
      let needsRender = false;
      if (this.hoveredEdge !== null) {
        this.hoveredEdge = null;
        needsRender = true;
      }
      if (this.hoveredVertex !== null) {
        this.hoveredVertex = null;
        needsRender = true;
      }
      if (this.hoveredOutpostVertex !== null) {
        this.hoveredOutpostVertex = null;
        needsRender = true;
      }
      this.hideTooltip();
      if (needsRender && this.renderCallback) {
        this.renderCallback();
      }
    };
    /**
     * Gestionnaire de clic qui vérifie d'abord les villes (priorité maximale), puis les edges, puis les hexagones.
     */
    this.handleClick = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const pixelX = (event.clientX - rect.left) * scaleX;
      const pixelY = (event.clientY - rect.top) * scaleY;
      const vertex = this.pixelToVertex(pixelX, pixelY);
      if (vertex && this.currentGameMap && this.currentGameMap.hasCity(vertex)) {
        if (this.selectedVertex && this.selectedVertex.equals(vertex)) {
          this.selectedVertex = null;
        } else {
          this.selectedVertex = vertex;
        }
        if (this.onVertexClickCallback) {
          this.onVertexClickCallback(vertex);
        }
        if (this.renderCallback) {
          this.renderCallback();
        }
        return;
      }
      if (this.selectedVertex !== null) {
        this.selectedVertex = null;
        if (this.renderCallback) {
          this.renderCallback();
        }
      }
      if (this.onOutpostVertexClickCallback && this.currentCivilizationId) {
        const vertex2 = this.pixelToVertexAny(pixelX, pixelY, 16);
        if (vertex2 && this.currentGameMap) {
          if (!this.currentGameMap.hasCity(vertex2)) {
            const buildableOutposts = this.currentGameMap.getBuildableOutpostVertices(this.currentCivilizationId);
            const isBuildableOutpost = buildableOutposts.some((buildableVertex) => buildableVertex.equals(vertex2));
            if (isBuildableOutpost) {
              this.onOutpostVertexClickCallback(vertex2);
              return;
            }
          }
        }
      }
      if (this.onEdgeClickCallback) {
        const edge = this.pixelToEdge(pixelX, pixelY);
        if (edge) {
          this.onEdgeClickCallback(edge);
          return;
        }
      }
      if (this.onHexClickCallback) {
        const hexCoord = this.pixelToHexCoord(pixelX, pixelY);
        if (hexCoord && this.currentGameMap && this.currentCivilizationId) {
          if (BuildingProductionController.isHexAutoHarvested(hexCoord, this.currentCivilizationId, this.currentGameMap)) {
            return;
          }
          this.onHexClickCallback(hexCoord);
        }
      }
    };
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Impossible d'obtenir le contexte 2D du canvas");
    }
    this.ctx = context;
    this.setupMouseMoveHandler();
    this.setupTooltip();
    this.loadCitySprites();
    this.loadHexTextures();
    this.loadLockSprite();
  }
  /**
   * Charge les sprites SVG des villes.
   */
  loadCitySprites() {
    const spriteFiles = {
      [0 /* Outpost */]: "city-outpost.svg",
      [1 /* Colony */]: "city-colony.svg",
      [2 /* Town */]: "city-town.svg",
      [3 /* Metropolis */]: "city-metropolis.svg",
      [4 /* Capital */]: "city-capital.svg"
    };
    let loadedCount = 0;
    const totalSprites = Object.keys(spriteFiles).length;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalSprites) {
        this.citySpritesLoaded = true;
        if (this.renderCallback) {
          this.renderCallback();
        }
      }
    };
    for (const [level, filename] of Object.entries(spriteFiles)) {
      const levelNum = Number(level);
      const tryLoad = () => {
        const img = new Image();
        const fullPath = "assets/sprites/" + filename;
        img.onload = () => {
          this.citySprites.set(levelNum, img);
          checkAllLoaded();
        };
        img.onerror = () => {
          console.warn(`\xC9chec du chargement avec ${fullPath}`);
          checkAllLoaded();
        };
        img.src = fullPath;
      };
      tryLoad();
    }
  }
  /**
   * Charge le sprite SVG du cadenas.
   */
  loadLockSprite() {
    const img = new Image();
    const fullPath = "assets/sprites/lock.svg";
    img.onload = () => {
      this.lockSprite = img;
      this.lockSpriteLoaded = true;
      if (this.renderCallback) {
        this.renderCallback();
      }
    };
    img.onerror = () => {
      console.warn(`\xC9chec du chargement du sprite de cadenas ${fullPath}`);
    };
    img.src = fullPath;
  }
  /**
   * Charge les textures SVG des hexagones.
   */
  loadHexTextures() {
    const textureFiles = {
      ["Wood" /* Wood */]: "texture-wood.svg",
      ["Brick" /* Brick */]: "texture-brick.svg",
      ["Wheat" /* Wheat */]: "texture-wheat.svg",
      ["Sheep" /* Sheep */]: "texture-sheep.svg",
      ["Ore" /* Ore */]: "texture-ore.svg",
      ["Desert" /* Desert */]: "texture-desert.svg",
      ["Water" /* Water */]: "texture-water.svg"
    };
    let loadedCount = 0;
    const totalTextures = Object.keys(textureFiles).length;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalTextures) {
        this.hexTexturesLoaded = true;
        if (this.renderCallback) {
          this.renderCallback();
        }
      }
    };
    for (const [hexType, filename] of Object.entries(textureFiles)) {
      const type = hexType;
      const tryLoad = () => {
        const img = new Image();
        const fullPath = "assets/textures/" + filename;
        img.onload = () => {
          this.hexTextures.set(type, img);
          checkAllLoaded();
        };
        img.onerror = () => {
          console.warn(`\xC9chec du chargement de la texture ${fullPath}`);
          checkAllLoaded();
        };
        img.src = fullPath;
      };
      tryLoad();
    }
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
   * @param civId - Optionnel: la civilisation pour laquelle dessiner les routes constructibles
   */
  render(gameMap, civId) {
    this.currentCivilizationId = civId || null;
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
    this.currentConfig = config;
    this.currentGameMap = gameMap;
    for (const hex of visibleHexes) {
      this.drawHex(hex, gameMap, config, civId);
    }
    if (this.showCoordinates) {
      for (const hex of visibleHexes) {
        this.drawCoordinates(hex, config);
      }
    }
    this.drawRoads(gameMap, config);
    if (civId) {
      this.drawBuildableRoads(gameMap, config, civId);
    }
    if (civId) {
      this.drawBuildableOutposts(gameMap, config, civId);
    }
    this.drawCities(gameMap, config);
    this.drawResourceParticles();
    this.scheduleCooldownAnimation(gameMap);
  }
  /**
   * Vérifie s'il y a des cooldowns actifs sur la carte et programme un nouveau rendu si nécessaire.
   * Cette méthode continue à programmer des frames jusqu'à ce qu'il n'y ait plus de cooldowns actifs.
   */
  scheduleCooldownAnimation(gameMap) {
    const grid = gameMap.getGrid();
    const allHexes = grid.getAllHexes();
    const visibleHexes = allHexes.filter((hex) => gameMap.isHexVisible(hex.coord));
    const hasActiveCooldown = visibleHexes.some((hex) => {
      const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hex.coord);
      return remainingCooldown > 0;
    });
    if (hasActiveCooldown) {
      if (this.cooldownAnimationFrameId === null) {
        const animate = () => {
          if (!this.currentGameMap) {
            this.cooldownAnimationFrameId = null;
            return;
          }
          const currentGrid = this.currentGameMap.getGrid();
          const currentAllHexes = currentGrid.getAllHexes();
          const currentVisibleHexes = currentAllHexes.filter((hex) => this.currentGameMap.isHexVisible(hex.coord));
          if (this.currentCivilizationId !== null) {
            if (this.renderCallback) {
              this.renderCallback();
            } else {
              this.render(this.currentGameMap, this.currentCivilizationId);
            }
          }
          const stillHasActiveCooldown = currentVisibleHexes.some((hex) => {
            const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hex.coord);
            return remainingCooldown > 0;
          });
          if (stillHasActiveCooldown) {
            this.cooldownAnimationFrameId = requestAnimationFrame(animate);
          } else {
            this.cooldownAnimationFrameId = null;
          }
        };
        this.cooldownAnimationFrameId = requestAnimationFrame(animate);
      }
    } else {
      if (this.cooldownAnimationFrameId !== null) {
        cancelAnimationFrame(this.cooldownAnimationFrameId);
        this.cooldownAnimationFrameId = null;
      }
    }
  }
  /**
   * Définit un callback à appeler pour re-rendre la carte.
   * Utilisé pour mettre à jour l'affichage lors du survol de la souris.
   */
  setRenderCallback(callback) {
    this.renderCallback = callback;
  }
  /**
   * Retourne le vertex (ville) actuellement sélectionné, ou null si aucune ville n'est sélectionnée.
   * @returns Le vertex sélectionné ou null
   */
  getSelectedVertex() {
    return this.selectedVertex;
  }
  /**
   * Retourne le sprite (image) d'une ville selon son niveau.
   * @param level - Le niveau de la ville
   * @returns L'image du sprite ou null si non chargé
   */
  getCitySprite(level) {
    return this.citySprites.get(level) || null;
  }
  /**
   * Vérifie si les sprites sont chargés.
   * @returns true si tous les sprites sont chargés
   */
  areCitySpritesLoaded() {
    return this.citySpritesLoaded;
  }
  /**
   * Déclenche un effet visuel pour indiquer qu'un hexagone a été récolté.
   * L'hexagone sera légèrement réduit pendant un court instant (uniquement pour les récoltes manuelles).
   * @param hexCoord - La coordonnée de l'hexagone récolté
   * @param isAutomatic - Si true, n'affiche pas l'effet de réduction de taille (seulement la particule)
   */
  triggerHarvestEffect(hexCoord, isAutomatic = false) {
    if (isAutomatic) {
      return;
    }
    const hexKey = hexCoord.hashCode();
    const now = Date.now();
    this.harvestedHexes.set(hexKey, now);
    if (this.renderCallback) {
      this.renderCallback();
    }
    setTimeout(() => {
      this.harvestedHexes.delete(hexKey);
      if (this.renderCallback) {
        this.renderCallback();
      }
    }, 100);
  }
  /**
   * Déclenche une animation de particule pour représenter une ressource qui vole de l'hex vers la ville.
   * @param hexCoord - La coordonnée de l'hexagone récolté
   * @param resourceType - Le type de ressource récoltée
   * @param cityVertex - Le vertex (ville) vers lequel la particule doit voler
   */
  triggerResourceHarvestAnimation(hexCoord, resourceType, cityVertex) {
    if (!this.currentConfig || !this.currentGameMap) {
      return;
    }
    const { hexSize, offsetX, offsetY } = this.currentConfig;
    const startX = offsetX + Math.sqrt(3) * (hexCoord.q + hexCoord.r / 2) * hexSize;
    const startY = offsetY + 3 / 2 * hexCoord.r * hexSize;
    const cityPosition = this.getVertexPosition(cityVertex, this.currentConfig);
    const endX = cityPosition.x;
    const endY = cityPosition.y;
    const particle = {
      x: startX,
      y: startY,
      startX,
      startY,
      endX,
      endY,
      resourceType,
      progress: 0,
      createdAt: Date.now()
    };
    this.resourceParticles.push(particle);
    if (this.animationFrameId === null) {
      this.animateParticles();
    }
  }
  /**
   * Anime les particules de ressources en utilisant requestAnimationFrame.
   */
  animateParticles() {
    const now = Date.now();
    const ANIMATION_DURATION_MS = 800;
    const EASING_FUNCTION = (t) => {
      return 1 - Math.pow(1 - t, 3);
    };
    const activeParticles = [];
    for (const particle of this.resourceParticles) {
      const elapsed = now - particle.createdAt;
      particle.progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      if (particle.progress < 1) {
        const easedProgress = EASING_FUNCTION(particle.progress);
        particle.x = particle.startX + (particle.endX - particle.startX) * easedProgress;
        particle.y = particle.startY + (particle.endY - particle.startY) * easedProgress;
        activeParticles.push(particle);
      }
    }
    this.resourceParticles = activeParticles;
    if (this.resourceParticles.length > 0) {
      if (this.renderCallback) {
        this.renderCallback();
      }
      this.animationFrameId = requestAnimationFrame(() => this.animateParticles());
    } else {
      this.animationFrameId = null;
    }
  }
  /**
   * Dessine les particules de ressources actives.
   */
  drawResourceParticles() {
    for (const particle of this.resourceParticles) {
      const color = _HexMapRenderer.RESOURCE_COLORS[particle.resourceType] || "#000000";
      const size = 8;
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.restore();
    }
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
  drawHex(hex, gameMap, config, civId) {
    const { hexSize, offsetX, offsetY } = config;
    const coord = hex.coord;
    const hexKey = coord.hashCode();
    const harvestTime = this.harvestedHexes.get(hexKey);
    const isHarvested = harvestTime !== void 0;
    const scale = isHarvested ? 0.85 : 1;
    const currentHexSize = hexSize * scale;
    const x = offsetX + Math.sqrt(3) * (coord.q + coord.r / 2) * hexSize;
    const y = offsetY + 3 / 2 * coord.r * hexSize;
    const hexType = gameMap.getHexType(coord) || "Desert" /* Desert */;
    const color = HEX_TYPE_COLORS[hexType] || "#CCCCCC";
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i + Math.PI / 6;
      const hx = x + currentHexSize * Math.cos(angle);
      const hy = y + currentHexSize * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }
    this.ctx.closePath();
    const texture = this.hexTextures.get(hexType);
    if (texture && this.hexTexturesLoaded && texture.complete && texture.naturalWidth > 0) {
      const patternSize = Math.max(currentHexSize * 1.2, 32);
      const pattern = this.ctx.createPattern(texture, "repeat");
      if (pattern) {
        this.ctx.save();
        this.ctx.fillStyle = pattern;
        this.ctx.fill();
        this.ctx.restore();
      } else {
        this.ctx.fillStyle = color;
        this.ctx.fill();
      }
    } else {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.drawCooldownTimer(coord, x, y, currentHexSize);
    if (civId && hexType !== "Water" /* Water */) {
      const isHarvestable = ResourceHarvest.canHarvest(coord, gameMap, civId);
      if (!isHarvestable) {
        this.drawLockIcon(x, y, currentHexSize);
      }
    }
    if (civId && BuildingProductionController.isHexAutoHarvested(coord, civId, gameMap)) {
      this.drawAutoIcon(x, y, currentHexSize);
    }
  }
  /**
   * Dessine une icône de cadenas au centre d'un hexagone pour indiquer qu'il n'est pas récoltable.
   * Utilise le sprite SVG chargé depuis les assets.
   */
  drawLockIcon(centerX, centerY, hexSize) {
    if (!this.lockSprite || !this.lockSpriteLoaded) {
      return;
    }
    const iconSize = hexSize * 0.5;
    this.ctx.save();
    const spriteWidth = iconSize * 1.875;
    const spriteHeight = iconSize;
    const x = centerX - spriteWidth / 2;
    const y = centerY - spriteHeight / 2;
    this.ctx.drawImage(this.lockSprite, x, y, spriteWidth, spriteHeight);
    this.ctx.restore();
  }
  /**
   * Dessine le texte "auto" au centre d'un hexagone pour indiquer qu'il est récolté automatiquement.
   */
  drawAutoIcon(centerX, centerY, hexSize) {
    this.ctx.save();
    const fontSize = hexSize * 0.25;
    const text = "auto";
    this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 3;
    this.ctx.lineJoin = "round";
    this.ctx.miterLimit = 2;
    this.ctx.strokeText(text, centerX, centerY);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText(text, centerX, centerY);
    this.ctx.restore();
  }
  /**
   * Dessine un timer circulaire pour indiquer le temps restant avant de pouvoir récolter à nouveau.
   */
  drawCooldownTimer(hexCoord, centerX, centerY, hexSize) {
    const remainingCooldown = ResourceHarvestController.getRemainingCooldown(hexCoord);
    if (remainingCooldown <= 0) {
      return;
    }
    const MIN_HARVEST_INTERVAL_MS = 1e3;
    const progress = remainingCooldown / MIN_HARVEST_INTERVAL_MS;
    const timerRadius = hexSize * 0.3;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, timerRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (1 - progress) * Math.PI * 2;
    this.ctx.arc(centerX, centerY, timerRadius, startAngle, endAngle);
    this.ctx.stroke();
    const remainingSeconds = Math.ceil(remainingCooldown / 1e3);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = `${Math.max(10, timerRadius * 0.5)}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(remainingSeconds.toString(), centerX, centerY);
    this.ctx.restore();
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
    const allVertices = grid.getAllVertices();
    for (const vertex of allVertices) {
      const vertexKey = vertex.hashCode();
      if (gameMap.hasCity(vertex)) {
        const city = gameMap.getCity(vertex);
        const isHovered = this.hoveredVertex !== null && this.hoveredVertex.equals(vertex);
        const isSelected = this.selectedVertex !== null && this.selectedVertex.equals(vertex);
        if (city) {
          this.drawCity(vertex, city, config, isHovered, isSelected);
        }
      }
    }
  }
  /**
   * Dessine une ville sur un sommet avec un sprite correspondant à son niveau.
   * @param vertex - Le sommet où se trouve la ville
   * @param city - La ville à dessiner
   * @param config - La configuration de rendu
   * @param isHovered - true si la ville est survolée par la souris
   * @param isSelected - true si la ville est sélectionnée
   */
  drawCity(vertex, city, config, isHovered = false, isSelected = false) {
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
    const baseSize = (8 + 4 /* Capital */ * 2) * 2;
    let scale = 1;
    if (isHovered || isSelected) {
      scale = 1.3;
    }
    const citySize = baseSize * scale;
    this.ctx.save();
    const sprite = this.citySprites.get(city.level);
    const isSpriteReady = sprite && this.citySpritesLoaded && sprite.complete && sprite.naturalWidth > 0;
    if (isSpriteReady) {
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      const auraRadius = baseSize / 2 + 3;
      const gradient = this.ctx.createRadialGradient(0, 0, baseSize / 2, 0, 0, auraRadius);
      gradient.addColorStop(0, "rgba(255, 255, 0, 0.0)");
      gradient.addColorStop(0.7, "rgba(255, 255, 200, 0.6)");
      gradient.addColorStop(1, "rgba(255, 255, 0, 0.3)");
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.drawImage(
        sprite,
        -baseSize / 2,
        -baseSize / 2,
        baseSize,
        baseSize
      );
      if (isSelected) {
        this.ctx.globalCompositeOperation = "multiply";
        this.ctx.fillStyle = "rgba(255, 165, 0, 0.4)";
        this.ctx.fillRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
        this.ctx.globalCompositeOperation = "source-over";
      } else if (isHovered) {
        this.ctx.globalCompositeOperation = "multiply";
        this.ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
        this.ctx.fillRect(-baseSize / 2, -baseSize / 2, baseSize, baseSize);
        this.ctx.globalCompositeOperation = "source-over";
      }
    } else {
      const fallbackSize = baseSize * scale;
      let baseColor = "#2C2C2C";
      if (isSelected) {
        baseColor = "#FFA500";
      } else if (isHovered) {
        baseColor = "#FFD700";
      }
      this.ctx.fillStyle = baseColor;
      this.ctx.fillRect(centerX - fallbackSize / 2, centerY - fallbackSize / 2, fallbackSize, fallbackSize);
    }
    this.ctx.restore();
    if (isSelected) {
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, citySize / 2 + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
  /**
   * Dessine les routes construites sur la carte.
   */
  drawRoads(gameMap, config) {
    const grid = gameMap.getGrid();
    const allEdges = grid.getAllEdges();
    const drawnEdges = /* @__PURE__ */ new Set();
    for (const edge of allEdges) {
      if (gameMap.hasRoad(edge)) {
        const edgeKey = edge.hashCode();
        if (!drawnEdges.has(edgeKey)) {
          drawnEdges.add(edgeKey);
          this.drawRoad(edge, config, false, gameMap);
        }
      }
    }
  }
  /**
   * Dessine les routes constructibles pour une civilisation.
   */
  drawBuildableRoads(gameMap, config, civId) {
    const buildableRoads = gameMap.getBuildableRoadsForCivilization(civId);
    for (const edge of buildableRoads) {
      const isHighlighted = this.hoveredEdge !== null && this.hoveredEdge.equals(edge);
      this.drawRoad(edge, config, true, gameMap, isHighlighted);
    }
  }
  /**
   * Dessine les avant-postes constructibles pour une civilisation.
   */
  drawBuildableOutposts(gameMap, config, civId) {
    const buildableVertices = gameMap.getBuildableOutpostVertices(civId);
    for (const vertex of buildableVertices) {
      const isHighlighted = this.hoveredOutpostVertex !== null && this.hoveredOutpostVertex.equals(vertex);
      this.drawBuildableOutpostVertex(vertex, config, isHighlighted);
    }
  }
  /**
   * Dessine un vertex constructible pour un avant-poste (rond en pointillé).
   * @param vertex - Le vertex à dessiner
   * @param config - La configuration de rendu
   * @param isHighlighted - true si le vertex est survolé
   */
  drawBuildableOutpostVertex(vertex, config, isHighlighted = false) {
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
    const baseRadius = 8;
    const radius = isHighlighted ? baseRadius * 1.3 : baseRadius;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.strokeStyle = isHighlighted ? "#00FF00" : "#90EE90";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }
  /**
   * Dessine une route (construite ou constructible) sur une arête.
   * @param edge - L'arête à dessiner
   * @param config - La configuration de rendu
   * @param isDashed - true pour un trait pointillé (route constructible), false pour un trait plein (route construite)
   * @param isHighlighted - true pour mettre en surbrillance (route survolée)
   */
  drawRoad(edge, config, isDashed, gameMap, isHighlighted = false) {
    const { hexSize, offsetX, offsetY } = config;
    const [hex1, hex2] = edge.getHexes();
    const vertices = gameMap.getVerticesForEdge(edge);
    if (vertices.length < 2) {
      this.drawRoadFromDirection(edge, config, isDashed, isHighlighted);
      return;
    }
    const vertex1 = vertices[0];
    const vertex2 = vertices[1];
    const pos1 = this.getVertexPosition(vertex1, config);
    const pos2 = this.getVertexPosition(vertex2, config);
    this.ctx.beginPath();
    this.ctx.moveTo(pos1.x, pos1.y);
    this.ctx.lineTo(pos2.x, pos2.y);
    if (isHighlighted) {
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.lineWidth = 6;
    } else {
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 4;
    }
    if (isDashed) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
  /**
   * Calcule la position d'un vertex en pixels.
   * Un vertex est le point où 3 hexagones se rencontrent (un coin d'hexagone).
   */
  getVertexPosition(vertex, config) {
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
    return {
      x: sumX / 3,
      y: sumY / 3
    };
  }
  /**
   * Dessine une route en utilisant la direction entre les deux hexagones (fallback).
   */
  drawRoadFromDirection(edge, config, isDashed, isHighlighted = false) {
    const { hexSize, offsetX, offsetY } = config;
    const [hex1, hex2] = edge.getHexes();
    const centerX1 = offsetX + Math.sqrt(3) * (hex1.q + hex1.r / 2) * hexSize;
    const centerY1 = offsetY + 3 / 2 * hex1.r * hexSize;
    const dq = hex2.q - hex1.q;
    const dr = hex2.r - hex1.r;
    let cornerIndex1;
    let cornerIndex2;
    if (dq === 0 && dr === -1) {
      cornerIndex1 = 0;
      cornerIndex2 = 1;
    } else if (dq === 1 && dr === -1) {
      cornerIndex1 = 1;
      cornerIndex2 = 2;
    } else if (dq === 1 && dr === 0) {
      cornerIndex1 = 2;
      cornerIndex2 = 3;
    } else if (dq === 0 && dr === 1) {
      cornerIndex1 = 3;
      cornerIndex2 = 4;
    } else if (dq === -1 && dr === 1) {
      cornerIndex1 = 4;
      cornerIndex2 = 5;
    } else if (dq === -1 && dr === 0) {
      cornerIndex1 = 5;
      cornerIndex2 = 0;
    } else {
      const centerX2 = offsetX + Math.sqrt(3) * (hex2.q + hex2.r / 2) * hexSize;
      const centerY2 = offsetY + 3 / 2 * hex2.r * hexSize;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX1, centerY1);
      this.ctx.lineTo(centerX2, centerY2);
      if (isHighlighted) {
        this.ctx.strokeStyle = "#FFA500";
        this.ctx.lineWidth = 6;
      } else {
        this.ctx.strokeStyle = "#000000";
        this.ctx.lineWidth = 4;
      }
      if (isDashed) {
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.setLineDash([]);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      return;
    }
    const angle1 = Math.PI / 3 * cornerIndex1 + Math.PI / 6;
    const angle2 = Math.PI / 3 * cornerIndex2 + Math.PI / 6;
    const cornerX1 = centerX1 + hexSize * Math.cos(angle1);
    const cornerY1 = centerY1 + hexSize * Math.sin(angle1);
    const cornerX2 = centerX1 + hexSize * Math.cos(angle2);
    const cornerY2 = centerY1 + hexSize * Math.sin(angle2);
    this.ctx.beginPath();
    this.ctx.moveTo(cornerX1, cornerY1);
    this.ctx.lineTo(cornerX2, cornerY2);
    if (isHighlighted) {
      this.ctx.strokeStyle = "#FFA500";
      this.ctx.lineWidth = 6;
    } else {
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 4;
    }
    if (isDashed) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
  /**
   * Redimensionne le canvas pour qu'il s'adapte à la fenêtre.
   */
  resize() {
    const header = document.querySelector("header");
    const footer = document.querySelector("footer");
    const main2 = document.querySelector("main");
    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;
    const mainStyle = main2 ? window.getComputedStyle(main2) : null;
    const mainPaddingX = mainStyle ? (parseFloat(mainStyle.paddingLeft) || 32) + (parseFloat(mainStyle.paddingRight) || 32) : 64;
    const mainPaddingY = mainStyle ? (parseFloat(mainStyle.paddingTop) || 32) + (parseFloat(mainStyle.paddingBottom) || 32) : 64;
    this.canvas.width = window.innerWidth - mainPaddingX;
    this.canvas.height = window.innerHeight - headerHeight - footerHeight - mainPaddingY;
  }
  /**
   * Convertit les coordonnées pixel (x, y) en coordonnées hexagonales (q, r).
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns Les coordonnées hexagonales correspondantes, ou null si hors carte
   */
  pixelToHexCoord(pixelX, pixelY) {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }
    const { hexSize, offsetX, offsetY } = this.currentConfig;
    const grid = this.currentGameMap.getGrid();
    const x = pixelX - offsetX;
    const y = pixelY - offsetY;
    const r = 2 / 3 * y / hexSize;
    const q = x / (Math.sqrt(3) * hexSize) - r / 2;
    const hexQ = Math.round(q);
    const hexR = Math.round(r);
    const candidates = [
      new HexCoord(hexQ, hexR),
      new HexCoord(hexQ + 1, hexR),
      new HexCoord(hexQ - 1, hexR),
      new HexCoord(hexQ, hexR + 1),
      new HexCoord(hexQ, hexR - 1),
      new HexCoord(hexQ + 1, hexR - 1),
      new HexCoord(hexQ - 1, hexR + 1)
    ];
    let closestHex = null;
    let minDistance = Infinity;
    const maxDistance = hexSize * 0.9;
    for (const candidate of candidates) {
      if (!grid.hasHex(candidate)) {
        continue;
      }
      const hexX = offsetX + Math.sqrt(3) * (candidate.q + candidate.r / 2) * hexSize;
      const hexY = offsetY + 3 / 2 * candidate.r * hexSize;
      const dx = pixelX - hexX;
      const dy = pixelY - hexY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestHex = candidate;
      }
    }
    return closestHex;
  }
  /**
   * Définit le callback à appeler lorsqu'un hexagone est cliqué.
   * @param callback - Fonction appelée avec les coordonnées hexagonales du clic
   */
  setOnHexClick(callback) {
    this.onHexClickCallback = callback;
    this.setupClickHandler();
  }
  /**
   * Convertit les coordonnées pixel (x, y) en Vertex (sommet avec ville) si le clic est proche d'un vertex avec une ville.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns Le vertex avec une ville le plus proche du point cliqué, ou null si aucun vertex n'est assez proche
   */
  pixelToVertex(pixelX, pixelY) {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }
    const gameMap = this.currentGameMap;
    const grid = gameMap.getGrid();
    const allVertices = grid.getAllVertices();
    let closestVertex = null;
    let minDistance = Infinity;
    const maxDistance = 12;
    for (const vertex of allVertices) {
      if (!gameMap.hasCity(vertex)) {
        continue;
      }
      const pos = this.getVertexPosition(vertex, this.currentConfig);
      const dx = pixelX - pos.x;
      const dy = pixelY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestVertex = vertex;
      }
    }
    return closestVertex;
  }
  /**
   * Convertit les coordonnées pixel (x, y) en Vertex (sommet) parmi tous les vertices.
   * Utilisé pour détecter les clics sur les vertices constructibles d'avant-postes.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @param maxDistance - Distance maximale en pixels pour considérer qu'on a cliqué sur un sommet (défaut: 32)
   * @returns Le sommet le plus proche du point cliqué, ou null si aucun sommet n'est assez proche
   */
  pixelToVertexAny(pixelX, pixelY, maxDistance = 32) {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }
    const gameMap = this.currentGameMap;
    const grid = gameMap.getGrid();
    const allVertices = grid.getAllVertices();
    let closestVertex = null;
    let minDistance = Infinity;
    for (const vertex of allVertices) {
      const vertexHexes = vertex.getHexes();
      const allVertexHexesExist = vertexHexes.every((h) => grid.hasHex(h));
      if (!allVertexHexesExist) {
        continue;
      }
      const pos = this.getVertexPosition(vertex, this.currentConfig);
      const dx = pixelX - pos.x;
      const dy = pixelY - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestVertex = vertex;
      }
    }
    return closestVertex;
  }
  /**
   * Convertit les coordonnées pixel (x, y) en Edge (arête) si le clic est proche d'une arête.
   * @param pixelX - Coordonnée X du pixel
   * @param pixelY - Coordonnée Y du pixel
   * @returns L'arête la plus proche du point cliqué, ou null si aucune arête n'est assez proche
   */
  pixelToEdge(pixelX, pixelY) {
    if (!this.currentConfig || !this.currentGameMap) {
      return null;
    }
    const gameMap = this.currentGameMap;
    const grid = gameMap.getGrid();
    const allEdges = grid.getAllEdges();
    let closestEdge = null;
    let minDistance = Infinity;
    const maxDistance = 8;
    for (const edge of allEdges) {
      const vertices = gameMap.getVerticesForEdge(edge);
      if (vertices.length < 2) {
        continue;
      }
      const pos1 = this.getVertexPosition(vertices[0], this.currentConfig);
      const pos2 = this.getVertexPosition(vertices[1], this.currentConfig);
      const distance = this.distanceToLineSegment(pixelX, pixelY, pos1.x, pos1.y, pos2.x, pos2.y);
      if (distance < maxDistance && distance < minDistance) {
        minDistance = distance;
        closestEdge = edge;
      }
    }
    return closestEdge;
  }
  /**
   * Calcule la distance d'un point à un segment de ligne.
   * @param px - Coordonnée X du point
   * @param py - Coordonnée Y du point
   * @param x1 - Coordonnée X du premier point du segment
   * @param y1 - Coordonnée Y du premier point du segment
   * @param x2 - Coordonnée X du deuxième point du segment
   * @param y2 - Coordonnée Y du deuxième point du segment
   * @returns La distance minimale du point au segment
   */
  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      const dx2 = px - x1;
      const dy2 = py - y1;
      return Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const dx3 = px - closestX;
    const dy3 = py - closestY;
    return Math.sqrt(dx3 * dx3 + dy3 * dy3);
  }
  /**
   * Définit le callback à appeler lorsqu'un vertex constructible pour un avant-poste est cliqué.
   * @param callback - Fonction appelée avec le vertex cliqué
   */
  setOnOutpostVertexClick(callback) {
    this.onOutpostVertexClickCallback = callback;
    this.setupClickHandler();
  }
  /**
   * Définit le callback à appeler lorsqu'une arête (route) est cliquée.
   * @param callback - Fonction appelée avec l'arête cliquée
   */
  setOnEdgeClick(callback) {
    this.onEdgeClickCallback = callback;
    this.setupClickHandler();
  }
  /**
   * Configure le gestionnaire de clic unique qui gère à la fois les clics sur les edges et les hexagones.
   * Priorité aux edges : si on clique sur un edge, on ne déclenche pas le clic sur l'hexagone.
   */
  setupClickHandler() {
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.addEventListener("click", this.handleClick);
  }
  /**
   * Configure le gestionnaire de mouvement de souris pour la surbrillance des routes constructibles.
   */
  setupMouseMoveHandler() {
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
  }
  /**
   * Configure le tooltip pour afficher les informations des routes constructibles.
   */
  setupTooltip() {
    if (!this.tooltipElement) {
      this.tooltipElement = document.createElement("div");
      this.tooltipElement.className = "road-tooltip";
      this.tooltipElement.style.cssText = `
        position: absolute;
        pointer-events: none;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: Arial, sans-serif;
        z-index: 1000;
        white-space: nowrap;
        display: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(this.tooltipElement);
    }
  }
  /**
   * Met à jour le tooltip avec les informations de coût d'une route constructible.
   */
  updateTooltip(edge, event) {
    if (!this.tooltipElement || !this.currentGameMap || !this.currentCivilizationId) {
      return;
    }
    this.tooltipOutpostVertex = null;
    const distance = this.currentGameMap.calculateBuildableRoadDistance(edge, this.currentCivilizationId);
    if (distance === void 0) {
      this.hideTooltip();
      return;
    }
    const cost = RoadConstruction.getCost(distance);
    const brickCost = cost.get("Brick" /* Brick */) || 0;
    const woodCost = cost.get("Wood" /* Wood */) || 0;
    this.tooltipElement.textContent = `${brickCost} Brique${brickCost > 1 ? "s" : ""}, ${woodCost} Bois (distance: ${distance})`;
    this.tooltipElement.style.left = `${event.clientX + 15}px`;
    this.tooltipElement.style.top = `${event.clientY + 15}px`;
    this.tooltipElement.style.display = "block";
    this.tooltipEdge = edge;
  }
  /**
   * Met à jour le tooltip avec les informations de coût d'un avant-poste constructible.
   */
  updateOutpostTooltip(vertex, event) {
    if (!this.tooltipElement || !this.currentGameMap || !this.currentCivilizationId) {
      return;
    }
    this.tooltipEdge = null;
    const cityCount = this.currentGameMap.getCityCount();
    const cost = OutpostController.getBuildableOutpostCost(cityCount);
    const woodCost = cost.get("Wood" /* Wood */) || 0;
    const brickCost = cost.get("Brick" /* Brick */) || 0;
    const wheatCost = cost.get("Wheat" /* Wheat */) || 0;
    const sheepCost = cost.get("Sheep" /* Sheep */) || 0;
    this.tooltipElement.textContent = `${woodCost} Bois, ${brickCost} Brique, ${wheatCost} Bl\xE9, ${sheepCost} Mouton (${cityCount} ville${cityCount > 1 ? "s" : ""})`;
    this.tooltipElement.style.left = `${event.clientX + 15}px`;
    this.tooltipElement.style.top = `${event.clientY + 15}px`;
    this.tooltipElement.style.display = "block";
    this.tooltipOutpostVertex = vertex;
  }
  /**
   * Masque le tooltip.
   */
  hideTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = "none";
      this.tooltipEdge = null;
      this.tooltipOutpostVertex = null;
    }
  }
};
/**
 * Couleurs des ressources pour les particules d'animation.
 */
_HexMapRenderer.RESOURCE_COLORS = {
  ["Wood" /* Wood */]: "#8B4513",
  ["Brick" /* Brick */]: "#CD5C5C",
  ["Wheat" /* Wheat */]: "#FFD700",
  ["Sheep" /* Sheep */]: "#90EE90",
  ["Ore" /* Ore */]: "#708090"
};
var HexMapRenderer = _HexMapRenderer;

// src/controller/BuildingController.ts
var BuildingController = class {
  /**
   * Vérifie si un bâtiment peut être construit dans une ville donnée.
   * Vérifie à la fois les conditions de la ville, les ressources disponibles
   * et la présence d'un hex adjacent du type requis (pour les bâtiments de ressources).
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville où construire
   * @param map - La carte de jeu (requis pour vérifier les hex adjacents)
   * @param vertex - Le sommet de la ville (requis pour vérifier les hex adjacents)
   * @param resources - Les ressources du joueur
   * @returns true si le bâtiment peut être construit
   */
  static canBuild(buildingType, city, map, vertex, resources) {
    if (!city.canBuildBuildingType(buildingType)) {
      return false;
    }
    const cost = getBuildingCost(buildingType);
    if (!resources.canAfford(cost)) {
      return false;
    }
    const requiredHexType = getRequiredHexType(buildingType);
    if (requiredHexType !== null) {
      if (!this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Vérifie si au moins un hexagone adjacent au vertex (formant la ville) a le type requis.
   * @param vertex - Le sommet de la ville
   * @param hexType - Le type d'hex requis
   * @param map - La carte de jeu
   * @returns true si au moins un hex adjacent a le type requis
   */
  static hasAdjacentHexOfType(vertex, hexType, map) {
    const hexes = vertex.getHexes();
    for (const hexCoord of hexes) {
      if (!map.getGrid().hasHex(hexCoord)) {
        continue;
      }
      const hexTypeInMap = map.getHexType(hexCoord);
      if (hexTypeInMap === hexType) {
        return true;
      }
    }
    return false;
  }
  /**
   * Construit un bâtiment dans une ville.
   * Vérifie les conditions de construction et consomme les ressources nécessaires.
   * 
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville où construire
   * @param map - La carte de jeu
   * @param vertex - Le sommet de la ville
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildBuilding(buildingType, city, map, vertex, resources) {
    if (!this.canBuild(buildingType, city, map, vertex, resources)) {
      let errorMessage = `Le b\xE2timent ${buildingType} ne peut pas \xEAtre construit dans cette ville. `;
      if (!city.canBuildBuildingType(buildingType)) {
        errorMessage += `La ville n'a peut-\xEAtre pas le niveau requis ou a d\xE9j\xE0 atteint sa limite de b\xE2timents.`;
      } else {
        const buildingCost2 = getBuildingCost(buildingType);
        if (!resources.canAfford(buildingCost2)) {
          errorMessage += `Co\xFBt requis: ${this.formatCost(buildingCost2)}.`;
        } else {
          const requiredHexType = getRequiredHexType(buildingType);
          if (requiredHexType !== null && !this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
            errorMessage += `La ville doit avoir un hex adjacent de type ${requiredHexType}.`;
          }
        }
      }
      throw new Error(errorMessage);
    }
    const buildingCost = getBuildingCost(buildingType);
    resources.payCost(buildingCost);
    city.addBuilding(buildingType);
  }
  /**
   * Retourne la liste des bâtiments constructibles avec leur statut (affordable ou non).
   * 
   * @param city - La ville
   * @param map - La carte de jeu (requis pour vérifier les hex adjacents)
   * @param vertex - Le sommet de la ville (requis pour vérifier les hex adjacents)
   * @param resources - Les ressources du joueur
   * @returns Un tableau des bâtiments constructibles avec leur statut
   */
  static getBuildableBuildingsWithStatus(city, map, vertex, resources) {
    const allBuildingTypes = BuildingType;
    const allTypes = Object.values(allBuildingTypes);
    const statusList = [];
    for (const buildingType of allTypes) {
      if (city.hasBuilding(buildingType)) {
        continue;
      }
      const cityCanBuildType = city.canBuildBuildingType(buildingType);
      const requiredHexType = getRequiredHexType(buildingType);
      if (requiredHexType !== null) {
        if (!this.hasAdjacentHexOfType(vertex, requiredHexType, map)) {
          continue;
        }
      }
      const levelIsSufficient = this.checkBuildingLevelRequirement(buildingType, city);
      if (!levelIsSufficient) {
        continue;
      }
      const cost = getBuildingCost(buildingType);
      const canBuild = this.canBuild(buildingType, city, map, vertex, resources);
      const cityCanBuildAny = city.canBuildBuilding();
      const hasResources = resources.canAfford(cost);
      const hasHex = requiredHexType === null || this.hasAdjacentHexOfType(vertex, requiredHexType, map);
      const blockedByBuildingLimit = hasHex && hasResources && !cityCanBuildAny && !canBuild;
      statusList.push({
        buildingType,
        canBuild,
        blockedByBuildingLimit,
        cost
      });
    }
    return statusList;
  }
  /**
   * Vérifie si le niveau de la ville est suffisant pour construire un bâtiment.
   * @param buildingType - Le type de bâtiment
   * @param city - La ville
   * @returns true si le niveau est suffisant
   */
  static checkBuildingLevelRequirement(buildingType, city) {
    switch (buildingType) {
      case "Seaport" /* Seaport */:
        return city.level >= 2 /* Town */;
      case "Market" /* Market */:
      case "TownHall" /* TownHall */:
        return city.level >= 0 /* Outpost */;
      case "Sawmill" /* Sawmill */:
      case "Brickworks" /* Brickworks */:
      case "Mill" /* Mill */:
      case "Sheepfold" /* Sheepfold */:
      case "Mine" /* Mine */:
        return city.level >= 1 /* Colony */;
      default:
        return false;
    }
  }
  /**
   * Formate un coût en chaîne de caractères pour l'affichage.
   * @param cost - Le coût à formater
   * @returns Une chaîne formatée (ex: "3 Bois, 2 Brique")
   */
  static formatCost(cost) {
    const resourceNames = {
      ["Wood" /* Wood */]: "Bois",
      ["Brick" /* Brick */]: "Brique",
      ["Wheat" /* Wheat */]: "Bl\xE9",
      ["Sheep" /* Sheep */]: "Mouton",
      ["Ore" /* Ore */]: "Minerai"
    };
    const parts = [];
    for (const [resource, amount] of cost.entries()) {
      parts.push(`${amount} ${resourceNames[resource]}`);
    }
    return parts.join(", ");
  }
};

// src/view/CityPanelView.ts
var CityPanelView = class {
  constructor(cityPanelId = "city-panel") {
    this.callbacks = {};
    this.renderer = null;
    // Cache de l'état précédent pour éviter les rendus inutiles
    this.lastSelectedVertexHash = null;
    this.lastResourcesHash = null;
    this.lastCityBuildings = null;
    this.lastCityLevel = null;
    const panel = document.getElementById(cityPanelId);
    const title = document.getElementById("city-panel-title");
    const buildingsList = document.getElementById("city-buildings-list");
    const buildingsTitle = document.querySelector("#city-buildings-section h3");
    if (!panel) {
      throw new Error(`\xC9l\xE9ment avec l'id "${cityPanelId}" introuvable`);
    }
    if (!title) {
      throw new Error(`\xC9l\xE9ment avec l'id "city-panel-title" introuvable`);
    }
    if (!buildingsList) {
      throw new Error(`\xC9l\xE9ment avec l'id "city-buildings-list" introuvable`);
    }
    if (!buildingsTitle) {
      throw new Error('Titre "B\xE2timents" introuvable');
    }
    this.cityPanel = panel;
    this.cityPanelTitle = title;
    this.cityBuildingsList = buildingsList;
    this.cityBuildingsTitle = buildingsTitle;
    this.setupEventListeners();
  }
  /**
   * Configure le renderer pour obtenir les sprites des villes.
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }
  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }
  /**
   * Traite un événement de construction de bâtiment.
   * @param buildingType - Le type de bâtiment à construire
   * @param city - La ville
   * @param gameMap - La carte de jeu
   * @param vertex - Le sommet de la ville
   */
  handleBuildBuilding(buildingType, city, gameMap, vertex) {
    if (this.callbacks.onBuildBuilding) {
      this.callbacks.onBuildBuilding(buildingType, city, gameMap, vertex);
    }
  }
  /**
   * Traite un événement d'action sur un bâtiment.
   * @param action - L'action à effectuer
   * @param buildingType - Le type de bâtiment
   * @param city - La ville
   */
  handleBuildingAction(action, buildingType, city) {
    if (this.callbacks.onBuildingAction) {
      this.callbacks.onBuildingAction(action, buildingType, city);
    }
  }
  /**
   * Configure les gestionnaires d'événements pour les boutons.
   */
  setupEventListeners() {
    this.cityBuildingsList.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("build-btn")) {
        const button = target;
        if (button.disabled) {
          return;
        }
        const buildingType = button.dataset.buildingType;
        if (!buildingType) {
          return;
        }
        const event = new CustomEvent("buildBuilding", {
          detail: { buildingType },
          bubbles: true
        });
        this.cityPanel.dispatchEvent(event);
      }
      if (target.classList.contains("building-action-btn")) {
        const button = target;
        if (button.disabled) {
          return;
        }
        const buildingAction = button.dataset.buildingAction;
        const buildingType = button.dataset.buildingType;
        if (!buildingAction || !buildingType) {
          return;
        }
        const event = new CustomEvent("buildingAction", {
          detail: { buildingAction, buildingType },
          bubbles: true
        });
        this.cityPanel.dispatchEvent(event);
      }
    });
  }
  /**
   * Retourne l'élément DOM du panneau pour permettre l'écoute d'événements personnalisés.
   */
  getPanelElement() {
    return this.cityPanel;
  }
  /**
   * Met à jour l'affichage du panneau de la ville sélectionnée.
   * Évite le rendu si la ville sélectionnée et les ressources n'ont pas changé.
   */
  update(selectedVertex, gameMap, city, playerResources) {
    if (!selectedVertex || !gameMap || !city) {
      if (this.lastSelectedVertexHash !== null) {
        this.cityPanel.classList.add("hidden");
        this.lastSelectedVertexHash = null;
        this.lastResourcesHash = null;
        this.lastCityBuildings = null;
        this.lastCityLevel = null;
      }
      return;
    }
    const currentVertexHash = selectedVertex.hashCode();
    const currentResourcesHash = this.getResourcesHash(playerResources);
    const currentCityBuildings = [...city.getBuildings()].sort();
    const currentCityLevel = city.level;
    const isFirstRender = this.lastSelectedVertexHash === null;
    const vertexChanged = this.lastSelectedVertexHash !== currentVertexHash;
    const resourcesChanged = this.lastResourcesHash !== currentResourcesHash;
    const buildingsChanged = !this.arraysEqual(this.lastCityBuildings, currentCityBuildings);
    const levelChanged = this.lastCityLevel !== currentCityLevel;
    const hasChanged = isFirstRender || vertexChanged || resourcesChanged || buildingsChanged || levelChanged;
    if (!hasChanged) {
      return;
    }
    this.lastSelectedVertexHash = currentVertexHash;
    this.lastResourcesHash = currentResourcesHash;
    this.lastCityBuildings = currentCityBuildings;
    this.lastCityLevel = currentCityLevel;
    this.cityPanel.classList.remove("hidden");
    const cityLevelNames = {
      [0 /* Outpost */]: "Avant-poste",
      [1 /* Colony */]: "Colonie",
      [2 /* Town */]: "Ville",
      [3 /* Metropolis */]: "M\xE9tropole",
      [4 /* Capital */]: "Capitale"
    };
    const levelName = cityLevelNames[city.level] || `Niveau ${city.level}`;
    this.cityPanelTitle.innerHTML = "";
    if (this.renderer) {
      const sprite = this.renderer.getCitySprite(city.level);
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        const spriteImg = document.createElement("img");
        spriteImg.src = sprite.src;
        spriteImg.style.width = "32px";
        spriteImg.style.height = "32px";
        spriteImg.style.marginRight = "8px";
        spriteImg.style.verticalAlign = "middle";
        spriteImg.style.display = "inline-block";
        spriteImg.alt = levelName;
        this.cityPanelTitle.appendChild(spriteImg);
      }
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = levelName;
    this.cityPanelTitle.appendChild(nameSpan);
    this.updateBuildingsList(city, gameMap, selectedVertex, playerResources);
  }
  /**
   * Met à jour la liste des bâtiments dans le panneau.
   * Affiche tous les bâtiments dans un ordre fixe, sans séparer les constructibles des construits.
   */
  updateBuildingsList(city, gameMap, vertex, playerResources) {
    const buildingCount = city.getBuildingCount();
    const maxBuildings = city.getMaxBuildings();
    this.cityBuildingsTitle.textContent = `B\xE2timents ${buildingCount}/${maxBuildings}`;
    this.cityBuildingsList.innerHTML = "";
    const resourceNames = {
      ["Wood" /* Wood */]: "Bois",
      ["Brick" /* Brick */]: "Brique",
      ["Wheat" /* Wheat */]: "Bl\xE9",
      ["Sheep" /* Sheep */]: "Mouton",
      ["Ore" /* Ore */]: "Minerai"
    };
    const allBuildingTypes = getAllBuildingTypes();
    const builtBuildings = new Set(city.getBuildings());
    const buildableBuildingsMap = /* @__PURE__ */ new Map();
    const buildableBuildings = BuildingController.getBuildableBuildingsWithStatus(city, gameMap, vertex, playerResources);
    for (const status of buildableBuildings) {
      buildableBuildingsMap.set(status.buildingType, { canBuild: status.canBuild, blockedByBuildingLimit: status.blockedByBuildingLimit, cost: status.cost });
    }
    for (const buildingType of allBuildingTypes) {
      const isBuilt = builtBuildings.has(buildingType);
      const buildableStatus = buildableBuildingsMap.get(buildingType);
      if (!isBuilt && !buildableStatus) {
        continue;
      }
      const item = document.createElement("li");
      item.className = isBuilt ? "built-building" : "buildable-building";
      const infoContainer = document.createElement("div");
      infoContainer.className = "building-info";
      const nameSpan = document.createElement("span");
      nameSpan.className = "building-name";
      nameSpan.textContent = getBuildingTypeName(buildingType);
      infoContainer.appendChild(nameSpan);
      if (!isBuilt && buildableStatus) {
        const costSpan = document.createElement("span");
        costSpan.className = "building-cost";
        const costParts = [];
        for (const [resource, amount] of buildableStatus.cost.entries()) {
          costParts.push(`${amount} ${resourceNames[resource]}`);
        }
        costSpan.textContent = costParts.join(", ");
        infoContainer.appendChild(costSpan);
      }
      item.appendChild(infoContainer);
      if (isBuilt) {
        const buildingAction = getBuildingAction(buildingType);
        if (buildingAction !== null) {
          const actionBtn = document.createElement("button");
          actionBtn.className = "building-action-btn";
          actionBtn.textContent = BUILDING_ACTION_NAMES[buildingAction];
          if (buildingAction === "Upgrade" /* Upgrade */) {
            actionBtn.disabled = !city.canUpgrade();
          } else {
            actionBtn.disabled = false;
          }
          actionBtn.dataset.buildingAction = buildingAction;
          actionBtn.dataset.buildingType = buildingType;
          item.appendChild(actionBtn);
        }
      } else {
        if (buildableStatus) {
          const buildBtn = document.createElement("button");
          buildBtn.className = "build-btn";
          buildBtn.textContent = "Construire";
          buildBtn.disabled = buildableStatus.blockedByBuildingLimit;
          buildBtn.dataset.buildingType = buildingType;
          item.appendChild(buildBtn);
        }
      }
      this.cityBuildingsList.appendChild(item);
    }
  }
  /**
   * Génère un hash des ressources pour la comparaison.
   */
  getResourcesHash(playerResources) {
    const resources = playerResources.getAllResources();
    const parts = [];
    for (const [resource, amount] of resources.entries()) {
      parts.push(`${resource}:${amount}`);
    }
    return parts.sort().join(",");
  }
  /**
   * Compare deux tableaux pour l'égalité.
   */
  arraysEqual(a, b) {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
};

// src/controller/TradeController.ts
var TradeController = class {
  /**
   * Vérifie si une civilisation a accès au commerce (port maritime ou marché).
   *
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns true si la civilisation a au moins un port maritime ou un marché
   */
  static canTrade(civId, map) {
    const cities = map.getCitiesByCivilization(civId);
    for (const city of cities) {
      if (city.hasBuilding("Seaport" /* Seaport */) || city.hasBuilding("Market" /* Market */)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Vérifie si un échange est possible.
   * Vérifie à la fois l'accès au commerce et les ressources disponibles.
   * 
   * @param fromResource - La ressource à échanger (4 unités)
   * @param toResource - La ressource à recevoir (1 unité)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @returns true si l'échange est possible
   */
  static canPerformTrade(fromResource, toResource, civId, map, resources) {
    if (!this.canTrade(civId, map)) {
      return false;
    }
    if (fromResource === toResource) {
      return false;
    }
    const tradeRate = this.getTradeRateForCivilization(civId, map);
    if (!resources.hasEnough(fromResource, tradeRate)) {
      return false;
    }
    return true;
  }
  /**
   * Effectue un échange : X ressources identiques contre 1 ressource de choix (X = 3 avec port, 4 avec marché).
   * 
   * @param fromResource - La ressource à échanger (4 unités)
   * @param toResource - La ressource à recevoir (1 unité)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si l'échange n'est pas possible
   */
  static performTrade(fromResource, toResource, civId, map, resources) {
    if (!this.canPerformTrade(fromResource, toResource, civId, map, resources)) {
      if (!this.canTrade(civId, map)) {
        throw new Error(
          "Le commerce n'est pas disponible. Vous devez poss\xE9der au moins un port maritime ou un march\xE9 dans une de vos villes."
        );
      }
      if (fromResource === toResource) {
        throw new Error("Vous ne pouvez pas \xE9changer une ressource contre elle-m\xEAme.");
      }
      const tradeRate2 = this.getTradeRateForCivilization(civId, map);
      if (!resources.hasEnough(fromResource, tradeRate2)) {
        throw new Error(
          `Pas assez de ${fromResource} pour effectuer l'\xE9change. Requis: ${tradeRate2}, disponible: ${resources.getResource(fromResource)}.`
        );
      }
    }
    const tradeRate = this.getTradeRateForCivilization(civId, map);
    resources.removeResource(fromResource, tradeRate);
    resources.addResource(toResource, this.TRADE_RECEIVED);
  }
  /**
   * Retourne le taux d'échange par défaut (4:1, marché).
   */
  static getTradeRate() {
    return this.TRADE_RATE_MARKET;
  }
  /**
   * Retourne le nombre de ressources reçues lors d'un échange.
   */
  static getTradeReceived() {
    return this.TRADE_RECEIVED;
  }
  /**
   * Retourne le taux d'échange pour une civilisation : 3 si elle a un port (Seaport), 4 si marché (Market) uniquement.
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @returns Le nombre de ressources à donner pour recevoir 1 (3 ou 4)
   */
  static getTradeRateForCivilization(civId, map) {
    const cities = map.getCitiesByCivilization(civId);
    for (const city of cities) {
      if (city.hasBuilding("Seaport" /* Seaport */)) return this.TRADE_RATE_SEAPORT;
    }
    for (const city of cities) {
      if (city.hasBuilding("Market" /* Market */)) return this.TRADE_RATE_MARKET;
    }
    return this.TRADE_RATE_MARKET;
  }
  /**
   * Effectue plusieurs échanges en une seule transaction.
   * Valide que les quantités offertes sont des multiples du taux (3 ou 4 selon port/marché)
   * et que les quantités demandées sont des multiples de 1.
   * 
   * @param offeredResources - Map des ressources offertes (quantités multiples de 4)
   * @param requestedResources - Map des ressources demandées (quantités multiples de 1)
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param playerResources - Les ressources du joueur
   * @throws Error si les quantités ne sont pas valides ou si l'échange n'est pas possible
   */
  static performBatchTrade(offeredResources, requestedResources, civId, map, playerResources) {
    if (!this.canTrade(civId, map)) {
      throw new Error(
        "Le commerce n'est pas disponible. Vous devez poss\xE9der au moins un port maritime ou un march\xE9 dans une de vos villes."
      );
    }
    const tradeRate = this.getTradeRateForCivilization(civId, map);
    for (const [resourceType, quantity] of offeredResources.entries()) {
      if (quantity > 0 && quantity % tradeRate !== 0) {
        throw new Error(
          `La quantit\xE9 offerte de ${resourceType} doit \xEAtre un multiple de ${tradeRate}. Quantit\xE9 actuelle: ${quantity}`
        );
      }
    }
    for (const [resourceType, quantity] of requestedResources.entries()) {
      if (quantity > 0 && quantity % this.TRADE_RECEIVED !== 0) {
        throw new Error(
          `La quantit\xE9 demand\xE9e de ${resourceType} doit \xEAtre un multiple de ${this.TRADE_RECEIVED}. Quantit\xE9 actuelle: ${quantity}`
        );
      }
    }
    for (const [resourceType, quantity] of offeredResources.entries()) {
      if (quantity > 0) {
        if (!playerResources.hasEnough(resourceType, quantity)) {
          throw new Error(
            `Pas assez de ${resourceType} pour effectuer l'\xE9change. Requis: ${quantity}, disponible: ${playerResources.getResource(resourceType)}.`
          );
        }
      }
    }
    const hasOffered = Array.from(offeredResources.values()).some((qty) => qty > 0);
    const hasRequested = Array.from(requestedResources.values()).some((qty) => qty > 0);
    if (!hasOffered || !hasRequested) {
      throw new Error("Vous devez proposer au moins une ressource et en demander au moins une autre.");
    }
    const remainingOffered = new Map(offeredResources);
    const remainingRequested = new Map(requestedResources);
    const tradesToPerform = [];
    for (const [toResource, requestedQty] of remainingRequested.entries()) {
      if (requestedQty === 0) continue;
      let remainingToReceive = requestedQty;
      for (const [fromResource, offeredQty] of remainingOffered.entries()) {
        if (remainingToReceive === 0) break;
        if (offeredQty === 0) continue;
        if (fromResource === toResource) continue;
        const availableOffers = offeredQty / tradeRate;
        const neededExchanges = remainingToReceive / this.TRADE_RECEIVED;
        const exchangesToDo = Math.min(availableOffers, neededExchanges);
        if (exchangesToDo > 0) {
          tradesToPerform.push({
            from: fromResource,
            to: toResource,
            count: exchangesToDo
          });
          remainingToReceive -= exchangesToDo * this.TRADE_RECEIVED;
          const remainingOfferedQty = offeredQty - exchangesToDo * tradeRate;
          remainingOffered.set(fromResource, remainingOfferedQty);
        }
      }
      if (remainingToReceive > 0) {
        throw new Error(
          `Impossible de satisfaire la demande de ${toResource}. Manque ${remainingToReceive} unit\xE9(s). Pas assez de ressources offertes pour compl\xE9ter l'\xE9change.`
        );
      }
    }
    for (const trade of tradesToPerform) {
      for (let i = 0; i < trade.count; i++) {
        this.performTrade(trade.from, trade.to, civId, map, playerResources);
      }
    }
  }
};
TradeController.TRADE_RATE_SEAPORT = 3;
TradeController.TRADE_RATE_MARKET = 4;
/**
 * Nombre de ressources reçues lors d'un échange.
 */
TradeController.TRADE_RECEIVED = 1;

// src/view/TradePanelView.ts
var TradePanelView = class {
  constructor(tradePanelId = "trade-panel") {
    this.offeredResources = /* @__PURE__ */ new Map();
    this.requestedResources = /* @__PURE__ */ new Map();
    this.playerResources = null;
    this.resourceSprites = null;
    this.callbacks = {};
    this.gameMap = null;
    this.civId = null;
    // Noms des ressources en français
    this.resourceNames = {
      ["Wood" /* Wood */]: "Bois",
      ["Brick" /* Brick */]: "Brique",
      ["Wheat" /* Wheat */]: "Bl\xE9",
      ["Sheep" /* Sheep */]: "Mouton",
      ["Ore" /* Ore */]: "Minerai"
    };
    // Ordre d'affichage des ressources
    this.resourceOrder = [
      "Wood" /* Wood */,
      "Brick" /* Brick */,
      "Wheat" /* Wheat */,
      "Sheep" /* Sheep */,
      "Ore" /* Ore */
    ];
    const panel = document.getElementById(tradePanelId);
    const offeredListEl = document.getElementById("trade-offered-list");
    const requestedListEl = document.getElementById("trade-requested-list");
    const cancelBtnEl = document.getElementById("trade-cancel-btn");
    const confirmBtnEl = document.getElementById("trade-confirm-btn");
    const offeredTitleEl = document.querySelector(".trade-column:first-child h3");
    const requestedTitleEl = document.querySelector(".trade-column:last-child h3");
    if (!panel) {
      throw new Error(`\xC9l\xE9ment avec l'id "${tradePanelId}" introuvable`);
    }
    if (!offeredListEl) {
      throw new Error(`\xC9l\xE9ment avec l'id "trade-offered-list" introuvable`);
    }
    if (!requestedListEl) {
      throw new Error(`\xC9l\xE9ment avec l'id "trade-requested-list" introuvable`);
    }
    if (!cancelBtnEl) {
      throw new Error(`\xC9l\xE9ment avec l'id "trade-cancel-btn" introuvable`);
    }
    if (!confirmBtnEl) {
      throw new Error(`\xC9l\xE9ment avec l'id "trade-confirm-btn" introuvable`);
    }
    if (!offeredTitleEl) {
      throw new Error('Titre "Vous donnez" introuvable');
    }
    if (!requestedTitleEl) {
      throw new Error('Titre "Vous recevez" introuvable');
    }
    this.tradePanel = panel;
    this.offeredList = offeredListEl;
    this.requestedList = requestedListEl;
    this.cancelBtn = cancelBtnEl;
    this.confirmBtn = confirmBtnEl;
    this.offeredTitle = offeredTitleEl;
    this.requestedTitle = requestedTitleEl;
    this.setupEventListeners();
  }
  /**
   * Configure le gestionnaire de sprites de ressources.
   */
  setResourceSprites(resourceSprites) {
    this.resourceSprites = resourceSprites;
  }
  /**
   * Définit les callbacks pour les actions du panneau.
   */
  setCallbacks(callbacks) {
    this.callbacks = callbacks;
  }
  /**
   * Configure les gestionnaires d'événements.
   */
  setupEventListeners() {
    this.cancelBtn.addEventListener("click", () => {
      this.hide();
      if (this.callbacks.onCancel) {
        this.callbacks.onCancel();
      }
    });
    this.confirmBtn.addEventListener("click", () => {
      if (this.callbacks.onTrade) {
        this.callbacks.onTrade(
          new Map(this.offeredResources),
          new Map(this.requestedResources)
        );
      }
    });
  }
  /**
   * Configure la carte de jeu et la civilisation pour vérifier l'accès au commerce.
   */
  setGameContext(gameMap, civId) {
    this.gameMap = gameMap;
    this.civId = civId;
  }
  /**
   * Affiche le panneau de commerce et initialise les listes.
   */
  show(playerResources) {
    this.playerResources = playerResources;
    this.offeredResources.clear();
    this.requestedResources.clear();
    for (const resourceType of this.resourceOrder) {
      this.offeredResources.set(resourceType, 0);
      this.requestedResources.set(resourceType, 0);
    }
    this.update();
    this.tradePanel.classList.remove("hidden");
  }
  /**
   * Cache le panneau de commerce.
   */
  hide() {
    this.tradePanel.classList.add("hidden");
    this.offeredResources.clear();
    this.requestedResources.clear();
  }
  /**
   * Met à jour l'affichage des listes et du bouton Échanger.
   */
  update() {
    if (!this.playerResources) {
      return;
    }
    this.updateResourceList(this.offeredList, this.offeredResources, true);
    this.updateResourceList(this.requestedList, this.requestedResources, false);
    this.updateTitles();
    this.updateConfirmButton();
  }
  /**
   * Met à jour une liste de ressources.
   */
  updateResourceList(listElement, resourceMap, isOffered) {
    listElement.innerHTML = "";
    const rate = this.civId && this.gameMap ? TradeController.getTradeRateForCivilization(this.civId, this.gameMap) : 4;
    for (const resourceType of this.resourceOrder) {
      const quantity = resourceMap.get(resourceType) || 0;
      const available = this.playerResources?.getResource(resourceType) || 0;
      const item = document.createElement("li");
      item.className = "trade-resource-item";
      if (isOffered && available < rate) {
        item.classList.add("disabled");
      }
      const resourceInfo = document.createElement("div");
      resourceInfo.className = "trade-resource-info";
      if (this.resourceSprites) {
        const sprite = this.resourceSprites.getSprite(resourceType);
        const spriteReady = this.resourceSprites.isSpriteReady(resourceType);
        if (spriteReady && sprite) {
          const spriteImg = document.createElement("img");
          spriteImg.src = sprite.src;
          spriteImg.className = "trade-resource-sprite";
          spriteImg.alt = this.resourceNames[resourceType];
          spriteImg.style.width = "32px";
          spriteImg.style.height = "32px";
          spriteImg.style.objectFit = "contain";
          resourceInfo.appendChild(spriteImg);
        } else {
          const color = document.createElement("div");
          color.className = "trade-resource-color";
          const resourceColors = {
            ["Wood" /* Wood */]: "#8B4513",
            ["Brick" /* Brick */]: "#CD5C5C",
            ["Wheat" /* Wheat */]: "#FFD700",
            ["Sheep" /* Sheep */]: "#90EE90",
            ["Ore" /* Ore */]: "#708090"
          };
          color.style.backgroundColor = resourceColors[resourceType];
          resourceInfo.appendChild(color);
        }
      }
      const nameSpan = document.createElement("span");
      nameSpan.className = "trade-resource-name";
      nameSpan.textContent = this.resourceNames[resourceType];
      resourceInfo.appendChild(nameSpan);
      item.appendChild(resourceInfo);
      const quantitySpan = document.createElement("span");
      quantitySpan.className = "trade-resource-quantity";
      quantitySpan.textContent = quantity > 0 ? `\xD7${quantity}` : "";
      item.appendChild(quantitySpan);
      if (!item.classList.contains("disabled")) {
        if (isOffered) {
          item.addEventListener("click", () => {
            this.handleOfferedClick(resourceType);
          });
          item.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.handleOfferedRightClick(resourceType);
          });
        } else {
          item.addEventListener("click", () => {
            this.handleRequestedClick(resourceType);
          });
          item.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            this.handleRequestedRightClick(resourceType);
          });
        }
      }
      listElement.appendChild(item);
    }
  }
  /**
   * Gère le clic sur une ressource dans la liste des ressources offertes.
   */
  handleOfferedClick(resourceType) {
    if (!this.playerResources) {
      return;
    }
    const rate = this.civId && this.gameMap ? TradeController.getTradeRateForCivilization(this.civId, this.gameMap) : 4;
    const current = this.offeredResources.get(resourceType) || 0;
    const available = this.playerResources.getResource(resourceType);
    const newQuantity = current + rate;
    if (newQuantity <= available) {
      this.offeredResources.set(resourceType, newQuantity);
      this.update();
    }
  }
  /**
   * Gère le clic sur une ressource dans la liste des ressources demandées.
   */
  handleRequestedClick(resourceType) {
    const current = this.requestedResources.get(resourceType) || 0;
    this.requestedResources.set(resourceType, current + 1);
    this.update();
  }
  /**
   * Gère le clic droit sur une ressource dans la liste des ressources offertes (retire un batch).
   */
  handleOfferedRightClick(resourceType) {
    const current = this.offeredResources.get(resourceType) || 0;
    if (current > 0) {
      const rate = this.civId && this.gameMap ? TradeController.getTradeRateForCivilization(this.civId, this.gameMap) : 4;
      const newQuantity = Math.max(0, current - rate);
      this.offeredResources.set(resourceType, newQuantity);
      this.update();
    }
  }
  /**
   * Gère le clic droit sur une ressource dans la liste des ressources demandées (retire une unité).
   */
  handleRequestedRightClick(resourceType) {
    const current = this.requestedResources.get(resourceType) || 0;
    if (current > 0) {
      this.requestedResources.set(resourceType, current - 1);
      this.update();
    }
  }
  /**
   * Calcule le nombre total de batches offerts.
   */
  getOfferedBatches() {
    const rate = this.civId && this.gameMap ? TradeController.getTradeRateForCivilization(this.civId, this.gameMap) : 4;
    let totalBatches = 0;
    for (const [, quantity] of this.offeredResources.entries()) {
      if (quantity > 0) {
        totalBatches += quantity / rate;
      }
    }
    return totalBatches;
  }
  /**
   * Calcule le nombre total de batches demandés (1 ressource = 1 batch).
   */
  getRequestedBatches() {
    let totalBatches = 0;
    for (const quantity of this.requestedResources.values()) {
      totalBatches += quantity;
    }
    return totalBatches;
  }
  /**
   * Met à jour les titres avec le nombre de batches.
   */
  updateTitles() {
    const offeredBatches = this.getOfferedBatches();
    const requestedBatches = this.getRequestedBatches();
    this.offeredTitle.textContent = offeredBatches > 0 ? `Vous donnez (${offeredBatches})` : "Vous donnez";
    this.requestedTitle.textContent = requestedBatches > 0 ? `Vous recevez (${requestedBatches})` : "Vous recevez";
  }
  /**
   * Met à jour l'état du bouton Échanger.
   */
  updateConfirmButton() {
    const offeredBatches = this.getOfferedBatches();
    const requestedBatches = this.getRequestedBatches();
    const batchesMatch = offeredBatches > 0 && requestedBatches > 0 && offeredBatches === requestedBatches;
    let canTrade = true;
    if (this.gameMap && this.civId) {
      canTrade = TradeController.canTrade(this.civId, this.gameMap);
    }
    let hasEnoughResources = true;
    if (this.playerResources) {
      for (const [resourceType, quantity] of this.offeredResources.entries()) {
        if (quantity > 0 && !this.playerResources.hasEnough(resourceType, quantity)) {
          hasEnoughResources = false;
          break;
        }
      }
    }
    this.confirmBtn.disabled = !batchesMatch || !canTrade || !hasEnoughResources;
  }
};

// src/view/ResourceSprites.ts
var ResourceSprites = class {
  constructor() {
    this.resourceSprites = /* @__PURE__ */ new Map();
    this.loadedCount = 0;
    this.totalSprites = 5;
    // Nombre de types de ressources
    this.onAllLoadedCallback = null;
  }
  /**
   * Charge tous les sprites de ressources.
   */
  load() {
    const spriteFiles = {
      ["Wood" /* Wood */]: "resource-wood.svg",
      ["Brick" /* Brick */]: "resource-brick.svg",
      ["Wheat" /* Wheat */]: "resource-wheat.svg",
      ["Sheep" /* Sheep */]: "resource-sheep.svg",
      ["Ore" /* Ore */]: "resource-ore.svg"
    };
    const checkAllLoaded = () => {
      this.loadedCount++;
      if (this.loadedCount === this.totalSprites) {
        if (this.onAllLoadedCallback) {
          this.onAllLoadedCallback();
        }
      }
    };
    for (const [resourceType, filename] of Object.entries(spriteFiles)) {
      const type = resourceType;
      const img = new Image();
      const fullPath = `assets/sprites/${filename}`;
      img.onload = () => {
        this.resourceSprites.set(type, img);
        checkAllLoaded();
      };
      img.onerror = () => {
        console.warn(`\xC9chec du chargement du sprite de ressource ${fullPath}`);
        checkAllLoaded();
      };
      img.src = fullPath;
    }
  }
  /**
   * Retourne le sprite d'une ressource, ou null s'il n'est pas encore chargé.
   */
  getSprite(resourceType) {
    return this.resourceSprites.get(resourceType) || null;
  }
  /**
   * Vérifie si un sprite est chargé et prêt à être utilisé.
   */
  isSpriteReady(resourceType) {
    const sprite = this.resourceSprites.get(resourceType);
    return sprite !== void 0 && sprite.complete && sprite.naturalWidth > 0;
  }
  /**
   * Définit un callback appelé lorsque tous les sprites sont chargés.
   */
  onAllLoaded(callback) {
    this.onAllLoadedCallback = callback;
  }
};

// src/controller/RoadController.ts
var RoadController = class {
  /**
   * Construit une route sur un edge pour une civilisation donnée.
   * Vérifie les conditions de construction et consomme les ressources nécessaires.
   * 
   * @param edge - L'arête où construire la route
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @throws Error si la construction n'est pas possible ou si les ressources sont insuffisantes
   */
  static buildRoad(edge, civId, map, resources) {
    if (!RoadConstruction.canBuildRoad(edge, civId, map)) {
      throw new Error(
        `La route ne peut pas \xEAtre construite sur l'ar\xEAte ${edge.toString()}. L'ar\xEAte doit toucher une ville ou une autre route de la m\xEAme civilisation.`
      );
    }
    const distance = map.calculateBuildableRoadDistance(edge, civId);
    if (distance === void 0) {
      throw new Error(
        `Impossible de calculer la distance pour la route sur l'ar\xEAte ${edge.toString()}.`
      );
    }
    if (!RoadConstruction.canAfford(resources, distance)) {
      const cost2 = RoadConstruction.getCost(distance);
      const brickCost = cost2.get("Brick" /* Brick */) || 0;
      const woodCost = cost2.get("Wood" /* Wood */) || 0;
      throw new Error(
        `Pas assez de ressources pour construire une route. Requis: ${brickCost} ${"Brick" /* Brick */} et ${woodCost} ${"Wood" /* Wood */} (distance: ${distance}).`
      );
    }
    const cost = RoadConstruction.getCost(distance);
    resources.payCost(cost);
    map.addRoad(edge, civId);
  }
};

// src/config/version.ts
var APP_VERSION = "0.0.1 alpha";
var APP_NAME = "Colons of Idlestan";

// src/main.ts
function main() {
  document.title = `${APP_NAME} v${APP_VERSION}`;
  const headerTitle = document.querySelector(".app-title");
  if (headerTitle) {
    headerTitle.textContent = `${APP_NAME} v${APP_VERSION}`;
  }
  const canvas = document.getElementById("map-canvas");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsMenu = document.getElementById("settings-menu");
  const regenerateBtn = document.getElementById("regenerate-btn");
  const cheatBtn = document.getElementById("cheat-btn");
  const resourcesList = document.getElementById("resources-list");
  const cityPanelView = new CityPanelView("city-panel");
  const tradePanelView = new TradePanelView("trade-panel");
  if (!canvas) {
    throw new Error("Canvas introuvable");
  }
  if (!settingsBtn) {
    throw new Error("Bouton de param\xE8tres introuvable");
  }
  if (!settingsMenu) {
    throw new Error("Menu de param\xE8tres introuvable");
  }
  if (!regenerateBtn) {
    throw new Error("Bouton de r\xE9g\xE9n\xE9ration introuvable");
  }
  if (!cheatBtn) {
    throw new Error("Bouton cheat introuvable");
  }
  if (!resourcesList) {
    throw new Error("Panneau de ressources introuvable");
  }
  const game = new MainGame();
  const renderer = new HexMapRenderer(canvas);
  cityPanelView.setRenderer(renderer);
  const resourceSprites = new ResourceSprites();
  resourceSprites.onAllLoaded(() => {
    updateResourcesDisplay();
  });
  resourceSprites.load();
  tradePanelView.setResourceSprites(resourceSprites);
  renderer.resize();
  window.addEventListener("resize", () => {
    renderer.resize();
    const gameMap2 = game.getGameMap();
    if (gameMap2) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(gameMap2, civId);
    }
  });
  function updateResourcesDisplay() {
    if (!resourcesList) return;
    const playerResources = game.getPlayerResources();
    const resourceNames = {
      ["Wood" /* Wood */]: "Bois",
      ["Brick" /* Brick */]: "Brique",
      ["Wheat" /* Wheat */]: "Bl\xE9",
      ["Sheep" /* Sheep */]: "Mouton",
      ["Ore" /* Ore */]: "Minerai"
    };
    const resourceOrder = [
      "Wood" /* Wood */,
      "Brick" /* Brick */,
      "Wheat" /* Wheat */,
      "Sheep" /* Sheep */,
      "Ore" /* Ore */
    ];
    resourcesList.innerHTML = "";
    for (const resourceType of resourceOrder) {
      const count = playerResources.getResource(resourceType);
      const item = document.createElement("div");
      item.className = "resource-item";
      const sprite = resourceSprites.getSprite(resourceType);
      const spriteReady = resourceSprites.isSpriteReady(resourceType);
      if (spriteReady && sprite) {
        const spriteImg = document.createElement("img");
        spriteImg.src = sprite.src;
        spriteImg.className = "resource-sprite";
        spriteImg.alt = resourceNames[resourceType];
        spriteImg.style.width = "24px";
        spriteImg.style.height = "24px";
        spriteImg.style.objectFit = "contain";
        item.appendChild(spriteImg);
      } else {
        const color = document.createElement("div");
        color.className = "resource-color";
        const resourceColors = {
          ["Wood" /* Wood */]: "#8B4513",
          ["Brick" /* Brick */]: "#CD5C5C",
          ["Wheat" /* Wheat */]: "#FFD700",
          ["Sheep" /* Sheep */]: "#90EE90",
          ["Ore" /* Ore */]: "#708090"
        };
        color.style.backgroundColor = resourceColors[resourceType];
        item.appendChild(color);
      }
      const name = document.createElement("span");
      name.className = "resource-name";
      name.textContent = resourceNames[resourceType];
      const countEl = document.createElement("span");
      countEl.className = "resource-count";
      countEl.textContent = count.toString();
      item.appendChild(name);
      item.appendChild(countEl);
      resourcesList.appendChild(item);
    }
  }
  game.newGame();
  const gameMap = game.getGameMap();
  if (gameMap) {
    const civId = game.getPlayerCivilizationId();
    renderer.render(gameMap, civId);
  }
  function updateCityPanel() {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    const city = selectedVertex && currentGameMap && currentGameMap.hasCity(selectedVertex) ? currentGameMap.getCity(selectedVertex) || null : null;
    const playerResources = game.getPlayerResources();
    cityPanelView.update(selectedVertex, currentGameMap, city, playerResources);
  }
  cityPanelView.setCallbacks({
    onBuildBuilding: (buildingType, city, gameMap2, vertex) => {
      const playerResources = game.getPlayerResources();
      const gameClock = game.getGameClock();
      try {
        BuildingController.buildBuilding(buildingType, city, gameMap2, vertex, playerResources);
        const resourceBuildings = getResourceProductionBuildings();
        if (resourceBuildings.includes(buildingType)) {
          const currentTime = gameClock.getCurrentTime();
          city.setBuildingProductionTime(buildingType, currentTime);
        }
        updateResourcesDisplay();
        updateCityPanel();
        const civId = game.getPlayerCivilizationId();
        renderer.render(gameMap2, civId);
      } catch (error) {
        console.error("Erreur lors de la construction du b\xE2timent:", error);
      }
    },
    onBuildingAction: (action, buildingType, city) => {
      try {
        if (action === "Upgrade" /* Upgrade */) {
          if (!city.canUpgrade()) {
            return;
          }
          city.upgrade();
        } else if (action === "Trade" /* Trade */) {
          const currentGameMap2 = game.getGameMap();
          if (currentGameMap2) {
            const civId = game.getPlayerCivilizationId();
            tradePanelView.setGameContext(currentGameMap2, civId);
          }
          const playerResources = game.getPlayerResources();
          tradePanelView.show(playerResources);
          return;
        }
        updateCityPanel();
        const currentGameMap = game.getGameMap();
        if (currentGameMap) {
          const civId = game.getPlayerCivilizationId();
          renderer.render(currentGameMap, civId);
        }
      } catch (error) {
        console.error(`Erreur lors de l'action ${action}:`, error);
      }
    }
  });
  tradePanelView.setCallbacks({
    onTrade: (offered, requested) => {
      const currentGameMap = game.getGameMap();
      if (!currentGameMap) {
        return;
      }
      const civId = game.getPlayerCivilizationId();
      const playerResources = game.getPlayerResources();
      try {
        TradeController.performBatchTrade(offered, requested, civId, currentGameMap, playerResources);
        updateResourcesDisplay();
        tradePanelView.hide();
      } catch (error) {
        console.error("Erreur lors de l'\xE9change:", error);
      }
    },
    onCancel: () => {
      tradePanelView.hide();
    }
  });
  const panelElement = cityPanelView.getPanelElement();
  panelElement.addEventListener("buildBuilding", ((e) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentGameMap.getCity(selectedVertex);
    if (!city) {
      return;
    }
    cityPanelView.handleBuildBuilding(e.detail.buildingType, city, currentGameMap, selectedVertex);
  }));
  panelElement.addEventListener("buildingAction", ((e) => {
    const selectedVertex = renderer.getSelectedVertex();
    const currentGameMap = game.getGameMap();
    if (!selectedVertex || !currentGameMap || !currentGameMap.hasCity(selectedVertex)) {
      return;
    }
    const city = currentGameMap.getCity(selectedVertex);
    if (!city) {
      return;
    }
    cityPanelView.handleBuildingAction(e.detail.buildingAction, e.detail.buildingType, city);
  }));
  renderer.setRenderCallback(() => {
    const currentGameMap = game.getGameMap();
    if (currentGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(currentGameMap, civId);
      updateCityPanel();
    }
  });
  updateResourcesDisplay();
  renderer.setOnOutpostVertexClick((vertex) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    try {
      OutpostController.buildOutpost(vertex, civId, currentGameMap, playerResources);
      updateResourcesDisplay();
      renderer.render(currentGameMap, civId);
      updateCityPanel();
    } catch (error) {
    }
  });
  renderer.setOnEdgeClick((edge) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    try {
      RoadController.buildRoad(edge, civId, currentGameMap, playerResources);
      updateResourcesDisplay();
      renderer.render(currentGameMap, civId);
    } catch (error) {
    }
  });
  renderer.setOnHexClick((hexCoord) => {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    const result = ResourceHarvestController.harvest(hexCoord, civId, currentGameMap, playerResources);
    if (result.success && result.cityVertex) {
      renderer.triggerHarvestEffect(hexCoord, false);
      const hexType = currentGameMap.getHexType(hexCoord);
      if (hexType) {
        const resourceType = ResourceHarvest.hexTypeToResourceType(hexType);
        if (resourceType) {
          renderer.triggerResourceHarvestAnimation(hexCoord, resourceType, result.cityVertex);
        }
      }
      updateResourcesDisplay();
    }
  });
  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
      settingsMenu.classList.add("hidden");
    }
  });
  regenerateBtn.addEventListener("click", () => {
    game.newGame();
    gameStartTime = null;
    const newGameMap = game.getGameMap();
    if (newGameMap) {
      const civId = game.getPlayerCivilizationId();
      renderer.render(newGameMap, civId);
      updateResourcesDisplay();
      updateCityPanel();
    }
    settingsMenu.classList.add("hidden");
  });
  cheatBtn.addEventListener("click", () => {
    const playerResources = game.getPlayerResources();
    playerResources.addResource("Wood" /* Wood */, 100);
    playerResources.addResource("Brick" /* Brick */, 100);
    playerResources.addResource("Wheat" /* Wheat */, 100);
    playerResources.addResource("Sheep" /* Sheep */, 100);
    playerResources.addResource("Ore" /* Ore */, 100);
    updateResourcesDisplay();
    settingsMenu.classList.add("hidden");
  });
  updateCityPanel();
  function processAutomaticBuildingProduction() {
    const currentGameMap = game.getGameMap();
    if (!currentGameMap) {
      return;
    }
    const civId = game.getPlayerCivilizationId();
    const playerResources = game.getPlayerResources();
    const gameClock = game.getGameClock();
    const productionResults = BuildingProductionController.processAutomaticProduction(
      civId,
      currentGameMap,
      playerResources,
      gameClock
    );
    if (productionResults.length > 0) {
      for (const result of productionResults) {
        renderer.triggerHarvestEffect(result.hexCoord, true);
        renderer.triggerResourceHarvestAnimation(
          result.hexCoord,
          result.resourceType,
          result.cityVertex
        );
      }
      updateResourcesDisplay();
    }
  }
  let lastAnimationFrame = null;
  let gameStartTime = null;
  function gameLoop(timestamp) {
    if (gameStartTime === null) {
      gameStartTime = timestamp;
    }
    const timeSeconds = (timestamp - gameStartTime) / 1e3;
    game.updateGameTime(timeSeconds);
    processAutomaticBuildingProduction();
    lastAnimationFrame = requestAnimationFrame(gameLoop);
  }
  lastAnimationFrame = requestAnimationFrame(gameLoop);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
//# sourceMappingURL=main.js.map
