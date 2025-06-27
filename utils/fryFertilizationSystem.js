// Fry Fertilization System - Modular system for sperm fertilizing fish eggs
// When fish sperm hits a fish egg, replace it with a fertilized egg

class FryFertilizationSystem {
    constructor() {
        this.config = {
            FERTILIZATION_RANGE: 15, // Range for sperm to fertilize eggs
            FERTILIZATION_CHANCE: 0.8, // 80% chance to fertilize when conditions are met
            DEBUG: true // Enable debug mode
        };
        
        console.log('🥚 Fry Fertilization System initialized');
    }
    
    /**
     * Check for fertilization between sperm and fish eggs
     * @param {Array} sperm - Array of sperm entities
     * @param {Array} fishEggs - Array of fish egg entities
     * @param {Object} gameEntities - Game entities system
     */
    checkForFertilization(sperm, fishEggs, gameEntities) {
        if (!sperm || !fishEggs || !gameEntities) {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🥚 Fertilization check: Missing parameters - sperm: ${!!sperm}, fishEggs: ${!!fishEggs}, gameEntities: ${!!gameEntities}`);
            }
            return;
        }
        
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            console.log(`🥚 Checking fertilization - ${sperm.length} sperm, ${fishEggs.length} eggs`);
        }
        
        // Check each sperm against each egg
        for (let i = sperm.length - 1; i >= 0; i--) {
            const spermEntity = sperm[i];
            if (spermEntity.eaten) continue;
            
            for (let j = fishEggs.length - 1; j >= 0; j--) {
                const eggEntity = fishEggs[j];
                if (eggEntity.eaten || eggEntity.fertilized) continue;
                
                const distance = Math.sqrt((spermEntity.x - eggEntity.x) ** 2 + (spermEntity.y - eggEntity.y) ** 2);
                
                if (distance < this.config.FERTILIZATION_RANGE) {
                    if (this.config.DEBUG || window.gameState?.fryDebug) {
                        console.log(`🥚 Sperm near egg at distance ${distance.toFixed(1)}px`);
                    }
                    
                    // Random chance to fertilize
                    if (Math.random() < this.config.FERTILIZATION_CHANCE) {
                        this.fertilizeEgg(eggEntity, spermEntity, gameEntities);
                        break; // This sperm has fertilized an egg, move to next sperm
                    }
                }
            }
        }
    }
    
    /**
     * Fertilize a fish egg by replacing it with a fertilized egg
     * @param {Object} egg - The fish egg to fertilize
     * @param {Object} sperm - The sperm that fertilized the egg
     * @param {Object} gameEntities - Game entities system
     */
    fertilizeEgg(egg, sperm, gameEntities) {
        if (!gameEntities || !gameEntities.fertilizedEggs) {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.warn(`🥚 FertilizedEggs array not found in gameEntities`);
            }
            return;
        }
        
        // Mark the original egg as fertilized and eaten
        egg.fertilized = true;
        egg.eaten = true;
        
        // Mark the sperm as eaten
        sperm.eaten = true;
        
        // Create fertilized egg at the same location
        if (window.FertilizedEgg) {
            const fertilizedEgg = new window.FertilizedEgg(egg.x, egg.y);
            gameEntities.fertilizedEggs.push(fertilizedEgg);
            
            // Create fertilization effect (bubbles)
            if (window.ObjectPools) {
                for (let i = 0; i < 4; i++) {
                    window.ObjectPools.getEatingBubble(
                        egg.x + (Math.random() - 0.5) * 15,
                        egg.y + (Math.random() - 0.5) * 15
                    );
                }
            }
            
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🥚 Egg fertilized at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)}) - created fertilized egg`);
            }
        } else {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.warn(`🥚 FertilizedEgg class not found`);
            }
        }
    }
    
    /**
     * Update fertilization system for all entities
     * @param {Array} sperm - Array of sperm entities
     * @param {Array} fishEggs - Array of fish egg entities
     * @param {Object} gameEntities - Game entities system
     */
    update(sperm, fishEggs, gameEntities) {
        this.checkForFertilization(sperm, fishEggs, gameEntities);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FryFertilizationSystem = FryFertilizationSystem;
} 