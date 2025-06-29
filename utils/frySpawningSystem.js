// Fry Spawning System - Comprehensive spawning state management
// Handles fry detecting unfertilized eggs, entering spawning state, and proper cooldowns

class FrySpawningSystem {
    constructor() {
        this.config = {
            // Detection ranges
            LONG_DETECTION_RANGE: 1000, // Range for feeding fry to detect unfertilized eggs
            CLOSE_DETECTION_RANGE: 100, // Range for spawning fry to detect eggs for fertilization
            FERTILIZATION_RANGE: 30, // Range for sperm to fertilize eggs
            
            // Timing
            SPAWNING_DURATION: 5000, // 5 seconds in spawning state
            SPAWNING_COOLDOWN: 15000, // 15 seconds cooldown before can spawn again
            
            // Sperm spawning
            SPERM_SPAWN_RATE: 0.1, // 10% chance per frame to spawn sperm
            SPERM_COUNT: 3, // Exactly 3 sperm per spawning attempt
            
            // State management
            VALID_STATES: ['feeding', 'spawning', 'foraging'],
            SPAWNING_STATE: 'spawning',
            COOLDOWN_STATE: 'spawning_cooldown',
            
            // Positioning
            EGG_OFFSET_Y: 10, // Fry swims to 10px above the egg
            SPAWN_DISTANCE: 10 // Spawn sperm when within 10px of egg's actual position
        };
        
        // Track fry spawning cooldowns
        this.spawningCooldowns = new Map(); // fryId -> { startTime, endTime }
        
        console.log('🐟 FrySpawningSystem initialized');
    }
    
    /**
     * Process all fry for spawning state management
     * @param {Array} allFry - Array of all fry entities
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    processAllFry(allFry, fishEggs, gameEntities) {
        // Debug: Log egg count and fry count
        if (window.gameState?.frySpawningDebug) {
            const regularFryCount = allFry.filter(f => f.fishType !== 'truefry1' && f.fishType !== 'truefry2').length;
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `${regularFryCount} regular fry, ${fishEggs.length} fish eggs`);
            } else {
                console.log(`🐟 FrySpawningSystem: ${regularFryCount} regular fry, ${fishEggs.length} fish eggs`);
            }
        }
        
        for (let fry of allFry) {
            // Skip TrueFry1 and TrueFry2 - they don't participate in spawning/fertilization
            if (fry.fishType === 'truefry1' || fry.fishType === 'truefry2') {
                continue;
            }
            
            // Initialize fry spawning properties if not present
            this.initializeFrySpawning(fry);
            
            // Check spawning cooldown
            this.updateSpawningCooldown(fry);
            
            // Only process fry that are not in cooldown
            if (fry.behaviorState === this.config.COOLDOWN_STATE) {
                continue;
            }
            
            // Check if feeding fry should detect unfertilized eggs and enter spawning
            this.checkForLongRangeEggDetection(fry, fishEggs);
            
            // Process fry already in spawning state
            this.processSpawningFry(fry, fishEggs, gameEntities);
        }
        
        // Clean up old cooldown entries
        this.cleanupCooldowns();
    }
    
    /**
     * Initialize fry spawning properties
     * @param {Object} fry - The fry entity
     */
    initializeFrySpawning(fry) {
        // Don't initialize spawning properties for TrueFry1 and TrueFry2
        if (fry.fishType === 'truefry1' || fry.fishType === 'truefry2') {
            return;
        }
        
        if (!fry.spawningProperties) {
            fry.spawningProperties = {
                spawningTimer: 0,
                spawningTarget: null,
                lastSpawningTime: 0,
                canSpawn: true
            };
        }
    }
    
    /**
     * Check if feeding fry should detect unfertilized eggs at long range and enter spawning state
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     */
    checkForLongRangeEggDetection(fry, fishEggs) {
        // Only check feeding fry that can spawn and are not already in spawning state
        if (fry.behaviorState !== 'feeding' || !fry.spawningProperties.canSpawn) {
            if (window.gameState?.frySpawningDebug && fry.behaviorState === 'feeding') {
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('SPAWNING', `Fry ${fry.fishType} in feeding state but cannot spawn (canSpawn: ${fry.spawningProperties.canSpawn})`);
                } else {
                    console.log(`🐟 Fry ${fry.fishType} in feeding state but cannot spawn (canSpawn: ${fry.spawningProperties.canSpawn})`);
                }
            }
            return;
        }
        
