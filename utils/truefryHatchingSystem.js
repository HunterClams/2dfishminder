// TrueFry Hatching System - Modular system for fertilized eggs to hatch into truefry
class TrueFryHatchingSystem {
    constructor() {
        this.config = {
            HATCH_DURATION_MIN: 7000, // 7 seconds minimum
            HATCH_DURATION_MAX: 13000, // 13 seconds maximum
            HATCH_RANGE: 30, // Range for hatching effect
            SPAWN_COUNT: { min: 1, max: 3 }, // Random number of truefry per hatch
            SPAWN_SPREAD: 40, // Spread radius for spawning multiple truefry
            DEBUG: true // Enable debug logging
        };
        
        console.log('🐟 TrueFryHatchingSystem initialized');
    }
    
    /**
     * Check if fertilized eggs should hatch into truefry
     * @param {Array} fertilizedEggs - Array of fertilized egg entities
     * @param {Object} gameEntities - Game entities system
     */
    checkForHatching(fertilizedEggs, gameEntities) {
        if (!fertilizedEggs || !gameEntities) {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 Hatching check: Missing parameters - fertilizedEggs: ${!!fertilizedEggs}, gameEntities: ${!!gameEntities}`);
            }
            return;
        }
        
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            console.log(`🐟 Checking hatching - ${fertilizedEggs.length} fertilized eggs`);
        }
        
        // Check each fertilized egg
        for (let i = fertilizedEggs.length - 1; i >= 0; i--) {
            const egg = fertilizedEggs[i];
            
            if (egg.eaten || egg.hatched) continue;
            
            // Initialize random hatch duration if not set
            if (!egg.hatchDuration) {
                egg.hatchDuration = this.config.HATCH_DURATION_MIN + 
                    Math.random() * (this.config.HATCH_DURATION_MAX - this.config.HATCH_DURATION_MIN);
            }
            
            // Debug: Log egg timer progress
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                const progress = (egg.hatchTimer / egg.hatchDuration * 100).toFixed(1);
                if (egg.hatchTimer % 1000 < 16) { // Log once per second
                    console.log(`🐟 Egg at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)}) - ${progress}% hatched (${egg.hatchTimer}/${egg.hatchDuration.toFixed(0)}ms)`);
                }
            }
            
            // Check if hatch timer is complete
            if (egg.hatchTimer >= egg.hatchDuration) {
                this.hatchTrueFry(egg, gameEntities);
            }
        }
    }
    
    /**
     * Hatch fertilized egg into truefry
     * @param {Object} egg - The fertilized egg to hatch
     * @param {Object} gameEntities - Game entities system
     */
    hatchTrueFry(egg, gameEntities) {
        if (!gameEntities || !gameEntities.fish || !window.TrueFry) {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.warn(`🐟 TrueFry class or fish array not found`);
            }
            return;
        }
        
        // Mark egg as hatched and eaten
        egg.hatched = true;
        egg.eaten = true;
        
        // Determine number of truefry to spawn
        const spawnCount = Math.random() < 0.5 ? 
            this.config.SPAWN_COUNT.min : 
            this.config.SPAWN_COUNT.max;
        
        // Spawn truefry
        for (let i = 0; i < spawnCount; i++) {
            // Calculate spawn position with spread
            const angle = (Math.PI * 2 * i) / spawnCount;
            const distance = Math.random() * this.config.SPAWN_SPREAD;
            const spawnX = egg.x + Math.cos(angle) * distance;
            const spawnY = egg.y + Math.sin(angle) * distance;
            
            // Create truefry
            const trueFry = new window.TrueFry();
            trueFry.x = spawnX;
            trueFry.y = spawnY;
            
            // Add to fish array
            gameEntities.fish.push(trueFry);
            
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 TrueFry hatched at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
            }
        }
        
        // Create hatching effect (bubbles and particles)
        if (window.ObjectPools) {
            for (let i = 0; i < 6; i++) {
                window.ObjectPools.getEatingBubble(
                    egg.x + (Math.random() - 0.5) * this.config.HATCH_RANGE,
                    egg.y + (Math.random() - 0.5) * this.config.HATCH_RANGE
                );
            }
        }
        
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            console.log(`🐟 Fertilized egg hatched into ${spawnCount} truefry at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)})`);
        }
    }
    
    /**
     * Update hatching system for all fertilized eggs
     * @param {Array} fertilizedEggs - Array of fertilized egg entities
     * @param {Object} gameEntities - Game entities system
     */
    update(fertilizedEggs, gameEntities) {
        this.checkForHatching(fertilizedEggs, gameEntities);
    }
}

// Export for global access
window.TrueFryHatchingSystem = TrueFryHatchingSystem; 