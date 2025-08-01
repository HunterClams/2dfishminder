// Fish Spawning System - Modular depth-aware spawning
// Handles spawning creatures in their preferred depth zones on launch

class FishSpawningSystem {
    constructor() {
        this.WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        this.WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // Depth zone definitions
        this.DEPTH_ZONES = {
            SURFACE: { min: 0, max: 0.2, name: 'surface' },      // 0-20% depth
            SHALLOW: { min: 0, max: 0.4, name: 'shallow' },      // 0-40% depth  
            MID: { min: 0.2, max: 0.6, name: 'mid' },            // 20-60% depth
            DEEP: { min: 0, max: 0.8, name: 'deep' },            // 0-80% depth
            ABYSSAL: { min: 0.8, max: 1.0, name: 'abyssal' }     // 80-100% depth
        };
        
        // Creature depth preferences and spawn configurations
        this.CREATURE_CONFIGS = {
            // Small fry - surface and mid waters
            [window.FISH_TYPES.SMALL_FRY_2]: {
                preferredZone: 'SURFACE',
                spawnZone: 'surface',
                count: 80,
                preferredDepth: 0.2
            },
            [window.FISH_TYPES.SMALL_FRY_3]: {
                preferredZone: 'MID', 
                spawnZone: 'mid',
                count: 75,
                preferredDepth: 0.4
            },
            [window.FISH_TYPES.SMALL_FRY_4]: {
                preferredZone: 'SURFACE',
                spawnZone: 'surface', 
                count: 75,
                preferredDepth: 0.2
            },
            
            // Krill - deep waters with migration
            [window.FISH_TYPES.KRILL]: {
                preferredZone: 'DEEP',
                spawnZone: 'deep',
                count: 250,
                preferredDepth: 0.75
            },
            [window.FISH_TYPES.PALE_KRILL]: {
                preferredZone: 'DEEP',
                spawnZone: 'deep',
                count: 20,
                preferredDepth: 0.75
            },
            [window.FISH_TYPES.MOM_KRILL]: {
                preferredZone: 'DEEP',
                spawnZone: 'deep',
                count: 20,
                preferredDepth: 0.75
            },
            
            // Predators - mid to deep waters
            'tuna': {
                preferredZone: 'MID',
                spawnZone: 'mid',
                count: 15,
                preferredDepth: 0.4
            },

            
            // Giant squid - abyssal waters
            'giantSquid': {
                preferredZone: 'ABYSSAL',
                spawnZone: 'abyssal',
                count: 3,
                preferredDepth: 0.85
            },
            
            // Fish eggs - surface waters
            'fishEgg': {
                preferredZone: 'SURFACE',
                spawnZone: 'surface',
                count: 10,
                preferredDepth: 0.1
            },
            
            // Bubbles - surface waters
            'bubble': {
                preferredZone: 'SURFACE',
                spawnZone: 'surface',
                count: 100,
                preferredDepth: 0.1
            }
        };
    }
    
    /**
     * Get spawn position within a depth zone
     * @param {string} zoneName - The depth zone name
     * @returns {Object} {x, y} spawn position
     */
    getSpawnPosition(zoneName) {
        const zone = this.DEPTH_ZONES[zoneName];
        if (!zone) {
            // Fallback to random position
            return {
                x: Math.random() * this.WORLD_WIDTH,
                y: Math.random() * this.WORLD_HEIGHT
            };
        }
        
        const x = Math.random() * this.WORLD_WIDTH;
        const minY = this.WORLD_HEIGHT * zone.min;
        const maxY = this.WORLD_HEIGHT * zone.max;
        const y = minY + Math.random() * (maxY - minY);
        
        return { x, y };
    }
    
    /**
     * Get spawn position within preferred depth range with some variance
     * @param {number} preferredDepth - Preferred depth (0-1)
     * @param {number} variance - Depth variance (0-1)
     * @returns {Object} {x, y} spawn position
     */
    getSpawnPositionWithVariance(preferredDepth, variance = 0.1) {
        const x = Math.random() * this.WORLD_WIDTH;
        const minY = this.WORLD_HEIGHT * Math.max(0, preferredDepth - variance);
        const maxY = this.WORLD_HEIGHT * Math.min(1, preferredDepth + variance);
        const y = minY + Math.random() * (maxY - minY);
        
        return { x, y };
    }
    
