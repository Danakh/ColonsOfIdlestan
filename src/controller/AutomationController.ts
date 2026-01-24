import { GameMap } from '../model/map/GameMap';
import { CivilizationId } from '../model/map/CivilizationId';
import { Civilization } from '../model/map/Civilization';
import { PlayerResources } from '../model/game/PlayerResources';
import { City } from '../model/city/City';
import { BuildingType } from '../model/city/BuildingType';
import { Edge } from '../model/hex/Edge';
import { Vertex } from '../model/hex/Vertex';
import { SecondaryHexDirection } from '../model/hex/SecondaryHexDirection';
import { RoadController } from './RoadController';
import { OutpostController } from './OutpostController';
import { BuildingController } from './BuildingController';
import { getResourceProductionBuildings } from '../model/city/BuildingType';

/**
 * Contrôleur pour gérer les automatisations de construction débloquées par la Guilde des batisseurs.
 * 
 * Les automatisations permettent de construire automatiquement :
 * - Routes (niveau 1)
 * - Outposts et améliorations de villes (niveau 2)
 * - Bâtiments de production (niveau 3)
 */
export class AutomationController {
  /**
   * Traite toutes les automatisations pour toutes les villes d'une civilisation.
   * Vérifie chaque ville avec une Guilde des batisseurs et exécute les automatisations activées.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param civilization - L'objet civilisation contenant les flags d'automatisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   */
  static processAllAutomations(
    civId: CivilizationId,
    civilization: Civilization,
    map: GameMap,
    resources: PlayerResources
  ): void {
    // Obtenir toutes les villes de la civilisation
    const cities = map.getCitiesByCivilization(civId);
    
    // Pour chaque ville, vérifier si elle a une Guilde des batisseurs
    for (const city of cities) {
      const buildersGuild = city.getBuilding(BuildingType.BuildersGuild);
      if (!buildersGuild) {
        continue;
      }

      const cityVertex = city.vertex;
      const level = buildersGuild.level;

      // Niveau 1 : Construction automatique de routes
      if (level >= 1 && civilization.isAutoRoadConstructionEnabled()) {
        this.processAutomaticRoadConstruction(civId, map, resources, cityVertex);
      }

      // Niveau 2 : Construction automatique d'outposts et amélioration automatique de villes
      if (level >= 2) {
        if (civilization.isAutoOutpostConstructionEnabled()) {
          this.processAutomaticOutpostConstruction(civId, map, resources);
        }
        if (civilization.isAutoCityUpgradeEnabled()) {
          this.processAutomaticCityUpgrade(civId, map, resources, city);
        }
      }

      // Niveau 3 : Construction automatique de bâtiments de production
      if (level >= 3 && civilization.isAutoProductionBuildingConstructionEnabled()) {
        this.processAutomaticProductionBuildingConstruction(civId, map, resources, city, cityVertex);
      }
    }
  }

  /**
   * Traite la construction automatique de routes.
   * Trouve les routes constructibles à partir de toutes les routes existantes et les construit automatiquement.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param cityVertex - Paramètre non utilisé (garder pour compatibilité)
   */
  private static processAutomaticRoadConstruction(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    cityVertex: Vertex
  ): void {
    // Obtenir toutes les routes de la civilisation
    const roads = map.getRoadsForCivilization(civId);
    
    if (roads.length === 0) {
      // Pas de routes, construire depuis la ville
      const edges = map.getEdgesForVertex(cityVertex);
      for (const edge of edges) {
        if (map.hasRoad(edge)) {
          continue;
        }

        try {
          const distance = map.calculateBuildableRoadDistance(edge, civId);
          if (distance === undefined) {
            continue;
          }

          RoadController.buildRoad(edge, civId, map, resources);
          return;
        } catch (error) {
          continue;
        }
      }
      return;
    }

    // Ensemble des arêtes déjà vérifiées pour éviter les doublons
    const checkedEdges = new Set<string>();
    
    // Pour chaque route existante, chercher les routes adjacentes constructibles
    for (const road of roads) {
      // Une arête partage 2 vertices. Créer les vertices en utilisant les hexagones de l'arête
      const [hex1, hex2] = road.getHexes();
      
      // Créer tous les vertices des deux hexagones
      const vertices: Vertex[] = [];
      const directions = [
        SecondaryHexDirection.N,
        SecondaryHexDirection.EN,
        SecondaryHexDirection.ES,
        SecondaryHexDirection.S,
        SecondaryHexDirection.WS,
        SecondaryHexDirection.WN
      ];
      
      for (const dir of directions) {
        const v1 = hex1.vertex(dir);
        vertices.push(v1);
        
        const v2 = hex2.vertex(dir);
        vertices.push(v2);
      }
      
      // Éliminer les doublons
      const uniqueVertices: Vertex[] = [];
      const vertexSet = new Set<string>();
      for (const v of vertices) {
        const key = v.hashCode();
        if (!vertexSet.has(key)) {
          vertexSet.add(key);
          uniqueVertices.push(v);
        }
      }
      
      // Pour chaque vertex de la route, chercher les arêtes adjacentes
      for (const vertex of uniqueVertices) {
        const adjacentEdges = map.getEdgesForVertex(vertex);
        
        for (const edge of adjacentEdges) {
          const edgeKey = edge.hashCode();
          if (checkedEdges.has(edgeKey)) {
            continue; // Déjà vérifié
          }
          checkedEdges.add(edgeKey);
          
          // Vérifier si la route peut être construite
          if (map.hasRoad(edge)) {
            continue; // Route déjà construite
          }

          try {
            // Vérifier si on peut construire et si on a les ressources
            const distance = map.calculateBuildableRoadDistance(edge, civId);
            if (distance === undefined) {
              continue; // Route non constructible
            }

            // Construire la route (le contrôleur vérifie les ressources)
            RoadController.buildRoad(edge, civId, map, resources);
            
            // Construire une seule route par cycle pour éviter de tout construire d'un coup
            return;
          } catch (error) {
            // Ignorer les erreurs (ressources insuffisantes, etc.)
            continue;
          }
        }
      }
    }
  }

