# Colons of Idlestan - AI Coding Agent Instructions

## Project Overview

**Colons of Idlestan** is a TypeScript-based strategy game with procedural hexagonal map generation, built with vanilla TypeScript + Canvas, compiled with esbuild.

Key tech stack: **TypeScript 5**, **Vitest** (testing), **esbuild** (bundling), Node.js ES modules, French-language codebase.

## Architecture Pattern: Model-Controller-View (MCV)

The codebase strictly separates concerns into three layers:

### Model (`src/model/`)
- **Pure data structures** with no side effects
- **Serializable**: Each model has `serialize()`/`deserialize()` methods (e.g., [src/model/hex/HexCoord.ts](src/model/hex/HexCoord.ts), [src/model/map/IslandMap.ts](src/model/map/IslandMap.ts))
- **Immutable-friendly**: Most properties use `readonly` and getter methods
- Domain entities: `HexCoord`, `Hex`, `HexGrid`, `IslandMap`, `City`, `Building`, `PlayerResources`, `IslandState`, `GameClock`, `ResourceType`, `HexType`
- No references to Controllers or Views

### Controller (`src/controller/`)
- **Implements game logic and state mutations**
- Entry: [src/controller/MainGameController.ts](src/controller/MainGameController.ts) - exposes IslandState and update methods
- Specialized controllers:
  - [ResourceHarvestController.ts](src/controller/ResourceHarvestController.ts) - harvest logic
  - [BuildingController.ts](src/controller/BuildingController.ts) - city building
  - [TradeController.ts](src/controller/TradeController.ts) - trade mechanics
  - [MapGenerator.ts](src/controller/MapGenerator.ts) - procedural map generation with seeded RNG
  - [AutomationController.ts](src/controller/AutomationController.ts) - AI automation
