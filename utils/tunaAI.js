// Modular Tuna AI System - Main controller
// Delegates config, behavior tree, and steering to separate modules

// Assumes tunaConfig.js, tunaBehaviorTree.js, and tunaSteeringForces.js are loaded first

class TunaAI {
    constructor() {
        this.states = window.TUNA_STATES;
        this.config = window.TUNA_CONFIG;
        this.behaviorTree = new window.TunaBehaviorTree();
        this.steeringForces = new window.TunaSteeringForces();
        
        // Set this controller as the delegate for the behavior tree
        this.behaviorTree.setController(this);
    }
    
    // Initialize AI for a tuna instance
    initializeTuna(tuna) {
        return this.behaviorTree.initializeTuna(tuna);
    }
    
    // Main AI update function
    updateAI(tuna, gameEntities) {
        // Update state machine
        this.behaviorTree.updateState(tuna, gameEntities);
        
        // Apply movement forces (including flocking if patrolling/feeding)
        this.steeringForces.applyMovementForces(tuna, gameEntities);
    }
    
    // PATROLLING: Horizontal-focused movement with quick scanning for prey
    handlePatrolling(tuna, gameEntities) {
        // Check if still in feeding cooldown (locked out of hunting)
        const timeSinceStateChange = tuna.aiTimer - tuna.lastStateChange;
        const canHunt = timeSinceStateChange > this.config.postFeedingCooldown;
        
        // Only search for prey if not in feeding cooldown
        if (canHunt) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities);
            
