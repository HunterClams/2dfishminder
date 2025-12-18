// Boid Configuration Module
class BoidConfig {
    static FISH_TYPES = {
        SMALL_FRY_2: 'smallFry2',
        SMALL_FRY_3: 'smallFry3', 
        SMALL_FRY_4: 'smallFry4',
        TRUE_FRY_1: 'truefry1',
        TRUE_FRY_2: 'truefry2',
        TRUE_FRY: 'truefry',
        KRILL: 'krill'
    };

    static FISH_CONFIGS = {
        [BoidConfig.FISH_TYPES.SMALL_FRY_4]: { 
            size: 32, 
            maxSpeed: 3.2,
            spawnZone: 'surface'
        },
        [BoidConfig.FISH_TYPES.SMALL_FRY_3]: { 
            size: 32, 
            maxSpeed: 2.8,
            spawnZone: 'mid'
        },
        [BoidConfig.FISH_TYPES.SMALL_FRY_2]: { 
            size: 32, 
            maxSpeed: 3.0,
            spawnZone: 'surface'
        },
        [BoidConfig.FISH_TYPES.TRUE_FRY_1]: { 
            size: 18, 
            maxSpeed: 3.5,
            spawnZone: 'surface'
        },
        [BoidConfig.FISH_TYPES.TRUE_FRY_2]: { 
            size: 26, 
            maxSpeed: 3.3,
            spawnZone: 'surface'
        },
        [BoidConfig.FISH_TYPES.TRUE_FRY]: { 
            size: 18, 
            maxSpeed: 3.5,
            spawnZone: 'surface'
        }
    };

    static BEHAVIOR_CONFIG = {
        maxForce: 0.06,
        separationRadius: 35,
        alignmentRadius: 60,
        cohesionRadius: 80,
        fearRadius: 120,        // Threat detection radius (same as tuna's flee radius concept)
        fleeRadius: 480,        // Flee radius for predators (tuna and squids) - doubled from 240 to 480
        fleeSpeed: 1.3,         // Speed boost when fleeing (30% faster)
        minSpeed: 0.8,          // Minimum speed to prevent stationary fry (increased from 0.5 for more active movement)
        foodRadius: 80,
        huntRadius: 40,
        frameSpeed: 0.1,
        depthTolerance: 0.15, // 15% of world height
        detectionRange: 120, // Increased by 50% from 80
        feedingDuration: 3000, // 3 seconds feeding state
        poopThreshold: { min: 3, max: 5 } // 3-5 food items needed to poop (reduced from 6-8)
    };

    static FOOD_SOURCES = {
        krill: { energyGain: 15, range: 25, foodValue: 3 },
        paleKrill: { energyGain: 12, range: 25, foodValue: 2 },
        momKrill: { energyGain: 20, range: 25, foodValue: 6 },
        fishFood: { energyGain: 10, range: 20, foodValue: 3 },
        poop: { energyGain: 8, range: 22, foodValue: 'variable' }
    };

    static DEBUG_COLORS = {
        foraging: '#90EE90',    // Light Green
        hunting: '#FFA500',     // Orange  
        feeding: '#87CEEB',     // Sky Blue
        spawning: '#FF69B4',    // Hot Pink for spawning state
        fleeing: '#FF0000'      // Red for fleeing state
    };

    static getPreferredDepth(fishType) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        switch (fishType) {
            case BoidConfig.FISH_TYPES.SMALL_FRY_2:
            case BoidConfig.FISH_TYPES.SMALL_FRY_4:
            case BoidConfig.FISH_TYPES.TRUE_FRY_1:
            case BoidConfig.FISH_TYPES.TRUE_FRY_2:
            case BoidConfig.FISH_TYPES.TRUE_FRY:
                return WORLD_HEIGHT * 0.2; // Prefer surface waters
            case BoidConfig.FISH_TYPES.SMALL_FRY_3:
                return WORLD_HEIGHT * 0.4; // Prefer mid waters
            default:
                return WORLD_HEIGHT * 0.3;
        }
    }

    static getSpawnZone(fishType) {
        const config = BoidConfig.FISH_CONFIGS[fishType];
        return config ? config.spawnZone : 'shallow';
    }

    static getFishConfig(fishType) {
        return BoidConfig.FISH_CONFIGS[fishType] || BoidConfig.FISH_CONFIGS[BoidConfig.FISH_TYPES.SMALL_FRY_2];
    }
}

// Export for global access
window.BoidConfig = BoidConfig; 