- Controllers accept Model objects, perform calculations, and return mutations (don't directly mutate)

### View (`src/view/`)
- **Canvas rendering and UI state**
- [HexMapRenderer.ts](src/view/HexMapRenderer.ts) - main 2D hex rendering engine, handles input events
- Panel views: `CityPanelView`, `TradePanelView`, `PortSpecializationPanelView`, `InventoryView`, `AutomationPanelView`
- No business logic; Views read from Model and call Controllers on user interaction

### Application (`src/application/`)
- [MainGame.ts](src/application/MainGame.ts) - orchestrator: NewGame, SaveGame, LoadGame
- Bridges Application, Controller, and Model layers

## Critical Data Flow Pattern

```
Model (immutable) → Controller (reads + calculates) → View (reads + renders)
                        ↓
                   Mutation returned
                        ↓
                   Model updated (external)
```

**Important**: Controllers calculate mutations but don't mutate the model directly. The caller (e.g., `main.ts` event handlers) applies mutations. This enables save/load functionality.

## Hexagonal Grid System

Uses **axial coordinates (q, r)** for hex grids (see [HexCoord.ts](src/model/hex/HexCoord.ts)):
- `q`: column (horizontal)
- `r`: row (diagonal)  
- `s`: derived value (`-q - r`) for cubic compatibility
- Directions: [MainHexDirection.ts](src/model/hex/MainHexDirection.ts) (W, E, NE, SE, NW, SW) and [SecondaryHexDirection.ts](src/model/hex/SecondaryHexDirection.ts) (N, NE, SE, S, SW, NW)
- Every hex has 6 **edges** (roads) and 6 **vertices** (city sites) referenced consistently

Example: `hex.coord.neighborMain(MainHexDirection.E)` → neighbor to the East.

## Game State & Serialization Pattern

[IslandState.ts](src/model/game/IslandState.ts) is the root of all game data:
- Holds `IslandMap`, `PlayerResources`, `GameClock`, civilizations, and `seed`
- All child objects implement `serialize()` → JSON and `static deserialize(data)` → Object
- Tests use `IslandStateGenerator` (in tests/utils/) to create test scenarios with seeded maps

**When modifying models**: Always add/update both `serialize()` and `deserialize()` methods to maintain save/load compatibility.

## Development Workflow

### Build & Serve
```bash
npm run build          # Compile TypeScript → dist/, copy assets
npm run serve         # HTTP server on http://localhost:3000
npm start            # Build + serve combined
npm run dev          # Watch mode (rebuild on file change)
```

### Testing
```bash
npm test            # Watch mode (Vitest)
npm run test:run   # Single run (CI mode)
```

Test files mirror source structure: `src/model/Foo.ts` → `tests/model/Foo.test.ts`

Test utilities in [tests/utils/](tests/utils/):
- `IslandStateGenerator.ts` - creates test scenarios with seeded maps
- `GameAutoPlayer.ts` - simulates player actions for integration tests
- `GameProgressionTest.ts` - chains tests of game progression

### Configuration
- [tsconfig.json](tsconfig.json) - module: "ES2020", target ES2020
- [vitest.config.ts](vitest.config.ts) - globals enabled, environment: node
- [esbuild](build.js) outputs to dist/, copies assets/, generates `.nojekyll` for GitHub Pages

## Common Patterns & Conventions

### Enum Keys & Records
Resources use `Record<ResourceType, number>` Maps instead of objects (see [PlayerResources.ts](src/model/game/PlayerResources.ts)):
```typescript
private resources: Map<ResourceType, number> = new Map();
getResource(type: ResourceType): number { ... }
```
Reason: Type-safe iteration over enum values.

### City Levels & Buildings
- [CityLevel.ts](src/model/city/CityLevel.ts): Outpost → Village → Town → Capital (0-4)
- [BuildingType.ts](src/model/city/BuildingType.ts): 13 building types with costs, requirements, and constraints
- Cities hold `Map<BuildingType, Building>` (one per type max)
- TownHall presence determines city level; other buildings are production/utility

### French Language in Code
- Comments, variable names, and test descriptions are in French
- Enum names (BuildingType values) are English for consistency
- UI labels defined in `BUILDING_TYPE_NAMES` record (e.g., `'Scierie'` for Sawmill)

## Integration Points

### Adding New Features

1. **New game mechanic**: Add Model classes (immutable), then Controller logic, then View
2. **New resource type**: Add to [ResourceType.ts](src/model/map/ResourceType.ts), update [PlayerResources.ts](src/model/game/PlayerResources.ts), [ResourceSprites.ts](src/view/ResourceSprites.ts) for rendering
3. **New building**: Add to [BuildingType.ts](src/model/city/BuildingType.ts), costs to `BUILDING_COSTS`, UI label to `BUILDING_TYPE_NAMES`
4. **Save/Load compatibility**: Always update `serialize()`/`deserialize()` in affected Model classes

### Testing New Code
- Write tests in `tests/` mirroring source structure
- Use `beforeEach` to initialize fresh IslandState via `MainGame().newGame(seed)`
- Access game state through `game.getController().getIslandState()` and specialized getters
- For integration tests, use `GameAutoPlayer` or `IslandStateGenerator` utilities

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| [src/main.ts](src/main.ts) | Entry point; wires up UI and event listeners |
| [src/application/MainGame.ts](src/application/MainGame.ts) | Game lifecycle orchestrator |
| [src/controller/MainGameController.ts](src/controller/MainGameController.ts) | Main state accessor |
| [src/model/game/IslandState.ts](src/model/game/IslandState.ts) | Root game data |
| [src/model/hex/HexCoord.ts](src/model/hex/HexCoord.ts) | Axial hex coordinates |
| [src/model/map/IslandMap.ts](src/model/map/IslandMap.ts) | Hex grid + cities + roads |
| [src/view/HexMapRenderer.ts](src/view/HexMapRenderer.ts) | Canvas rendering engine |
| [src/controller/MapGenerator.ts](src/controller/MapGenerator.ts) | Procedural generation with seeded RNG |
| [tests/utils/IslandStateGenerator.ts](tests/utils/IslandStateGenerator.ts) | Test scenario factory |

## Debugging Tips

- **Map issues**: Check hex coordinate system (axial vs cubic), use `HexGrid.getAllHexes()` to iterate
- **Serialization bugs**: Ensure both `serialize()` and `deserialize()` are updated in pairs
- **Game state mutations**: Verify Controllers don't mutate models directly; mutations should be applied by caller
- **View rendering**: Debug in [HexMapRenderer.ts](src/view/HexMapRenderer.ts) `render()` method; use browser DevTools canvas inspection

## Notes for Iterating on This Guide

This guide documents **discoverable patterns**, not aspirations. If you find undocumented patterns or discover updates needed, prioritize:
1. MCV layer violations (e.g., Controllers calling View methods)
2. Missing serialize/deserialize methods on new Models
3. Broken test structure or missing test utilities
4. Deviations from the French-language convention in comments
