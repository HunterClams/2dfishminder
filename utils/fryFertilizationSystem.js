// Fry Fertilization System - Handles fry spawning sperm to fertilize fish eggs
// When fry enter spawning state, they spawn sperm over nearby fish eggs
// Also handles feeding fry detecting fish eggs at long range and entering spawning state

class FryFertilizationSystem {
    constructor() {
        this.config = {
            DETECTION_RANGE: 100, // Range for fry to detect fish eggs
            LONG_DETECTION_RANGE: 1000, // Range for feeding fry to detect fish eggs and enter spawning
            SPAWNING_DURATION: 5000, // 5 seconds in spawning state
            SPERM_SPAWN_RATE: 0.1, // 10% chance per frame to spawn sperm
            SPERM_COUNT: 3, // Number of sperm to spawn per fertilization attempt
            FERTILIZATION_RANGE: 30 // Range for sperm to fertilize eggs
        };
        
        console.log('🐟 FryFertilizationSystem initialized');
    }
    
    /**
     * Process all fry for fertilization and long-range egg detection
     * @param {Array} allFry - Array of all fry entities
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    processAllFry(allFry, fishEggs, gameEntities) {
        for (let fry of allFry) {
            // Check if feeding fry should detect unfertilized eggs at long range and enter spawning
            this.checkForLongRangeEggDetection(fry, fishEggs);
            
            // Process fry already in spawning state
            this.processSpawningFry(fry, fishEggs, gameEntities);
        }
    }
    
    /**
     * Check if feeding fry should detect fish eggs at long range and enter spawning state
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all fish eggs
     */
    checkForLongRangeEggDetection(fry, fishEggs) {
        // Skip TrueFry1 and TrueFry2 - they don't participate in fertilization
        if (fry.fishType === 'truefry1' || fry.fishType === 'truefry2') {
            return;
        }
        
        // Only check feeding fry that are not already in spawning state
        if (fry.behaviorState !== 'feeding') {
            return;
        }
        
        // Check for unfertilized fish eggs at long range
        const nearbyEggs = this.findFishEggsAtLongRange(fry, fishEggs);
        
        if (nearbyEggs.length > 0) {
            // Enter spawning state when unfertilized eggs are detected at long range
            fry.behaviorState = 'spawning';
            
            // CRITICAL FIX: Reset feeding timer to prevent timer/state conflicts
            // When we interrupt feeding state for spawning, we must reset the timer
            // to prevent it from interfering with future feeding behavior
            if (fry.feedingTimer !== undefined) {
                fry.feedingTimer = 0;
            }
            
            // Initialize spawning properties if not present
            if (!fry.spawningProperties) {
                fry.spawningProperties = {
                    spawningTimer: 0,
                    spawningTarget: null,
                    lastSpawningTime: 0,
                    canSpawn: true
                };
            }
            
            fry.spawningProperties.spawningTimer = 0;
            fry.spawningProperties.spawningTarget = null;
            
            if (window.gameState?.fryDebug) {
                console.log(`🐟 Feeding fry detected ${nearbyEggs.length} unfertilized fish eggs at long range (${this.config.LONG_DETECTION_RANGE}px) and entered spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
            }
        }
    }
    
    /**
     * Find unfertilized fish eggs at long range for feeding fry
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @returns {Array} Array of unfertilized fish eggs at long range
     */
    findFishEggsAtLongRange(fry, fishEggs) {
        const nearbyEggs = [];
        
        for (let egg of fishEggs) {
            const distance = Math.sqrt((fry.x - egg.x) ** 2 + (fry.y - egg.y) ** 2);
            
            if (distance < this.config.LONG_DETECTION_RANGE) {
                nearbyEggs.push(egg);
            }
        }
        
        return nearbyEggs;
    }
    
    /**
     * Process fry in spawning state
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    processSpawningFry(fry, fishEggs, gameEntities) {
        if (fry.behaviorState !== 'spawning') {
            return;
        }
        
        // Find nearby unfertilized fish eggs to fertilize
        const nearbyEggs = this.findNearbyFishEggs(fry, fishEggs);
        
        if (window.gameState?.fryDebug && nearbyEggs.length > 0) {
            console.log(`🐟 Fry in spawning state found ${nearbyEggs.length} nearby unfertilized fish eggs`);
        }
        
        // Spawn sperm to fertilize unfertilized eggs
        if (nearbyEggs.length > 0 && Math.random() < this.config.SPERM_SPAWN_RATE) {
            this.spawnSperm(fry, nearbyEggs, gameEntities);
        }
        
        // Note: Spawning state now ends immediately after spawning sperm in spawnSperm method
        // No need for timer-based ending here
    }
    
    /**
     * Find nearby unfertilized fish eggs that can be fertilized
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @returns {Array} Array of nearby unfertilized fish eggs
     */
    findNearbyFishEggs(fry, fishEggs) {
        const nearbyEggs = [];
        
        for (let egg of fishEggs) {
            const distance = Math.sqrt((fry.x - egg.x) ** 2 + (fry.y - egg.y) ** 2);
            
            if (distance < this.config.DETECTION_RANGE) {
                nearbyEggs.push(egg);
            }
        }
        
        return nearbyEggs;
    }
    
    /**
     * Spawn sperm to fertilize nearby eggs
     * @param {Object} fry - The fry spawning sperm
     * @param {Array} nearbyEggs - Array of nearby fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    spawnSperm(fry, nearbyEggs, gameEntities) {
        if (!gameEntities || !gameEntities.sperm || !window.Sperm) {
            return;
        }
        
        // Spawn multiple sperm particles
        for (let i = 0; i < this.config.SPERM_COUNT; i++) {
            // Spawn sperm near the fry with some randomness
            const spawnX = fry.x + (Math.random() - 0.5) * 20;
            const spawnY = fry.y + (Math.random() - 0.5) * 20;
            
            // Create sperm
            const newSperm = new window.Sperm(spawnX, spawnY);
            gameEntities.sperm.push(newSperm);
            
            // Create visual effect (bubbles)
            if (window.ObjectPools) {
                window.ObjectPools.getEatingBubble(spawnX, spawnY);
            }
        }
        
        // Try to fertilize nearby eggs
        this.attemptFertilization(fry, nearbyEggs, gameEntities);
        
        // End spawning state immediately after spawning sperm
        this.endSpawningState(fry);
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 Fry spawned ${this.config.SPERM_COUNT} sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) and ended spawning state`);
        }
    }
    
    /**
     * Attempt to fertilize nearby unfertilized fish eggs
     * @param {Object} fry - The fry attempting fertilization
     * @param {Array} nearbyEggs - Array of nearby unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    attemptFertilization(fry, nearbyEggs, gameEntities) {
        if (!gameEntities || !gameEntities.fertilizedEggs || !window.FertilizedEgg) {
            return;
        }
        
        for (let egg of nearbyEggs) {
            const distance = Math.sqrt((fry.x - egg.x) ** 2 + (fry.y - egg.y) ** 2);
            
            if (distance < this.config.FERTILIZATION_RANGE) {
                // Random chance to fertilize (50%)
                if (Math.random() < 0.5) {
                    this.fertilizeEgg(egg, fry, gameEntities);
                }
            }
        }
    }
    
    /**
     * Fertilize an unfertilized fish egg by converting it to a fertilized egg
     * @param {Object} egg - The unfertilized fish egg to fertilize
     * @param {Object} fry - The fry doing the fertilization
     * @param {Object} gameEntities - Game entities system
     */
    fertilizeEgg(egg, fry, gameEntities) {
        // Create fertilized egg at the same location
        const fertilizedEgg = new window.FertilizedEgg(egg.x, egg.y);
        gameEntities.fertilizedEggs.push(fertilizedEgg);
        
        // Remove the original unfertilized egg
        const eggIndex = gameEntities.fishEggs.indexOf(egg);
        if (eggIndex > -1) {
            gameEntities.fishEggs.splice(eggIndex, 1);
        }
        
        // Create visual effect (bubbles)
        if (window.ObjectPools) {
            for (let i = 0; i < 3; i++) {
                window.ObjectPools.getEatingBubble(
                    egg.x + (Math.random() - 0.5) * 15,
                    egg.y + (Math.random() - 0.5) * 15
                );
            }
        }
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 Fertilized unfertilized fish egg at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)})`);
        }
    }
    
    /**
     * End spawning state and return to foraging
     * @param {Object} fry - The fry to end spawning state for
     */
    endSpawningState(fry) {
        fry.behaviorState = 'foraging';
        
        // CRITICAL FIX: Reset feeding timer to prevent timer/state conflicts
        // When transitioning out of spawning state, ensure feeding timer is clean
        if (fry.feedingTimer !== undefined) {
            fry.feedingTimer = 0;
        }
        
        // Reset spawning properties if they exist
        if (fry.spawningProperties) {
            fry.spawningProperties.spawningTimer = 0;
            fry.spawningProperties.spawningTarget = null;
        }
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 Fry ended spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
        }
    }
}

// Export the class constructor for global access
if (typeof window !== 'undefined') {
    window.FryFertilizationSystem = FryFertilizationSystem;
} 