    /**
     * Spawn creatures of a specific type in their preferred depth zone
     * @param {string} creatureType - The creature type to spawn
     * @param {Object} gameEntities - The game entities object
     * @returns {Array} Array of spawned entities
     */
    spawnCreaturesInPreferredZone(creatureType, gameEntities) {
        const config = this.CREATURE_CONFIGS[creatureType];
        if (!config) {
            console.warn(`No spawn config found for creature type: ${creatureType}`);
            return [];
        }
        
        const spawnedEntities = [];
        
        for (let i = 0; i < config.count; i++) {
            const position = this.getSpawnPositionWithVariance(config.preferredDepth, 0.15);
            
            let entity;
            switch (creatureType) {
                case window.FISH_TYPES.SMALL_FRY_2:
                case window.FISH_TYPES.SMALL_FRY_3:
                case window.FISH_TYPES.SMALL_FRY_4:
                    entity = new window.Boid(creatureType);
                    entity.x = position.x;
                    entity.y = position.y;
                    gameEntities.fish.push(entity);
                    break;
                    
                case window.FISH_TYPES.KRILL:
                    entity = new window.Krill();
                    entity.x = position.x;
                    entity.y = position.y;
                    gameEntities.krill.push(entity);
                    break;
                    
                case window.FISH_TYPES.PALE_KRILL:
                    entity = new window.PaleKrill(position.x, position.y);
                    gameEntities.paleKrill.push(entity);
                    break;
                    
                case window.FISH_TYPES.MOM_KRILL:
                    entity = new window.MomKrill(position.x, position.y);
                    gameEntities.momKrill.push(entity);
                    break;
                    
                case 'tuna':
                    entity = new window.Predator(creatureType);
                    entity.x = position.x;
                    entity.y = position.y;
                    gameEntities.predators.push(entity);
                    break;
                    
                case 'giantSquid':
                    entity = new window.GiantSquid(position.x, position.y);
                    gameEntities.squid.push(entity);
                    break;
                    
                case 'fishEgg':
                    entity = new window.FertilizedEgg(position.x, position.y);
                    gameEntities.fertilizedEggs.push(entity);
                    break;
                    
                case 'bubble':
                    entity = new window.Bubble();
                    entity.x = position.x;
                    entity.y = position.y;
                    gameEntities.bubbles.push(entity);
                    break;
            }
            
            if (entity) {
                spawnedEntities.push(entity);
            }
        }
        
        console.log(`🌊 Spawned ${spawnedEntities.length} ${creatureType} in ${config.spawnZone} zone (${Math.round(config.preferredDepth * 100)}% depth)`);
        return spawnedEntities;
    }
    
    /**
     * Initialize ecosystem with depth-aware spawning
     * @param {Object} gameEntities - The game entities object
     */
    initializeEcosystemWithDepthPreferences(gameEntities) {
        console.log('🌊 Initializing ecosystem with depth-aware spawning...');
        
        // Spawn each creature type in their preferred zones
        const creatureTypes = Object.keys(this.CREATURE_CONFIGS);
        
        for (const creatureType of creatureTypes) {
            this.spawnCreaturesInPreferredZone(creatureType, gameEntities);
        }
        
        // Log ecosystem summary
        console.log('🌊 Ecosystem initialized with depth preferences:', {
            fish: gameEntities.fish.length,
            krill: gameEntities.krill.length,
            paleKrill: gameEntities.paleKrill.length,
            momKrill: gameEntities.momKrill.length,
            predators: gameEntities.predators.length,
            squid: gameEntities.squid.length,
            bubbles: gameEntities.bubbles.length,
            fishEggs: gameEntities.fertilizedEggs.length
        });
        
        // Log depth zone information
        console.log('🌊 Depth zones:', {
            surface: '0-20% (surface layer)',
            shallow: '0-40% (shallow water)',
            mid: '20-60% (mid-water zone)',
            deep: '0-80% (avoid abyssal)',
            abyssal: '80-100% (deep water)'
        });
    }
    
    /**
     * Get depth zone information for debugging
     * @returns {Object} Depth zone information
     */
    getDepthZoneInfo() {
        const info = {};
        for (const [zoneName, zone] of Object.entries(this.DEPTH_ZONES)) {
            info[zoneName] = {
                range: `${Math.round(zone.min * 100)}-${Math.round(zone.max * 100)}%`,
                pixels: `${Math.round(this.WORLD_HEIGHT * zone.min)}-${Math.round(this.WORLD_HEIGHT * zone.max)}px`,
                description: zone.name
            };
        }
        return info;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FishSpawningSystem = FishSpawningSystem;
} 