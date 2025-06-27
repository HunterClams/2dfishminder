// Sperm Fertilization System - Handles actual sperm-egg collisions
// When sperm particles collide with unfertilized eggs, they become fertilized

class SpermFertilizationSystem {
    constructor() {
        this.config = {
            FERTILIZATION_RANGE: 15, // Range for sperm to fertilize eggs (collision distance)
            FERTILIZATION_CHANCE: 0.8, // 80% chance to fertilize on collision
            DEBUG: true
        };
        
        console.log('🐟 SpermFertilizationSystem initialized');
    }
    
    /**
     * Process all sperm for egg fertilization
     * @param {Array} sperm - Array of all sperm entities
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    processSpermFertilization(sperm, fishEggs, gameEntities) {
        if (!sperm || !fishEggs || !gameEntities) {
            return;
        }
        
        // Check each sperm for collision with unfertilized eggs
        for (let i = sperm.length - 1; i >= 0; i--) {
            const spermParticle = sperm[i];
            
            // Skip eaten or expired sperm
            if (spermParticle.eaten) {
                continue;
            }
            
            // Check collision with unfertilized eggs
            const fertilizedEgg = this.checkSpermEggCollision(spermParticle, fishEggs, gameEntities);
            
            if (fertilizedEgg) {
                // Sperm successfully fertilized an egg, remove the sperm
                sperm.splice(i, 1);
                
                if (window.gameState?.fryDebug) {
                    console.log(`🐟 Sperm fertilized egg at (${fertilizedEgg.x.toFixed(1)}, ${fertilizedEgg.y.toFixed(1)})`);
                }
            }
        }
    }
    
    /**
     * Check if a sperm particle collides with any unfertilized eggs
     * @param {Object} sperm - The sperm particle
     * @param {Array} fishEggs - Array of unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     * @returns {Object|null} The fertilized egg if created, null otherwise
     */
    checkSpermEggCollision(sperm, fishEggs, gameEntities) {
        if (!gameEntities || !gameEntities.fertilizedEggs || !window.FertilizedEgg) {
            return null;
        }
        
        for (let i = fishEggs.length - 1; i >= 0; i--) {
            const egg = fishEggs[i];
            
            // Skip eaten eggs
            if (egg.eaten) {
                continue;
            }
            
            // Calculate distance between sperm and egg
            const distance = Math.sqrt((sperm.x - egg.x) ** 2 + (sperm.y - egg.y) ** 2);
            
            // Check if sperm is within fertilization range
            if (distance < this.config.FERTILIZATION_RANGE) {
                // Random chance to fertilize
                if (Math.random() < this.config.FERTILIZATION_CHANCE) {
                    return this.fertilizeEgg(egg, sperm, gameEntities, i);
                }
            }
        }
        
        return null;
    }
    
    /**
     * Fertilize an unfertilized fish egg by converting it to a fertilized egg
     * @param {Object} egg - The unfertilized fish egg to fertilize
     * @param {Object} sperm - The sperm particle that fertilized the egg
     * @param {Object} gameEntities - Game entities system
     * @param {number} eggIndex - Index of the egg in the fishEggs array
     * @returns {Object} The newly created fertilized egg
     */
    fertilizeEgg(egg, sperm, gameEntities, eggIndex) {
        // Create fertilized egg at the same location
        const fertilizedEgg = new window.FertilizedEgg(egg.x, egg.y);
        gameEntities.fertilizedEggs.push(fertilizedEgg);
        
        // Remove the original unfertilized egg
        if (eggIndex !== undefined && eggIndex >= 0) {
            gameEntities.fishEggs.splice(eggIndex, 1);
        } else {
            // Fallback: find and remove the egg
            const index = gameEntities.fishEggs.indexOf(egg);
            if (index > -1) {
                gameEntities.fishEggs.splice(index, 1);
            }
        }
        
        // Create visual effect (bubbles)
        if (window.ObjectPools) {
            for (let i = 0; i < 4; i++) {
                window.ObjectPools.getEatingBubble(
                    egg.x + (Math.random() - 0.5) * 15,
                    egg.y + (Math.random() - 0.5) * 15
                );
            }
        }
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 Sperm at (${sperm.x.toFixed(1)}, ${sperm.y.toFixed(1)}) fertilized egg at (${egg.x.toFixed(1)}, ${egg.y.toFixed(1)})`);
        }
        
        return fertilizedEgg;
    }
}

// Create global instance
const spermFertilizationSystem = new SpermFertilizationSystem();

// Export for global access
if (typeof window !== 'undefined') {
    window.SpermFertilizationSystem = spermFertilizationSystem;
} 