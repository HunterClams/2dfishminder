// Fry Egg Laying System - Clean implementation
// Detects when two fry are in feeding state within 80px and spawns eggs

class FryEggLayingSystem {
    constructor() {
        this.config = {
            DETECTION_RANGE: 80, // Range for fry to detect each other in feeding state
            EGG_COUNT_MIN: 1, // Minimum eggs to spawn
            EGG_COUNT_MAX: 3, // Maximum eggs to spawn
            EGG_LAYING_COOLDOWN: 15000, // 15 seconds cooldown between laying
            LAYING_CHANCE: 0.8, // 80% chance to lay when conditions are met
            GERMINATION_DELAY_MIN: 2000, // Minimum germination delay (2 seconds)
            GERMINATION_DELAY_MAX: 4000 // Maximum germination delay (4 seconds)
        };
        
        // Track fry that have recently laid eggs
        this.recentLaying = new Map(); // fryId -> { lastLayTime }
        
        // Track pending eggs that are "germinating"
        this.pendingEggs = []; // Array of { fry, gameEntities, eggCount, positions, germinationTime }
        
        console.log('🥚 FryEggLayingSystem initialized - Clean implementation with germination delay');
    }
    
    /**
     * Process all fry for egg laying and handle germinating eggs
     * @param {Array} allFry - Array of all fry entities
     * @param {Object} gameEntities - Game entities system
     */
    processAllFry(allFry, gameEntities) {
        // Process pending eggs that are ready to germinate
        this.processPendingEggs(gameEntities);
        
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
        
        // CRITICAL FIX: Check if fry is already in egg laying process (germination delay)
        // This prevents multiple egg laying attempts during the 2-second delay
        if (fry.isLayingEggs) {
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
                // CRITICAL FIX: Set flag immediately to prevent multiple attempts during germination
                fry.isLayingEggs = true;
                
                this.startEggGermination(fry, gameEntities);
                
                // Set cooldown for this fry
                this.recentLaying.set(fryId, {
                    lastLayTime: now
                });
                
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('EGG_LAYING', `Fry ${fry.fishType} started egg germination and got cooldown`);
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
     * Start the egg germination process with a delay
     * @param {Object} fry - The fry starting egg germination
     * @param {Object} gameEntities - Game entities system
     */
    startEggGermination(fry, gameEntities) {
        if (!gameEntities || !gameEntities.fishEggs || !window.FishEgg) {
            console.warn('🐟 Cannot start egg germination - missing dependencies');
            return;
        }
        
        // Random number of eggs to lay (changed to 1-4 as user expects)
        const eggCount = this.config.EGG_COUNT_MIN + Math.floor(Math.random() * (this.config.EGG_COUNT_MAX - this.config.EGG_COUNT_MIN + 1));
        
        // Calculate random germination delay (2-4 seconds)
        const germinationDelay = this.config.GERMINATION_DELAY_MIN + 
            Math.random() * (this.config.GERMINATION_DELAY_MAX - this.config.GERMINATION_DELAY_MIN);
        const germinationTime = Date.now() + germinationDelay;
        
        // Store reference to fry instead of pre-calculating positions
        // This way we use the fry's CURRENT position when eggs are actually created
        this.pendingEggs.push({
            fry: fry,
            gameEntities: gameEntities,
            eggCount: eggCount,
            germinationTime: germinationTime
        });
        
        console.log(`🐟 Fry ${fry.fishType} starting germination for ${eggCount} eggs (delay: ${Math.round(germinationDelay)}ms)`);
        
        // Change fry state from feeding to foraging immediately
        fry.behaviorState = 'foraging';
        
        // CRITICAL FIX: Reset feeding timer to prevent timer/state conflicts
        // When we interrupt feeding state for egg laying, we must reset the timer
        // to prevent it from interfering with future feeding behavior
        if (fry.feedingTimer !== undefined) {
            fry.feedingTimer = 0;
        }
        
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('EGG_LAYING', `Fry ${fry.fishType} started germination for ${eggCount} eggs and returned to foraging state`);
        }
    }
    
    /**
     * Process pending eggs and create them when germination time is reached
     * @param {Object} gameEntities - Game entities system
     */
    processPendingEggs(gameEntities) {
        const now = Date.now();
        
        // Process eggs in reverse order so we can safely remove them
        for (let i = this.pendingEggs.length - 1; i >= 0; i--) {
            const pendingEgg = this.pendingEggs[i];
            
            // Check if germination time has been reached
            if (now >= pendingEgg.germinationTime) {
                this.createEggsFromGermination(pendingEgg);
                this.pendingEggs.splice(i, 1); // Remove from pending list
            }
        }
    }
    
    /**
     * Create eggs from a completed germination process
     * @param {Object} pendingEgg - The pending egg data
     */
    createEggsFromGermination(pendingEgg) {
        const { fry, gameEntities, eggCount } = pendingEgg;
        
        if (!gameEntities || !gameEntities.fishEggs || !window.FishEgg) {
            console.warn('🐟 Cannot create eggs from germination - missing dependencies');
            // CRITICAL FIX: Clear laying flag even if creation fails
            fry.isLayingEggs = false;
            return;
        }
        
        console.log(`🥚 Germination complete! Creating ${eggCount} eggs for fry ${fry.fishType} at current position (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
        
        for (let i = 0; i < eggCount; i++) {
            // Calculate position based on fry's CURRENT position (not old pre-calculated position)
            const eggX = fry.x + (Math.random() - 0.5) * 20;
            const eggY = fry.y + (Math.random() - 0.5) * 20;
            
            // Create unfertilized fish egg
            const newEgg = new window.FishEgg(eggX, eggY);
            gameEntities.fishEggs.push(newEgg);
            
            console.log(`🥚 Created fish egg ${i+1}/${eggCount} at (${eggX.toFixed(1)}, ${eggY.toFixed(1)})`);
            
            // Create visual effect (bubbles)
            if (window.ObjectPools) {
                for (let j = 0; j < 2; j++) {
                    window.ObjectPools.getEatingBubble(
                        eggX + (Math.random() - 0.5) * 10,
                        eggY + (Math.random() - 0.5) * 10
                    );
                }
            }
        }
        
        // CRITICAL FIX: Clear the laying flag after eggs are created
        // This allows the fry to lay eggs again after the full cooldown period
        fry.isLayingEggs = false;
        
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('EGG_LAYING', `Germination completed: ${eggCount} eggs created for fry ${fry.fishType} at current position`);
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
     * Clean up old cooldown entries and stuck laying flags
     */
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - this.config.EGG_LAYING_COOLDOWN * 2;
        
        for (let [fryId, cooldown] of this.recentLaying.entries()) {
            if (cooldown.lastLayTime < cutoffTime) {
                this.recentLaying.delete(fryId);
            }
        }
        
        // SAFETY: Clear any stuck laying flags from pending eggs that might be orphaned
        // This prevents edge cases where fry might get permanently stuck with isLayingEggs=true
        for (let pendingEgg of this.pendingEggs) {
            if (pendingEgg.fry && pendingEgg.fry.isLayingEggs === undefined) {
                // If the laying flag somehow got cleared but egg is still pending, that's OK
                // If the egg is very old (>10 seconds), clear the flag as safety measure
                if (now - pendingEgg.germinationTime > 10000) {
                    if (pendingEgg.fry.isLayingEggs) {
                        console.warn(`🐟 Safety cleanup: clearing stuck laying flag for fry ${pendingEgg.fry.fishType}`);
                        pendingEgg.fry.isLayingEggs = false;
                    }
                }
            }
        }
    }
}

// Export the class constructor for global access
if (typeof window !== 'undefined') {
    window.FryEggLayingSystem = FryEggLayingSystem;
} 