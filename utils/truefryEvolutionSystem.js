// TrueFry Evolution System - Modular system for truefry to evolve through stages
class TrueFryEvolutionSystem {
    constructor() {
        this.config = {
            // Stage 1: TrueFry1 (initial stage)
            STAGE_1: {
                duration: 7000, // 7 seconds to evolve to stage 2
                sprite: 'truefry1',
                name: 'TrueFry1',
                feedingTrigger: true // Can evolve by eating too
            },
            
            // Stage 2: TrueFry2 (intermediate stage)
            STAGE_2: {
                duration: 10000, // 10 seconds to evolve to fry, OR eat something
                sprite: 'truefry2',
                name: 'TrueFry2',
                feedingTrigger: true // Can evolve by eating
            },
            
            // Stage 3: Regular Fry (final stage)
            STAGE_3: {
                sprite: 'smallFry2', // Use existing fry sprite
                name: 'Fry'
            },
            
            DEBUG: true
        };
        
        console.log('🐟 TrueFryEvolutionSystem initialized');
    }
    
    /**
     * Check if truefry should evolve to next stage
     * @param {Object} truefry - The truefry entity
     * @param {Object} gameEntities - Game entities system
     */
    checkForEvolution(truefry, gameEntities) {
        if (!truefry || !gameEntities) {
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 Evolution check: Missing parameters - truefry: ${!!truefry}, gameEntities: ${!!gameEntities}`);
            }
            return;
        }
        
        // Initialize evolution properties if not present
        if (!truefry.evolutionStage) {
            truefry.evolutionStage = 1;
            truefry.evolutionTimer = 0;
            truefry.evolutionSprite = this.config.STAGE_1.sprite;
            truefry.evolutionName = this.config.STAGE_1.name;
            truefry.hasEatenThisStage = false;
            
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 TrueFry initialized at stage ${truefry.evolutionStage}`);
            }
        }
        
        // Update evolution timer
        truefry.evolutionTimer += 16; // Approximate frame time
        
        // Check for evolution based on current stage
        switch (truefry.evolutionStage) {
            case 1:
                this.checkStage1Evolution(truefry, gameEntities);
                break;
            case 2:
                this.checkStage2Evolution(truefry, gameEntities);
                break;
            default:
                // Already evolved to fry, no more evolution
                break;
        }
    }
    
    /**
     * Check if TrueFry1 should evolve to TrueFry2
     * @param {Object} truefry - The truefry entity
     * @param {Object} gameEntities - Game entities system
     */
    checkStage1Evolution(truefry, gameEntities) {
        const stageConfig = this.config.STAGE_1;
        
        // Debug logging
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            const progress = (truefry.evolutionTimer / stageConfig.duration * 100).toFixed(1);
            if (truefry.evolutionTimer % 1000 < 16) { // Log once per second
                console.log(`🐟 TrueFry1 at (${truefry.x.toFixed(1)}, ${truefry.y.toFixed(1)}) - ${progress}% evolved (${truefry.evolutionTimer}/${stageConfig.duration}ms) - Has eaten: ${truefry.hasEatenThisStage}`);
            }
        }
        
        // Check if time-based evolution is complete OR if it has eaten something
        if (truefry.evolutionTimer >= stageConfig.duration || truefry.hasEatenThisStage) {
            this.evolveToStage2(truefry, gameEntities);
        }
    }
    
    /**
     * Check if TrueFry2 should evolve to Fry
     * @param {Object} truefry - The truefry entity
     * @param {Object} gameEntities - Game entities system
     */
    checkStage2Evolution(truefry, gameEntities) {
        const stageConfig = this.config.STAGE_2;
        
        // Debug logging
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            const progress = (truefry.evolutionTimer / stageConfig.duration * 100).toFixed(1);
            if (truefry.evolutionTimer % 1000 < 16) { // Log once per second
                console.log(`🐟 TrueFry2 at (${truefry.x.toFixed(1)}, ${truefry.y.toFixed(1)}) - ${progress}% evolved (${truefry.evolutionTimer}/${stageConfig.duration}ms) - Has eaten: ${truefry.hasEatenThisStage}`);
            }
        }
        
        // Check if time-based evolution is complete OR if it has eaten something
        if (truefry.evolutionTimer >= stageConfig.duration || truefry.hasEatenThisStage) {
            this.evolveToFry(truefry, gameEntities);
        }
    }
    
    /**
     * Evolve TrueFry1 to TrueFry2
     * @param {Object} truefry - The truefry entity
     * @param {Object} gameEntities - Game entities system
     */
    evolveToStage2(truefry, gameEntities) {
        const stageConfig = this.config.STAGE_2;
        
        // Update evolution properties
        truefry.evolutionStage = 2;
        truefry.evolutionTimer = 0; // Reset timer for stage 2
        truefry.evolutionSprite = stageConfig.sprite;
        truefry.evolutionName = stageConfig.name;
        truefry.hasEatenThisStage = false;
        
        // Update sprite frames to use truefry2
        truefry.spriteFrames = [stageConfig.sprite, stageConfig.sprite, stageConfig.sprite, stageConfig.sprite];
        
        // Create evolution effect
        if (window.ObjectPools) {
            for (let i = 0; i < 4; i++) {
                window.ObjectPools.getEatingBubble(
                    truefry.x + (Math.random() - 0.5) * 20,
                    truefry.y + (Math.random() - 0.5) * 20
                );
            }
        }
        
        if (this.config.DEBUG || window.gameState?.fryDebug) {
            console.log(`🐟 TrueFry evolved to ${stageConfig.name} at (${truefry.x.toFixed(1)}, ${truefry.y.toFixed(1)})`);
        }
    }
    
    /**
     * Evolve TrueFry2 to regular Fry
     * @param {Object} truefry - The truefry entity
     * @param {Object} gameEntities - Game entities system
     */
    evolveToFry(truefry, gameEntities) {
        const stageConfig = this.config.STAGE_3;
        
        // Create new regular fry
        if (window.Boid) {
            const fryTypes = [window.FISH_TYPES.SMALL_FRY_2, window.FISH_TYPES.SMALL_FRY_3, window.FISH_TYPES.SMALL_FRY_4];
            const randomFryType = fryTypes[Math.floor(Math.random() * fryTypes.length)];
            
            const newFry = new window.Boid(randomFryType);
            newFry.x = truefry.x;
            newFry.y = truefry.y;
            newFry.velocity = { ...truefry.velocity };
            
            // Add to fish array
            gameEntities.fish.push(newFry);
            
            // Create evolution effect
            if (window.ObjectPools) {
                for (let i = 0; i < 6; i++) {
                    window.ObjectPools.getEatingBubble(
                        truefry.x + (Math.random() - 0.5) * 25,
                        truefry.y + (Math.random() - 0.5) * 25
                    );
                }
            }
            
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 TrueFry evolved to ${stageConfig.name} (${randomFryType}) at (${truefry.x.toFixed(1)}, ${truefry.y.toFixed(1)})`);
            }
        }
        
        // Remove the truefry from the fish array
        const truefryIndex = gameEntities.fish.indexOf(truefry);
        if (truefryIndex !== -1) {
            gameEntities.fish.splice(truefryIndex, 1);
        }
    }
    
    /**
     * Mark that truefry has eaten something (for evolution)
     * @param {Object} truefry - The truefry entity
     */
    markAsEaten(truefry) {
        if ((truefry.evolutionStage === 1 || truefry.evolutionStage === 2) && !truefry.hasEatenThisStage) {
            truefry.hasEatenThisStage = true;
            
            if (this.config.DEBUG || window.gameState?.fryDebug) {
                console.log(`🐟 TrueFry${truefry.evolutionStage} marked as eaten - ready to evolve`);
            }
        }
    }
    
    /**
     * Update evolution system for all truefry
     * @param {Array} fish - Array of all fish entities
     * @param {Object} gameEntities - Game entities system
     */
    update(fish, gameEntities) {
        // Find all truefry and check for evolution
        for (let fishEntity of fish) {
            if (fishEntity.fishType === 'truefry') {
                this.checkForEvolution(fishEntity, gameEntities);
            }
        }
    }
}

// Export for global access
window.TrueFryEvolutionSystem = TrueFryEvolutionSystem; 