            if (nearbyPrey.length > 0) {
                const bestTarget = this.selectBestTarget(tuna, nearbyPrey);
                if (bestTarget) {
                    this.transitionToState(tuna, this.states.HUNTING, bestTarget);
                    return;
                }
            }
        }
        
        // Horizontal-focused patrolling with quick scanning (pass gameEntities for flocking integration)
        this.steeringForces.handleHorizontalPatrolling(tuna, gameEntities);
    }
    
    // HUNTING: Pursue prey and eat when close (no separate attacking state)
    handleHunting(tuna, gameEntities) {
        // Validate target
        if (!tuna.aiTarget || !this.isValidTarget(tuna.aiTarget) || !this.isTargetStillInGame(tuna.aiTarget, gameEntities)) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        // If close enough, attempt to eat directly (no separate attacking state)
        if (distToTarget < this.config.attackRadius) {
            if (window.gameState && window.gameState.tunaDebug) {
                console.log(`🎯 Tuna attempting to eat target at distance ${distToTarget.toFixed(1)} (radius: ${this.config.attackRadius})`);
            }
            
            if (this.steeringForces.attemptToEat(tuna, tuna.aiTarget, gameEntities)) {
                tuna.huntSuccess++;
                this.transitionToState(tuna, this.states.FEEDING);
                return;
            }
        }
        
        // Don't abandon target if we're close (within 2x attack radius)
        const closeToTarget = distToTarget < this.config.attackRadius * 2;
        
        // Abandon if target is too far (but not if we're close)
        if (!closeToTarget && distToTarget > this.config.huntRadius * 1.5) {
            tuna.huntSuccess = Math.max(0, tuna.huntSuccess - 1);
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        // Check for better targets if not close to current target
        if (tuna.targetSwitchTimer <= 0 && distToTarget > this.config.attackRadius * 2) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities);
            const betterTarget = this.selectBetterTarget(tuna, tuna.aiTarget, nearbyPrey);
            if (betterTarget && betterTarget !== tuna.aiTarget) {
                tuna.aiTarget = betterTarget;
                tuna.targetSwitchTimer = this.config.targetSwitchCooldown;
            }
        }
        
        // Apply hunting forces (pursue target)
        this.steeringForces.applyHuntingForces(tuna);
    }
    
    // FEEDING: Locked out of hunting state, uses same movement as patrolling
    handleFeeding(tuna, gameEntities) {
        const timeSinceFeeding = tuna.aiTimer - tuna.lastStateChange;
        
        // Feeding duration complete - return to patrolling
        if (timeSinceFeeding > this.config.feedingDuration) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        // Use same movement as patrolling (horizontal-focused movement, pass gameEntities for flocking)
        this.steeringForces.handleHorizontalPatrolling(tuna, gameEntities);
        
        // Note: Threats are checked in behavior tree updateState before this handler
        // So fleeing will override feeding automatically
    }
    
    // REMOVED: handleResting method - redundant state that caused poor tuna behavior
    // Tuna now use continuous patrolling for more natural predator behavior
    
    handleFleeing(tuna, gameEntities) {
        const threats = this.findThreats(tuna, gameEntities);
        
        if (threats.length === 0) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        this.steeringForces.applyFleeForces(tuna, threats);
    }
    
    // Target selection and utility methods - Prey detection with type-specific radii
    findNearbyPrey(tuna, gameEntities) {
        const nearbyPrey = [];
        const config = this.config;
        
        // Get detection radii from config (smaller = harder to see)
        const regularFryRadius = config.regularFryDetectionRadius || 300;
        const trueFryRadius = config.trueFryDetectionRadius || 200;
        const fertilizedEggRadius = config.fertilizedEggDetectionRadius || 120;
        const fishEggRadius = config.fishEggDetectionRadius || 80;
        
        // Check fish array for regular fry and truefry (different detection radii)
        for (let prey of (gameEntities.fish || [])) {
            const fishType = prey.fishType ? String(prey.fishType).toLowerCase() : '';
            const isTrueFry = fishType.includes('truefry') || prey.constructor.name === 'TrueFry1' || prey.constructor.name === 'TrueFry2';
            const isRegularFry = (fishType.includes('fry') || fishType.includes('smallfry')) && !isTrueFry;
            
            if (isRegularFry || isTrueFry) {
                const detectionRadius = isTrueFry ? trueFryRadius : regularFryRadius;
                const detectionRadiusSquared = detectionRadius * detectionRadius;
                const distSquared = window.Utils.distanceSquared(tuna, prey);
                
                if (distSquared < detectionRadiusSquared) {
                    nearbyPrey.push({
                        entity: prey,
                        distance: Math.sqrt(distSquared),
                        priority: this.calculatePreyPriority(tuna, prey, isTrueFry ? 'truefry' : 'regularFry')
                    });
                }
            }
        }
        
        // Check fertilized eggs (smaller detection radius)
        for (let prey of (gameEntities.fertilizedEggs || [])) {
            const detectionRadiusSquared = fertilizedEggRadius * fertilizedEggRadius;
            const distSquared = window.Utils.distanceSquared(tuna, prey);
            
            if (distSquared < detectionRadiusSquared) {
                nearbyPrey.push({
                    entity: prey,
                    distance: Math.sqrt(distSquared),
                    priority: this.calculatePreyPriority(tuna, prey, 'fertilizedEggs')
                });
            }
        }
        
        // Check unfertilized fish eggs (smallest detection radius)
        for (let prey of (gameEntities.fishEggs || [])) {
            const detectionRadiusSquared = fishEggRadius * fishEggRadius;
            const distSquared = window.Utils.distanceSquared(tuna, prey);
            
            if (distSquared < detectionRadiusSquared) {
                nearbyPrey.push({
                    entity: prey,
                    distance: Math.sqrt(distSquared),
                    priority: this.calculatePreyPriority(tuna, prey, 'fishEggs')
                });
            }
        }
        
        return nearbyPrey.sort((a, b) => b.priority - a.priority);
    }
    
    calculatePreyPriority(tuna, prey, preyType = 'unknown') {
        const distance = window.Utils.distance(tuna, prey);
        const maxDistance = this.config.huntRadius;
        
        // Base priority from distance (closer = higher priority)
        let priority = 1.0;
        priority *= (maxDistance - distance) / maxDistance;
        
        // Prey type priority: regular fry > truefry > eggs
        if (preyType === 'regularFry') {
            // Regular fry - HIGHEST priority (preferred prey)
            priority *= 3.0;
        } else if (preyType === 'truefry') {
            // TrueFry - Second priority (still good but not preferred)
            priority *= 2.0;
        } else if (preyType === 'fertilizedEggs') {
            // Fertilized eggs - Third priority
            priority *= 1.5;
        } else if (preyType === 'fishEggs') {
            // Unfertilized eggs - Lowest priority
            priority *= 1.2;
        }
        
        // Size-based priority (eggs don't have meaningful size comparison)
        if (prey.size && tuna.size && preyType !== 'fertilizedEggs' && preyType !== 'fishEggs') {
            const sizeRatio = prey.size / tuna.size;
            if (sizeRatio > 0.3 && sizeRatio < 0.8) {
                priority *= 1.3; // Optimal size range
            } else if (sizeRatio < 0.2) {
                priority *= 0.9; // Too small
            }
        }
        
        // Slower prey are easier to catch
        if (prey.velocity) {
            const preySpeed = Math.sqrt(prey.velocity.x ** 2 + prey.velocity.y ** 2);
            priority *= Math.max(0.5, 1.0 - preySpeed / 10);
        }
        
        return priority;
    }
    
    selectBestTarget(tuna, nearbyPrey) {
        if (nearbyPrey.length === 0) return null;
        return nearbyPrey[0].entity;
    }
    
    selectBetterTarget(tuna, currentTarget, nearbyPrey) {
        if (nearbyPrey.length === 0) return null;
        
        const currentPriority = this.calculatePreyPriority(tuna, currentTarget);
        const bestNewTarget = nearbyPrey[0];
        
        if (bestNewTarget.priority > currentPriority * 1.2) {
            return bestNewTarget.entity;
        }
        
        return null;
    }
    
    isValidTarget(target) {
        // Basic validation: target exists and has valid coordinates
        if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
            return false;
        }
        
        // Additional check: verify target hasn't been deleted/removed (NaN or Infinity checks)
        if (isNaN(target.x) || isNaN(target.y) || !isFinite(target.x) || !isFinite(target.y)) {
            return false;
        }
        
        return true;
    }
    
    // Check if target still exists in game entities (more thorough validation)
    isTargetStillInGame(target, gameEntities) {
        if (!this.isValidTarget(target)) return false;
        
        // Check if target exists in any relevant array
        const arraysToCheck = [
            gameEntities.fish || [],
            gameEntities.fertilizedEggs || [],
            gameEntities.fishEggs || []
        ];
        
        for (let arr of arraysToCheck) {
            if (arr.indexOf(target) !== -1) {
                return true;
            }
        }
        
        return false;
    }
    
    findThreats(tuna, gameEntities) {
        const threats = [];
        const threatRadius = this.config.fleeRadius;
        
        for (let squid of gameEntities.squid || []) {
            const distance = window.Utils.distance(tuna, squid);
            if (distance < threatRadius) {
                threats.push(squid);
            }
        }
        
        return threats;
    }
    
    transitionToState(tuna, newState, target = null) {
        if (tuna.aiState === newState) return;
        
        const oldState = tuna.aiState;
        tuna.aiState = newState;
        
        // Only update target if explicitly provided (not null)
        if (target !== null) {
            tuna.aiTarget = target;
        }
        // If transitioning to PATROLLING without a target, clear it
        if (newState === this.states.PATROLLING && target === null) {
            tuna.aiTarget = null;
        }
        
        tuna.lastStateChange = tuna.aiTimer;
        
        // State transition effects
        switch (newState) {
            case this.states.HUNTING:
                tuna.alertness = Math.min(1.0, tuna.alertness + 0.2);
                break;
            case this.states.FLEEING:
                tuna.alertness = 1.0; // Maximum alertness when fleeing
                break;
            case this.states.PATROLLING:
                tuna.currentSpeedBoost = 1.0;
                break;
            case this.states.FEEDING:
                tuna.currentSpeedBoost = 1.0;
                // Clear target when entering feeding (prey was eaten)
                tuna.aiTarget = null;
                break;
        }
        
        // Future expansion: State transition hooks for additional behaviors
        // This allows for future systems like reproduction to hook into state changes
        if (window.tunaBehaviorHooks && window.tunaBehaviorHooks.onStateTransition) {
            window.tunaBehaviorHooks.onStateTransition(tuna, oldState, newState, target);
        }
    }
}

// Create singleton instance
const tunaAI = new TunaAI();

// Make globally accessible
if (typeof window !== 'undefined') {
window.TunaAI = tunaAI; 
} 