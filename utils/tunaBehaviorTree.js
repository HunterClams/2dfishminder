// Tuna Behavior Tree - State machine and decision logic for tuna AI
// Handles state transitions, target selection, and high-level decisions

class TunaBehaviorTree {
    constructor() {
        this.controller = null; // Will be set by the main controller
    }

    // Set the main controller reference
    setController(controller) {
        this.controller = controller;
    }

    initializeTuna(tuna) {
        tuna.aiState = window.TUNA_STATES.PATROLLING;
        tuna.aiTarget = null;
        tuna.aiTimer = 0;
        tuna.lastStateChange = 0;
        tuna.targetSwitchTimer = 0;
        tuna.wanderTarget = null;
        tuna.alertness = 0.5;
        tuna.huntSuccess = 0;
        tuna.lastAttackTime = 0;
        // REMOVED: restingSpot - no longer needed without resting state
        
        // CRITICAL FIX: Initialize proper velocity for smooth movement
        // Tuna maxSpeed = 3, so set initial velocity to ~70% of max speed for natural patrolling
        const initialSpeed = tuna.maxSpeed * 0.7; // 2.1 speed (was -2 to +2 random)
        const initialDirection = Math.random() * Math.PI * 2;
        tuna.velocity = {
            x: Math.cos(initialDirection) * initialSpeed,
            y: Math.sin(initialDirection) * initialSpeed
        };
        
        // Initialize patrol direction to match initial movement
        tuna.patrolDirection = initialDirection;
        
        // Set current speed boost for consistent movement
        tuna.currentSpeedBoost = 1.0;
        
        // Debug logging
        if (window.gameState && window.gameState.tunaDebug) {
            console.log(`🐟 Tuna initialized with velocity (${Math.round(tuna.velocity.x * 100) / 100}, ${Math.round(tuna.velocity.y * 100) / 100}), speed: ${Math.round(initialSpeed * 100) / 100}`);
        }
        
        return tuna;
    }

    updateState(tuna, gameEntities) {
        if (!tuna.aiState) this.initializeTuna(tuna);
        tuna.aiTimer++;
        tuna.targetSwitchTimer = Math.max(0, tuna.targetSwitchTimer - 1);
        this.updateAlertness(tuna);
        
        // Check for threats FIRST - FLEEING overrides all other states
        const threats = this.controller ? this.controller.findThreats(tuna, gameEntities) : [];
        if (threats.length > 0 && tuna.aiState !== window.TUNA_STATES.FLEEING) {
            this.controller.transitionToState(tuna, window.TUNA_STATES.FLEEING);
        }
        
        // Delegate to main controller for state handling
        if (this.controller) {
            switch (tuna.aiState) {
                case window.TUNA_STATES.PATROLLING:
                    this.controller.handlePatrolling(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.HUNTING:
                    this.controller.handleHunting(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.FEEDING:
                    this.controller.handleFeeding(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.FLEEING:
                    this.controller.handleFleeing(tuna, gameEntities);
                    break;
            }
        }
    }

    updateAlertness(tuna) {
        const timeFactor = Math.sin(tuna.aiTimer * 0.001) * 0.1;
        tuna.alertness = Math.max(0.5, Math.min(1.0, 0.7 + (tuna.huntSuccess / 10) * 0.2 + timeFactor));
    }

    // Target selection helpers (to be filled in or delegated)
    findNearbyPrey(tuna, gameEntities, radius) { return []; }
    selectBestTarget(tuna, nearbyPrey) { return null; }
    selectBetterTarget(tuna, currentTarget, nearbyPrey) { return null; }
    isValidTarget(target) { return target && typeof target.x === 'number' && typeof target.y === 'number'; }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaBehaviorTree = TunaBehaviorTree;
} 