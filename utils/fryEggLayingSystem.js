// Fry Egg Laying System - Modular system for fry to lay eggs
// When two fry enter feeding state and are within detection range, one will lay fish eggs

class FryEggLayingSystem {
    constructor() {
        this.config = {
            DETECTION_RANGE: 80, // Range for fry to detect each other
            LAYING_COOLDOWN: 15000, // 15 seconds cooldown between laying
            LAYING_CHANCE: 0.3, // 30% chance to lay when conditions are met
            EGG_DROP_OFFSET: 20 // Distance from fry to drop eggs
        };
        
        // Track fry that have recently laid eggs to prevent spam
        this.recentLaying = new Map(); // fryId -> timestamp
        
        console.log('🥚 FryEggLayingSystem initialized');
    }
    
    /**
     * Check if fry should lay eggs with nearby fry
     * @param {Object} fry - The fry entity
     * @param {Array} allFry - Array of all fry entities
     * @param {Object} gameEntities - Game entities system
     */
    checkForEggLaying(fry, allFry, gameEntities) {
        // Only check if fry is in feeding state
        if (fry.behaviorState !== 'feeding') {
            if (window.gameState?.fryDebug) {
                console.log(`🥚 Fry not in feeding state: ${fry.behaviorState} at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
            }
            return;
        }
        
        // Debug: Log when fry are in feeding state
        if (window.gameState?.fryDebug) {
            console.log(`🥚 Fry in feeding state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
        }
        
        // Check cooldown to prevent spam laying
        const fryId = this.getFryId(fry);
        const now = Date.now();
        const lastLayTime = this.recentLaying.get(fryId) || 0;
        
        if (now - lastLayTime < this.config.LAYING_COOLDOWN) {
            return;
        }
        
        // Find nearby fry in feeding state
        const nearbyFeedingFry = this.findNearbyFeedingFry(fry, allFry);
        
        if (window.gameState?.fryDebug && nearbyFeedingFry.length > 0) {
            console.log(`🥚 Found ${nearbyFeedingFry.length} nearby feeding fry`);
        }
        
        if (nearbyFeedingFry.length > 0) {
            // Random chance to lay eggs
            if (Math.random() < this.config.LAYING_CHANCE) {
                this.layEggs(fry, nearbyFeedingFry, gameEntities);
                
                // Set cooldown
                this.recentLaying.set(fryId, now);
                
                if (window.gameState?.fryDebug) {
                    console.log(`🥚 Fry laying eggs with ${nearbyFeedingFry.length} nearby feeding fry`);
                }
            }
        }
    }
    
    /**
     * Find nearby fry in feeding state
     * @param {Object} fry - The fry entity
     * @param {Array} allFry - Array of all fry entities
     * @returns {Array} Array of nearby feeding fry
     */
    findNearbyFeedingFry(fry, allFry) {
        const nearbyFry = [];
        
        for (let otherFry of allFry) {
            if (otherFry === fry) continue;
            if (otherFry.behaviorState !== 'feeding') continue;
            
            const distance = Math.sqrt((fry.x - otherFry.x) ** 2 + (fry.y - otherFry.y) ** 2);
            
            if (distance < this.config.DETECTION_RANGE) {
                nearbyFry.push(otherFry);
            }
        }
        
        return nearbyFry;
    }
    
    /**
     * Lay eggs by dropping fish eggs near the fry
     * @param {Object} fry - The fry laying eggs
     * @param {Array} nearbyFry - Array of nearby feeding fry
     * @param {Object} gameEntities - Game entities system
     */
    layEggs(fry, nearbyFry, gameEntities) {
        if (!gameEntities || !gameEntities.fishEggs || !window.FishEgg) {
            return;
        }
        
        // Random number of fish eggs to lay (1-3)
        const eggCount = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
        
        for (let i = 0; i < eggCount; i++) {
            // Spawn fish eggs directly at the fry's location
            const dropX = fry.x;
            const dropY = fry.y;
            
            // Create fish egg
            const newEgg = new window.FishEgg(dropX, dropY);
            gameEntities.fishEggs.push(newEgg);
            
            // Create visual effect (bubbles)
            if (window.ObjectPools) {
                for (let j = 0; j < 2; j++) {
                    window.ObjectPools.getEatingBubble(
                        dropX + (Math.random() - 0.5) * 10,
                        dropY + (Math.random() - 0.5) * 10
                    );
                }
            }
        }
        
        // End feeding state for the fry that just laid eggs
        fry.behaviorState = 'foraging';
        fry.feedingTimer = 0;
        fry.huntTarget = null;
        
        // Start feeding cooldown to prevent hunting for 15 seconds
        if (window.FryFeedingCooldownSystem) {
            window.FryFeedingCooldownSystem.onEggsLaid(fry);
        }
        
        if (window.gameState?.fryDebug) {
            console.log(`🥚 Fry laid ${eggCount} fish eggs at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) and entered feeding cooldown`);
        }
    }
    
    /**
     * Get unique ID for fry (for cooldown tracking)
     * @param {Object} fry - The fry entity
     * @returns {string} Unique fry ID
     */
    getFryId(fry) {
        // Use position and fish type as a simple ID
        return `${fry.fishType}_${Math.floor(fry.x)}_${Math.floor(fry.y)}`;
    }
    
    /**
     * Clean up old cooldown entries
     */
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - this.config.LAYING_COOLDOWN * 2; // Remove entries older than 2x cooldown
        
        for (let [fryId, timestamp] of this.recentLaying.entries()) {
            if (timestamp < cutoffTime) {
                this.recentLaying.delete(fryId);
            }
        }
    }
    
    /**
     * Process all fry for egg laying
     * @param {Array} allFry - Array of all fry entities
     * @param {Object} gameEntities - Game entities system
     */
    processAllFry(allFry, gameEntities) {
        for (let fry of allFry) {
            this.checkForEggLaying(fry, allFry, gameEntities);
        }
        
        // Clean up old cooldown entries periodically
        if (Math.random() < 0.01) { // 1% chance per frame
            this.cleanup();
        }
    }
}

// Create global instance
const fryEggLayingSystem = new FryEggLayingSystem();

// Export for global access
if (typeof window !== 'undefined') {
    window.FryEggLayingSystem = fryEggLayingSystem;
} 