// Fry Egg Laying System - Clean implementation
// Detects when two fry are in feeding state within 80px and spawns eggs

class FryEggLayingSystem {
    constructor() {
        this.config = {
            DETECTION_RANGE: 80, // Range for fry to detect each other in feeding state
            EGG_COUNT_MIN: 1, // Minimum eggs to spawn
            EGG_COUNT_MAX: 4, // Maximum eggs to spawn (increased from 3 to 4)
            EGG_LAYING_COOLDOWN: 15000, // 15 seconds cooldown between laying
            LAYING_CHANCE: 0.8 // 80% chance to lay when conditions are met
        };
        
        // Track fry that have recently laid eggs
        this.recentLaying = new Map(); // fryId -> { lastLayTime }
        
        console.log('🥚 FryEggLayingSystem initialized - Clean implementation');
    }
    
    /**
     * Process all fry for egg laying
     * @param {Array} allFry - Array of all fry entities
     * @param {Object} gameEntities - Game entities system
     */
    processAllFry(allFry, gameEntities) {
        // Debug: Log fry state distribution
        if (window.gameState?.fryEggLayingDebug) {
            const stateCounts = {};
            let totalRegularFry = 0;
            
            for (let fry of allFry) {
                if (fry.fishType !== 'truefry1' && fry.fishType !== 'truefry2') {
                    totalRegularFry++;
                    const state = fry.behaviorState || 'undefined';
                    stateCounts[state] = (stateCounts[state] || 0) + 1;
                }
            }
            
            if (totalRegularFry > 0) {
                const stateText = `${totalRegularFry} regular fry - ${Object.entries(stateCounts).map(([state, count]) => `${state}:${count}`).join(', ')}`;
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('EGG_LAYING', `Fry state distribution: ${stateText}`);
                }
            }
        }
        
        for (let fry of allFry) {
            this.checkForEggLaying(fry, allFry, gameEntities);
        }
        
        // Clean up old cooldown entries periodically
        if (Math.random() < 0.01) { // 1% chance per frame
            this.cleanup();
        }
    }
    
    /**
     * Check if a fry should lay eggs
     * @param {Object} fry - The fry entity to check
     * @param {Array} allFry - Array of all fry entities
     * @param {Object} gameEntities - Game entities system
     */
    checkForEggLaying(fry, allFry, gameEntities) {
        // Skip TrueFry1 and TrueFry2 - they don't lay eggs
        if (fry.fishType === 'truefry1' || fry.fishType === 'truefry2') {
            return;
        }
        
        // Only allow egg laying when fry is in feeding state
        if (fry.behaviorState !== 'feeding') {
            return;
        }
        
        // Check cooldown
        const fryId = this.getFryId(fry);
        const now = Date.now();
        const fryCooldown = this.recentLaying.get(fryId);
        
        if (fryCooldown && now - fryCooldown.lastLayTime < this.config.EGG_LAYING_COOLDOWN) {
            return;
        }
        
        // Find nearby fry in feeding state (excluding self)
        const nearbyFeedingFry = this.findNearbyFeedingFry(fry, allFry);
        
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('EGG_LAYING', `Fry ${fry.fishType} found ${nearbyFeedingFry.length} nearby feeding fry`);
        }
        
        // Only lay eggs if there are other feeding fry nearby
        if (nearbyFeedingFry.length > 0) {
            // Random chance to lay eggs
            if (Math.random() < this.config.LAYING_CHANCE) {
                this.layEggs(fry, gameEntities);
                
                // Set cooldown for this fry
                this.recentLaying.set(fryId, {
                    lastLayTime: now
                });
                
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('EGG_LAYING', `Fry ${fry.fishType} laid eggs and got cooldown`);
                }
            }
        }
    }
    
    /**
     * Find nearby fry in feeding state (excluding self)
     * @param {Object} fry - The fry entity
     * @param {Array} allFry - Array of all fry entities
     * @returns {Array} Array of nearby feeding fry
     */
    findNearbyFeedingFry(fry, allFry) {
        const nearbyFry = [];
        
        for (let otherFry of allFry) {
            // Skip self and TrueFry
            if (otherFry === fry || otherFry.fishType === 'truefry1' || otherFry.fishType === 'truefry2') {
                continue;
            }
            
            // Only count fry in feeding state
            if (otherFry.behaviorState !== 'feeding') {
                continue;
            }
            
            const distance = Math.sqrt((fry.x - otherFry.x) ** 2 + (fry.y - otherFry.y) ** 2);
            
            if (distance < this.config.DETECTION_RANGE) {
                nearbyFry.push(otherFry);
            }
        }
        
        return nearbyFry;
    }
    
    /**
     * Lay eggs by dropping unfertilized fish eggs near the fry
     * @param {Object} fry - The fry laying eggs
     * @param {Object} gameEntities - Game entities system
     */
    layEggs(fry, gameEntities) {
        if (!gameEntities || !gameEntities.fishEggs || !window.FishEgg) {
            console.warn('🐟 Cannot lay eggs - missing dependencies');
            return;
        }
        
        // Random number of eggs to lay
        const eggCount = this.config.EGG_COUNT_MIN + Math.floor(Math.random() * (this.config.EGG_COUNT_MAX - this.config.EGG_COUNT_MIN + 1));
        
        console.log(`🐟 Fry ${fry.fishType} laying ${eggCount} eggs at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
        
        for (let i = 0; i < eggCount; i++) {
            // Spawn eggs near the fry with some spread
            const spreadX = fry.x + (Math.random() - 0.5) * 20;
            const spreadY = fry.y + (Math.random() - 0.5) * 20;
            
            // Create unfertilized fish egg
            const newEgg = new window.FishEgg(spreadX, spreadY);
            gameEntities.fishEggs.push(newEgg);
            
            console.log(`🥚 Created fish egg ${i+1}/${eggCount} at (${spreadX.toFixed(1)}, ${spreadY.toFixed(1)})`);
            
            // Create visual effect (bubbles)
            if (window.ObjectPools) {
                for (let j = 0; j < 2; j++) {
                    window.ObjectPools.getEatingBubble(
                        spreadX + (Math.random() - 0.5) * 10,
                        spreadY + (Math.random() - 0.5) * 10
                    );
                }
            }
        }
        
        // Change fry state from feeding to foraging
        fry.behaviorState = 'foraging';
        
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('EGG_LAYING', `Fry ${fry.fishType} laid ${eggCount} eggs and returned to foraging state`);
        }
    }
    
    /**
     * Get unique ID for fry (for cooldown tracking)
     * @param {Object} fry - The fry entity
     * @returns {string} Unique fry ID
     */
    getFryId(fry) {
        return `${fry.fishType}_${Math.floor(fry.x)}_${Math.floor(fry.y)}`;
    }
    
    /**
     * Clean up old cooldown entries
     */
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - this.config.EGG_LAYING_COOLDOWN * 2;
        
        for (let [fryId, cooldown] of this.recentLaying.entries()) {
            if (cooldown.lastLayTime < cutoffTime) {
                this.recentLaying.delete(fryId);
            }
        }
    }
}

// Export the class constructor for global access
if (typeof window !== 'undefined') {
    window.FryEggLayingSystem = FryEggLayingSystem;
} 