        // Check for unfertilized fish eggs at long range
        const nearbyEggs = this.findFishEggsAtLongRange(fry, fishEggs);
        
        if (window.gameState?.frySpawningDebug) {
            if (nearbyEggs.length > 0) {
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('SPAWNING', `Fry ${fry.fishType} detected ${nearbyEggs.length} unfertilized fish eggs at long range (${this.config.LONG_DETECTION_RANGE}px)`);
                } else {
                    console.log(`🐟 Fry ${fry.fishType} detected ${nearbyEggs.length} unfertilized fish eggs at long range (${this.config.LONG_DETECTION_RANGE}px)`);
                }
            }
        }
        
        if (nearbyEggs.length > 0) {
            // Enter spawning state when unfertilized eggs are detected at long range
            this.enterSpawningState(fry, nearbyEggs[0]); // Target the first egg found
            
            if (window.gameState?.frySpawningDebug) {
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('SPAWNING', `Feeding fry ${fry.fishType} detected ${nearbyEggs.length} unfertilized fish eggs at long range (${this.config.LONG_DETECTION_RANGE}px) and entered spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
                } else {
                    console.log(`🐟 Feeding fry ${fry.fishType} detected ${nearbyEggs.length} unfertilized fish eggs at long range (${this.config.LONG_DETECTION_RANGE}px) and entered spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
                }
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
            if (egg.eaten) continue;
            
            const distance = Math.sqrt((fry.x - egg.x) ** 2 + (fry.y - egg.y) ** 2);
            
            if (distance < this.config.LONG_DETECTION_RANGE) {
                nearbyEggs.push(egg);
            }
        }
        
        return nearbyEggs;
    }
    
    /**
     * Enter spawning state for a fry
     * @param {Object} fry - The fry entity
     * @param {Object} targetEgg - The target egg to fertilize
     */
    enterSpawningState(fry, targetEgg) {
        fry.behaviorState = this.config.SPAWNING_STATE;
        fry.spawningProperties.spawningTimer = 0;
        fry.spawningProperties.spawningTarget = targetEgg;
        fry.spawningProperties.canSpawn = false;
        
        if (window.gameState?.frySpawningDebug) {
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `Fry entered spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) targeting egg at (${targetEgg.x.toFixed(1)}, ${targetEgg.y.toFixed(1)})`);
            } else {
                console.log(`🐟 Fry entered spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) targeting egg at (${targetEgg.x.toFixed(1)}, ${targetEgg.y.toFixed(1)})`);
            }
        }
    }
    
    /**
     * Process fry in spawning state
     * @param {Object} fry - The fry entity
     * @param {Array} fishEggs - Array of all unfertilized fish eggs
     * @param {Object} gameEntities - Game entities system
     */
    processSpawningFry(fry, fishEggs, gameEntities) {
        if (fry.behaviorState !== this.config.SPAWNING_STATE) {
            return;
        }
        
        // Get the target egg
        const targetEgg = fry.spawningProperties.spawningTarget;
        
        if (!targetEgg || targetEgg.eaten) {
            // Target egg is gone, end spawning state
            this.endSpawningState(fry);
            return;
        }
        
        // Calculate distance to target egg's actual position
        const distanceToEgg = Math.sqrt((fry.x - targetEgg.x) ** 2 + (fry.y - targetEgg.y) ** 2);
        
        // Swim towards the egg and position above it
        if (distanceToEgg > this.config.SPAWN_DISTANCE) {
            // Swim towards the egg (thinking it's 10px higher than it actually is)
            this.swimTowardsEgg(fry, targetEgg);
            
            if (window.gameState?.frySpawningDebug) {
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('SPAWNING', `Fry swimming towards egg at (${targetEgg.x.toFixed(1)}, ${targetEgg.y.toFixed(1)}) - distance: ${distanceToEgg.toFixed(1)}px`);
                } else {
                    console.log(`🐟 Fry swimming towards egg at (${targetEgg.x.toFixed(1)}, ${targetEgg.y.toFixed(1)}) - distance: ${distanceToEgg.toFixed(1)}px`);
                }
            }
        } else {
            // Fry is within 10px of the egg's actual position - spawn sperm immediately
            this.spawnSperm(fry, [targetEgg], gameEntities);
            
            if (window.gameState?.frySpawningDebug) {
                if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                    window.ConsoleDebugSystem.log('SPAWNING', `Fry within ${this.config.SPAWN_DISTANCE}px of egg, spawning sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) - distance: ${distanceToEgg.toFixed(1)}px`);
                } else {
                    console.log(`🐟 Fry within ${this.config.SPAWN_DISTANCE}px of egg, spawning sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) - distance: ${distanceToEgg.toFixed(1)}px`);
                }
            }
        }
    }
    
    /**
     * Swim towards the target egg using hunting behavior with 10px offset
     * @param {Object} fry - The fry entity
     * @param {Object} targetEgg - The target egg to swim towards
     */
    swimTowardsEgg(fry, targetEgg) {
        // Create offset target 10px above the egg (fry thinks egg is higher than it actually is)
        const offsetTarget = {
            x: targetEgg.x,
            y: targetEgg.y - this.config.EGG_OFFSET_Y // 10px above the egg
        };
        
        // Use hunting behavior steering calculation
        if (window.Utils && window.Utils.calculateSteering) {
            const huntForce = window.Utils.calculateSteering(
                fry, 
                offsetTarget, 
                fry.maxSpeed || 3.0,
                fry.maxForce || 0.1
            );
            
            // Apply hunting force
            fry.velocity.x += huntForce.x * 0.8;
            fry.velocity.y += huntForce.y * 0.8;
        } else {
            // Fallback to basic steering if Utils not available
            const dx = offsetTarget.x - fry.x;
            const dy = offsetTarget.y - fry.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;
                
                const swimForce = 0.8;
                fry.velocity.x += normalizedDx * swimForce;
                fry.velocity.y += normalizedDy * swimForce;
            }
        }
        
        // Limit velocity to prevent overshooting
        const maxSpeed = fry.maxSpeed || 3.0;
        const currentSpeed = Math.sqrt(fry.velocity.x * fry.velocity.x + fry.velocity.y * fry.velocity.y);
        
        if (currentSpeed > maxSpeed) {
            fry.velocity.x = (fry.velocity.x / currentSpeed) * maxSpeed;
            fry.velocity.y = (fry.velocity.y / currentSpeed) * maxSpeed;
        }
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
        
        // Always spawn exactly 3 sperm (as specified by user)
        const spermCount = this.config.SPERM_COUNT;
        
        console.log(`🐟 Fry ${fry.fishType} spawning exactly ${spermCount} sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)})`);
        
        // Spawn exactly 3 sperm particles
        for (let i = 0; i < spermCount; i++) {
            // Spawn sperm directly below the fry (since fry is positioned above the egg)
            const spawnX = fry.x + (Math.random() - 0.5) * 10; // Small horizontal spread
            const spawnY = fry.y + 5 + (Math.random() - 0.5) * 5; // Spawn below fry, falling down
            
            // Create sperm
            const newSperm = new window.Sperm(spawnX, spawnY);
            
            // Give sperm downward velocity to fall toward the egg
            if (newSperm.velocity) {
                newSperm.velocity.y = 1.0 + Math.random() * 0.5; // Fall down at 1-1.5 speed
                newSperm.velocity.x = (Math.random() - 0.5) * 0.3; // Small horizontal drift
            }
            
            gameEntities.sperm.push(newSperm);
            
            console.log(`🐟 Created sperm ${i+1}/${spermCount} at (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) - total sperm: ${gameEntities.sperm.length}`);
            
            // Create visual effect (bubbles)
            if (window.ObjectPools) {
                window.ObjectPools.getEatingBubble(spawnX, spawnY);
            }
        }
        
        if (window.gameState?.frySpawningDebug) {
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `Fry spawned exactly ${spermCount} sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) - sperm falling down toward egg`);
            } else {
                console.log(`🐟 Fry spawned exactly ${spermCount} sperm at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) - sperm falling down toward egg`);
            }
        }
        
        // End spawning state immediately after spawning sperm
        this.endSpawningState(fry);
    }
    
    /**
     * End spawning state and start cooldown
     * @param {Object} fry - The fry to end spawning state for
     */
    endSpawningState(fry) {
        // Start spawning cooldown
        this.startSpawningCooldown(fry);
        
        // Reset spawning properties
        fry.spawningProperties.spawningTimer = 0;
        fry.spawningProperties.spawningTarget = null;
        
        if (window.gameState?.frySpawningDebug) {
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `Fry ended spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) and entered cooldown`);
            } else {
                console.log(`🐟 Fry ended spawning state at (${fry.x.toFixed(1)}, ${fry.y.toFixed(1)}) and entered cooldown`);
            }
        }
    }
    
    /**
     * Start spawning cooldown for a fry
     * @param {Object} fry - The fry entity
     */
    startSpawningCooldown(fry) {
        const fryId = this.getFryId(fry);
        const now = Date.now();
        const endTime = now + this.config.SPAWNING_COOLDOWN;
        
        // Set cooldown tracking
        this.spawningCooldowns.set(fryId, {
            startTime: now,
            endTime: endTime,
            fry: fry
        });
        
        // Set fry to cooldown state
        fry.behaviorState = this.config.COOLDOWN_STATE;
        fry.spawningProperties.canSpawn = false;
        
        if (window.gameState?.frySpawningDebug) {
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `⏰ Fry ${fryId} entered spawning cooldown for ${this.config.SPAWNING_COOLDOWN/1000}s`);
            } else {
                console.log(`⏰ Fry ${fryId} entered spawning cooldown for ${this.config.SPAWNING_COOLDOWN/1000}s`);
            }
        }
    }
    
    /**
     * Update spawning cooldown for a fry
     * @param {Object} fry - The fry entity
     */
    updateSpawningCooldown(fry) {
        if (fry.behaviorState !== this.config.COOLDOWN_STATE) {
            return;
        }
        
        const fryId = this.getFryId(fry);
        const cooldown = this.spawningCooldowns.get(fryId);
        
        if (cooldown && Date.now() >= cooldown.endTime) {
            this.endSpawningCooldown(fry);
        }
    }
    
    /**
     * End spawning cooldown for a fry
     * @param {Object} fry - The fry entity
     */
    endSpawningCooldown(fry) {
        const fryId = this.getFryId(fry);
        
        // Remove from cooldown tracking
        this.spawningCooldowns.delete(fryId);
        
        // Reset fry state to foraging
        fry.behaviorState = 'foraging';
        fry.spawningProperties.canSpawn = true;
        fry.spawningProperties.lastSpawningTime = Date.now();
        
        if (window.gameState?.frySpawningDebug) {
            if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
                window.ConsoleDebugSystem.log('SPAWNING', `⏰ Fry ${fryId} spawning cooldown ended, returning to foraging`);
            } else {
                console.log(`⏰ Fry ${fryId} spawning cooldown ended, returning to foraging`);
            }
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
    cleanupCooldowns() {
        const now = Date.now();
        const cutoffTime = now - this.config.SPAWNING_COOLDOWN * 2; // Remove entries older than 2x cooldown
        
        for (let [fryId, cooldown] of this.spawningCooldowns.entries()) {
            if (cooldown.startTime < cutoffTime) {
                this.spawningCooldowns.delete(fryId);
            }
        }
    }
    
    /**
     * Get spawning statistics for debugging
     * @param {Array} allFry - Array of all fry entities
     * @returns {Object} Spawning statistics
     */
    getSpawningStats(allFry) {
        const stats = {
            totalFry: 0,
            inSpawningState: 0,
            inCooldown: 0,
            canSpawn: 0,
            cooldownEntries: this.spawningCooldowns.size
        };
        
        for (let fry of allFry) {
            if (fry.fishType === 'truefry1' || fry.fishType === 'truefry2') {
                continue;
            }
            
            stats.totalFry++;
            
            if (fry.behaviorState === this.config.SPAWNING_STATE) {
                stats.inSpawningState++;
            } else if (fry.behaviorState === this.config.COOLDOWN_STATE) {
                stats.inCooldown++;
            }
            
            if (fry.spawningProperties && fry.spawningProperties.canSpawn) {
                stats.canSpawn++;
            }
        }
        
        return stats;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FrySpawningSystem = FrySpawningSystem;
}
