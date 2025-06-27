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
        tuna.restingSpot = null;
        return tuna;
    }

    updateState(tuna, gameEntities) {
        if (!tuna.aiState) this.initializeTuna(tuna);
        tuna.aiTimer++;
        tuna.targetSwitchTimer = Math.max(0, tuna.targetSwitchTimer - 1);
        this.updateAlertness(tuna);
        
        // Delegate to main controller for state handling
        if (this.controller) {
            switch (tuna.aiState) {
                case window.TUNA_STATES.PATROLLING:
                    this.controller.handlePatrolling(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.HUNTING:
                    this.controller.handleHunting(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.ATTACKING:
                    this.controller.handleAttacking(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.FEEDING:
                    this.controller.handleFeeding(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.RESTING:
                    this.controller.handleResting(tuna, gameEntities);
                    break;
                case window.TUNA_STATES.FLEEING:
                    this.controller.handleFleeing(tuna, gameEntities);
                    break;
            }
        }
    }

    updateAlertness(tuna) {
        const energyFactor = tuna.energy / 100;
        const timeFactor = Math.sin(tuna.aiTimer * 0.001) * 0.1;
        tuna.alertness = Math.max(0.1, Math.min(1.0, energyFactor * 0.7 + (tuna.huntSuccess / 10) * 0.2 + timeFactor));
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