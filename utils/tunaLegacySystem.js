// Tuna Legacy System - Legacy fallback methods for tuna
// Handles legacy hunting, eating, and update methods when AI system is not available

class TunaLegacySystem {
    constructor() {
        // Safety check for config
        this.config = window.TUNA_CONFIG || {};
        console.log('🔄 TunaLegacySystem loaded successfully');
    }

    /**
     * Legacy hunt method - fallback when AI system is not available
     * @param {Object} tuna - The tuna entity
     * @param {Array} prey - Array of prey entities
     * @param {Array} krill - Array of krill entities
     */
    legacyHunt(tuna, prey, krill = []) {
        const allPrey = [...prey, ...krill];
        let closest = null;
        let closestDist = Infinity;

        for (let p of allPrey) {
            if (window.Utils && !window.Utils.shouldIgnorePrey(tuna.tunaType, p.fishType)) {
                const d = window.Utils.distance(tuna, p);
                if (d < 150 && d < closestDist) {
                    closest = p;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            // Predict where the prey will be
            const predictionTime = closestDist / tuna.maxSpeed;
            const futureX = closest.x + closest.velocity.x * predictionTime;
            const futureY = closest.y + closest.velocity.y * predictionTime;
            
            // Create target object for steering calculation
            const target = { x: futureX, y: futureY };
            const pursue = window.Utils.calculateSteering(tuna, target, tuna.maxSpeed, tuna.maxForce);
            tuna.applyForce({
                x: pursue.x * tuna.aggression * 2,
                y: pursue.y * tuna.aggression * 2
            });
        }
    }

    /**
     * Legacy food checking - fallback when AI system is not available
     * @param {Object} tuna - The tuna entity
     * @param {Array} prey - Array of prey entities
     * @param {Array} krill - Array of krill entities
     */
    legacyCheckForFood(tuna, prey, krill = []) {
        if (tuna.huntCooldown > 0) {
            tuna.huntCooldown--;
            return;
        }

        const gameEntities = window.gameEntities;
        if (!gameEntities) return;
        
        // Check all prey types
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' }
        ];
        
        for (let preyGroup of preyArrays) {
            for (let i = preyGroup.array.length - 1; i >= 0; i--) {
                const p = preyGroup.array[i];
                if (window.Utils && !window.Utils.shouldIgnorePrey(tuna.tunaType, p.fishType)) {
                    const d = window.Utils.distance(tuna, p);
                    if (d < 30) {
                        // Remove the prey from the correct array
                        preyGroup.array.splice(i, 1);
                        
                        // Start tuna pooping sequence using the pooping system
                        if (window.gameEntities && window.gameEntities.tunaPoopingSystem) {
                            window.gameEntities.tunaPoopingSystem.startPooping(tuna, window.gameEntities);
                        } else if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                            // Fallback to single poop if system not available
                            window.gameEntities.poop.push(new window.Poop(tuna.x, tuna.y, 'tuna'));
                        }
                        
                        // Create multiple eating bubbles
                        if (window.ObjectPools) {
                            for (let j = 0; j < 3; j++) {
                                window.ObjectPools.getEatingBubble(
                                    tuna.x + (Math.random() - 0.5) * 20,
                                    tuna.y + (Math.random() - 0.5) * 20
                                );
                            }
                        }
                        
                        tuna.energy = Math.min(100, tuna.energy + 25);
                        tuna.huntCooldown = 180; // 3 second cooldown
                        return; // Exit after eating one prey
                    }
                }
            }
        }
    }

    /**
     * Legacy update method - fallback when AI system is not available
     * @param {Object} tuna - The tuna entity
     * @param {Array} prey - Array of prey entities
     * @param {Array} krill - Array of krill entities
     * @param {Array} squid - Array of squid entities
     */
    legacyUpdate(tuna, prey, krill, squid) {
        this.legacyHunt(tuna, prey, krill);
        this.legacyCheckForFood(tuna, prey, krill);
        
        // Wander behavior when not hunting
        if (!tuna.isHunting) {
            tuna.currentPatience = (tuna.currentPatience || 100) - 1;
            if (tuna.currentPatience <= 0) {
                // Random wander
                const wanderForce = {
                    x: (Math.random() - 0.5) * tuna.maxForce * 0.5,
                    y: (Math.random() - 0.5) * tuna.maxForce * 0.5
                };
                tuna.applyForce(wanderForce);
                tuna.currentPatience = 100;
            }
        }
        
        // Depth preference
        const depthDifference = tuna.y - tuna.preferredDepth;
        if (Math.abs(depthDifference) > tuna.depthTolerance) {
            const depthForce = -depthDifference * 0.0001;
            tuna.applyForce({ x: 0, y: depthForce * tuna.maxForce });
        }
    }

    /**
     * Fallback eating system for when AI system misses prey
     * @param {Object} tuna - The tuna entity
     */
    fallbackEating(tuna) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return;
        
        const eatRadius = 45; // Slightly larger than AI attack radius
        const eatRadiusSquared = eatRadius * eatRadius;
        
        // Check all prey types
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' }
        ];
        
        for (let preyGroup of preyArrays) {
            for (let i = preyGroup.array.length - 1; i >= 0; i--) {
                const p = preyGroup.array[i];
                if (window.Utils && !window.Utils.shouldIgnorePrey(tuna.tunaType, p.fishType)) {
                    const distSquared = window.Utils.distanceSquared(tuna, p);
                    if (distSquared < eatRadiusSquared) {
                        // Debug log fallback eating
                        if (window.gameState && window.gameState.tunaDebug) {
                            console.log(`🍽️ Fallback eating: Tuna ate ${preyGroup.name} at distance ${Math.sqrt(distSquared).toFixed(1)}`);
                        }
                        
                        // Remove the prey from the correct array
                        preyGroup.array.splice(i, 1);
                        
                        // Start tuna pooping sequence using the pooping system
                        if (window.gameEntities && window.gameEntities.tunaPoopingSystem) {
                            window.gameEntities.tunaPoopingSystem.startPooping(tuna, window.gameEntities);
                        } else if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                            // Fallback to single poop if system not available
                            window.gameEntities.poop.push(new window.Poop(tuna.x, tuna.y, 'tuna'));
                        }
                        
                        // Create multiple eating bubbles
                        if (window.ObjectPools) {
                            for (let j = 0; j < 3; j++) {
                                window.ObjectPools.getEatingBubble(
                                    tuna.x + (Math.random() - 0.5) * 20,
                                    tuna.y + (Math.random() - 0.5) * 20
                                );
                            }
                        }
                        
                        // Restore energy and set cooldown
                        tuna.energy = Math.min(100, tuna.energy + 25);
                        tuna.huntCooldown = 180; // 3 second cooldown
                        
                        // Transition to feeding state
                        if (window.TunaAI) {
                            window.TunaAI.transitionToState(tuna, window.TunaAI.states.FEEDING);
                        }
                        
                        return; // Exit after eating one prey
                    }
                }
            }
        }
    }

    /**
     * Check if legacy system should be used
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if legacy system should be used
     */
    shouldUseLegacySystem(tuna) {
        return !window.TunaAI || !window.gameEntities;
    }

    /**
     * Initialize legacy system for a tuna
     * @param {Object} tuna - The tuna entity
     */
    initializeLegacySystem(tuna) {
        tuna.currentPatience = 100;
        tuna.isHunting = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaLegacySystem = TunaLegacySystem;
} 