  /**
   * Traite la construction automatique d'outposts.
   * Trouve les vertices constructibles pour outposts et les construit automatiquement.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   */
  private static processAutomaticOutpostConstruction(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources
  ): void {
    // Obtenir toutes les routes de la civilisation
    const roads = map.getRoadsForCivilization(civId);
    
    // Pour chaque route, vérifier les vertices adjacents via getEdgesForVertex
    const checkedVertices = new Set<string>();
    
    // Obtenir tous les vertices de la grille
    const allVertices = map.getGrid().getAllVertices();
    
    // Pour chaque vertex, vérifier s'il touche une route de la civilisation
    for (const vertex of allVertices) {
      const vertexKey = vertex.hashCode();
      if (checkedVertices.has(vertexKey)) {
        continue; // Déjà vérifié
      }
      
      // Vérifier si le vertex touche une route de la civilisation
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
        continue; // Ne touche pas une route de la civilisation
      }
      
      checkedVertices.add(vertexKey);

      // Vérifier si un outpost peut être construit
      if (map.hasCity(vertex)) {
        continue; // Ville déjà présente
      }

      try {
        // Vérifier si on peut construire et si on a les ressources
        if (!OutpostController.canBuildOutpost(vertex, civId, map)) {
          continue;
        }

        // Construire l'outpost (le contrôleur vérifie les ressources)
        OutpostController.buildOutpost(vertex, civId, map, resources);
        
        // Construire un seul outpost par cycle pour éviter de tout construire d'un coup
        return;
      } catch (error) {
        // Ignorer les erreurs (ressources insuffisantes, etc.)
        continue;
      }
    }
  }

  /**
   * Traite l'amélioration automatique de villes.
   * Trouve les villes améliorables et les améliore automatiquement.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param city - La ville à améliorer
   */
  private static processAutomaticCityUpgrade(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    city: City
  ): void {
    // Vérifier si la ville peut être améliorée (via TownHall)
    const townHall = city.getBuilding(BuildingType.TownHall);
    if (!townHall) {
      return; // Pas de TownHall, pas d'amélioration possible
    }

    try {
      // Vérifier si on peut améliorer et si on a les ressources
      if (!BuildingController.canUpgrade(BuildingType.TownHall, city, map, resources)) {
        return;
      }

      // Améliorer la ville (le contrôleur vérifie les ressources)
      BuildingController.upgradeBuilding(BuildingType.TownHall, city, map, resources);
    } catch (error) {
      // Ignorer les erreurs (ressources insuffisantes, etc.)
    }
  }

  /**
   * Traite la construction automatique de bâtiments de production.
   * Trouve les villes où on peut construire des bâtiments de production et les construit automatiquement.
   * Améliore aussi les bâtiments existants au niveau supérieur.
   * 
   * @param civId - L'identifiant de la civilisation
   * @param map - La carte de jeu
   * @param resources - Les ressources du joueur
   * @param city - La ville où construire
   * @param cityVertex - Le sommet de la ville
   */
  private static processAutomaticProductionBuildingConstruction(
    civId: CivilizationId,
    map: GameMap,
    resources: PlayerResources,
    city: City,
    cityVertex: Vertex
  ): void {
    // Obtenir tous les types de bâtiments de production
    const productionBuildings = getResourceProductionBuildings();
    
    // Première passe: Essayer d'améliorer les bâtiments de production existants
    for (const buildingType of productionBuildings) {
      if (!city.hasBuilding(buildingType)) {
        continue;
      }

      try {
        // Vérifier si on peut améliorer et si on a les ressources
        if (!BuildingController.canUpgrade(buildingType, city, map, resources)) {
          continue;
        }

        // Améliorer le bâtiment (le contrôleur vérifie les ressources)
        BuildingController.upgradeBuilding(buildingType, city, map, resources);
        
        // Améliorer un seul bâtiment par cycle pour éviter de tout améliorer d'un coup
        return;
      } catch (error) {
        // Ignorer les erreurs (ressources insuffisantes, etc.)
        continue;
      }
    }
    
    // Deuxième passe: Essayer de construire les bâtiments de production manquants
    for (const buildingType of productionBuildings) {
      // Vérifier si le bâtiment est déjà construit
      if (city.hasBuilding(buildingType)) {
        continue;
      }

      try {
        // Vérifier si on peut construire et si on a les ressources
        if (!BuildingController.canBuild(buildingType, city, map, cityVertex, resources)) {
          continue;
        }

        // Construire le bâtiment (le contrôleur vérifie les ressources)
        BuildingController.buildBuilding(buildingType, city, map, cityVertex, resources);
        
        // Construire un seul bâtiment par cycle pour éviter de tout construire d'un coup
        return;
      } catch (error) {
        // Ignorer les erreurs (ressources insuffisantes, etc.)
        continue;
      }
    }
  }
}
