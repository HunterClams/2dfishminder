// TrueFry Hatching System - Hatches TrueFry1 from fertilized eggs
class TrueFryHatchingSystem {
    constructor() {
        this.config = {
            HATCH_DURATION_MIN: 7000, // 7 seconds minimum
            HATCH_DURATION_MAX: 13000, // 13 seconds maximum
            HATCH_RANGE: 30, // Range for hatching effect
            SPAWN_COUNT: { min: 1, max: 3 }, // Random number of TrueFry1 per hatch
            SPAWN_SPREAD: 40, // Spread radius for spawning multiple TrueFry1
            DEBUG: false // Disable debug logging for performance
        };
        
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.logSystemInit('TRUEFRY', 'TrueFryHatchingSystem initialized');
        }
    }
    
    /**
     * Check if fertilized eggs should hatch into TrueFry1
     * @param {Array} fertilizedEggs - Array of fertilized egg entities
     * @param {Object} gameEntities - Game entities system
     */
    checkForHatching(fertilizedEggs, gameEntities) {
        if (!fertilizedEggs || !gameEntities) {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.logWarning('TRUEFRY', `Hatching check: Missing parameters - fertilizedEggs: ${!!fertilizedEggs}, gameEntities: ${!!gameEntities}`);
            }
            return;
        }
        
        // Check each fertilized egg
        for (let i = fertilizedEggs.length - 1; i >= 0; i--) {
            const egg = fertilizedEggs[i];
            
            if (egg.eaten || egg.hatched) {
                continue; // Skip without logging for performance
            }
            
            // Initialize random hatch duration if not set
            if (!egg.hatchDuration) {
                egg.hatchDuration = this.config.HATCH_DURATION_MIN + 
                    Math.random() * (this.config.HATCH_DURATION_MAX - this.config.HATCH_DURATION_MIN);
            }
            
            // Check if hatch timer is complete
            if (egg.hatchTimer >= egg.hatchDuration) {
                if (window.ConsoleDebugSystem) {
                    window.ConsoleDebugSystem.log('TRUEFRY', `Egg ${i}: READY TO HATCH!`, 'info');
                }
                this.hatchTrueFry1(egg, gameEntities);
            }
        }
    }
    
    /**
     * Hatch fertilized egg into TrueFry1
     * @param {Object} egg - The fertilized egg to hatch
     * @param {Object} gameEntities - Game entities system
     */
    hatchTrueFry1(egg, gameEntities) {
        if (!gameEntities || !gameEntities.fish || !window.TrueFry1) {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('FRY', 'TrueFry1 class or fish array not found', 'error');
            } else if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.warn(`🐟 TrueFry1 class or fish array not found`);
            }
            return;
        }
        
        // Mark egg as hatched and eaten
        egg.hatched = true;
        egg.eaten = true;
        
        // Determine number of TrueFry1 to spawn
        const spawnCount = Math.random() < 0.5 ? 
            this.config.SPAWN_COUNT.min : 
            this.config.SPAWN_COUNT.max;
        
        // Spawn TrueFry1
        for (let i = 0; i < spawnCount; i++) {
            // Calculate spawn position with spread
            const angle = (Math.PI * 2 * i) / spawnCount;
            const distance = Math.random() * this.config.SPAWN_SPREAD;
            const spawnX = egg.x + Math.cos(angle) * distance;
            const spawnY = egg.y + Math.sin(angle) * distance;
            
            // Create TrueFry1
            const trueFry1 = new window.TrueFry1(spawnX, spawnY);
            
            // Add to fish array
            gameEntities.fish.push(trueFry1);
            
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('FRY', `TrueFry1 hatched at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
            } else if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 TrueFry1 hatched at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)})`);
            }
        }
        
        // Create hatching effect (bubbles and particles)
        if (window.ObjectPools) {
            window.ObjectPools.getEatingBubble(
                egg.x + (Math.random() - 0.5) * this.config.HATCH_RANGE,
                egg.y + (Math.random() - 0.5) * this.config.HATCH_RANGE
            );
        }
        
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('FRY', `Fertilized egg hatched into ${spawnCount} TrueFry1 at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)})`);
        } else if (this.config.DEBUG || window.gameState?.fryDebug) {
            console.log(`🐟 Fertilized egg hatched into ${spawnCount} TrueFry1 at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)})`);
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