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
        
        // Apply movement forces
        this.steeringForces.applyMovementForces(tuna);
    }
    
    // Delegate state handlers to behavior tree and steering forces
    handlePatrolling(tuna, gameEntities) {
        const timeSinceStateChange = tuna.aiTimer - tuna.lastStateChange;
        const postFeedingCooldown = 60;
        
        if (timeSinceStateChange > postFeedingCooldown) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities, this.config.huntRadius * tuna.alertness);
            
            if (nearbyPrey.length > 0 && tuna.energy > this.config.huntEnergyThreshold) {
                const bestTarget = this.selectBestTarget(tuna, nearbyPrey);
                if (bestTarget) {
                    this.transitionToState(tuna, this.states.HUNTING, bestTarget);
                    return;
                }
            }
        }
        
        if (tuna.energy < this.config.restEnergyThreshold) {
            this.transitionToState(tuna, this.states.RESTING);
            return;
        }
        
        this.steeringForces.handleWandering(tuna);
    }
    
    handleHunting(tuna, gameEntities) {
        if (!tuna.aiTarget || !this.isValidTarget(tuna.aiTarget)) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        if (distToTarget < this.config.attackRadius) {
            this.transitionToState(tuna, this.states.ATTACKING);
            return;
        }
        
        if (distToTarget > this.config.huntRadius * 1.5 || tuna.energy < 20) {
            tuna.huntSuccess = Math.max(0, tuna.huntSuccess - 1);
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        if (tuna.targetSwitchTimer <= 0) {
            const nearbyPrey = this.findNearbyPrey(tuna, gameEntities, this.config.huntRadius);
            const betterTarget = this.selectBetterTarget(tuna, tuna.aiTarget, nearbyPrey);
            if (betterTarget) {
                tuna.aiTarget = betterTarget;
                tuna.targetSwitchTimer = this.config.targetSwitchCooldown;
            }
        }
        
        this.steeringForces.applyHuntingForces(tuna);
    }
    
    handleAttacking(tuna, gameEntities) {
        if (!tuna.aiTarget || !this.isValidTarget(tuna.aiTarget)) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        const distToTarget = window.Utils.distance(tuna, tuna.aiTarget);
        
        if (distToTarget < this.config.attackRadius) {
            if (window.gameState && window.gameState.tunaDebug) {
                console.log(`🎯 Tuna attacking target at distance ${distToTarget.toFixed(1)} (radius: ${this.config.attackRadius})`);
            }
            
            if (this.steeringForces.attemptToEat(tuna, tuna.aiTarget, gameEntities)) {
                tuna.huntSuccess++;
                this.transitionToState(tuna, this.states.FEEDING);
                return;
            }
        }
        
        if (distToTarget > this.config.attackRadius * 1.5) {
            this.transitionToState(tuna, this.states.HUNTING);
            return;
        }
        
        this.steeringForces.applyAttackForces(tuna);
    }
    
    handleFeeding(tuna, gameEntities) {
        const feedingDuration = 180;
        const timeSinceFeeding = tuna.aiTimer - tuna.lastStateChange;
        
        if (timeSinceFeeding > feedingDuration) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        this.steeringForces.handleWandering(tuna);
        
        const threats = this.findThreats(tuna, gameEntities);
        if (threats.length > 0) {
            this.transitionToState(tuna, this.states.FLEEING);
            return;
        }
    }
    
    handleResting(tuna, gameEntities) {
        if (!tuna.restingSpot) {
            tuna.restingSpot = this.steeringForces.findRestingSpot(tuna);
        }
        
        if (tuna.restingSpot) {
            const distToRest = window.Utils.distance(tuna, tuna.restingSpot);
            if (distToRest > 20) {
                const restForce = window.Utils.calculateSteering(tuna, tuna.restingSpot, tuna.maxSpeed * 0.5, tuna.maxForce);
                tuna.applyForce({
                    x: restForce.x * 0.3,
                    y: restForce.y * 0.3
                });
            }
        }
        
        tuna.energy = Math.min(100, tuna.energy + 0.1);
        
        if (tuna.energy > 70) {
            tuna.restingSpot = null;
            this.transitionToState(tuna, this.states.PATROLLING);
        }
        
        const closePrey = this.findNearbyPrey(tuna, gameEntities, this.config.attackRadius);
        if (closePrey.length > 0) {
            this.transitionToState(tuna, this.states.HUNTING, closePrey[0].entity);
        }
    }
    
    handleFleeing(tuna, gameEntities) {
        const threats = this.findThreats(tuna, gameEntities);
        
        if (threats.length === 0) {
            this.transitionToState(tuna, this.states.PATROLLING);
            return;
        }
        
        this.steeringForces.applyFleeForces(tuna, threats);
    }
    
    // Target selection and utility methods
    findNearbyPrey(tuna, gameEntities, radius) {
        const nearbyPrey = [];
        const radiusSquared = radius * radius;
        
        const preyArrays = [
            { array: gameEntities.fish || [], name: 'fish', detectionRadius: radius },
            { array: gameEntities.krill || [], name: 'krill', detectionRadius: radius },
            { array: gameEntities.paleKrill || [], name: 'paleKrill', detectionRadius: radius },
            { array: gameEntities.momKrill || [], name: 'momKrill', detectionRadius: radius },
            { array: gameEntities.fertilizedEggs || [], name: 'fertilizedEggs', detectionRadius: window.TUNA_CONFIG?.fertilizedEggDetectionRadius || 150 }
        ];
        
        for (let preyGroup of preyArrays) {
            const detectionRadiusSquared = preyGroup.detectionRadius * preyGroup.detectionRadius;
            
            for (let prey of preyGroup.array) {
                if (window.Utils && !window.Utils.shouldIgnorePrey(tuna.tunaType, prey.fishType)) {
                    const distSquared = window.Utils.distanceSquared(tuna, prey);
                    if (distSquared < detectionRadiusSquared) {
                        nearbyPrey.push({
                            entity: prey,
                            distance: Math.sqrt(distSquared),
                            priority: this.calculatePreyPriority(tuna, prey)
                        });
                    }
                }
            }
        }
        
        return nearbyPrey.sort((a, b) => b.priority - a.priority);
    }
    
    calculatePreyPriority(tuna, prey) {
        const distance = window.Utils.distance(tuna, prey);
        const maxDistance = this.config.huntRadius;
        
        let priority = 1.0;
        priority *= (maxDistance - distance) / maxDistance;
        
        const sizeRatio = prey.size / tuna.size;
        if (sizeRatio > 0.3 && sizeRatio < 0.8) {
            priority *= 1.5;
        } else if (sizeRatio < 0.2) {
            priority *= 0.7;
        }
        
        const hungerFactor = 1.0 - (tuna.energy / 100);
        priority *= (1.0 + hungerFactor * 0.5);
        
        const preySpeed = Math.sqrt(prey.velocity.x ** 2 + prey.velocity.y ** 2);
        priority *= Math.max(0.5, 1.0 - preySpeed / 10);
        
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
        return target && typeof target.x === 'number' && typeof target.y === 'number';
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
        
        tuna.aiState = newState;
        tuna.aiTarget = target;
        tuna.lastStateChange = tuna.aiTimer;
        
        switch (newState) {
            case this.states.HUNTING:
                tuna.alertness = Math.min(1.0, tuna.alertness + 0.2);
                break;
            case this.states.RESTING:
                tuna.alertness = Math.max(0.1, tuna.alertness - 0.3);
                tuna.currentSpeedBoost = 1.0;
                break;
            case this.states.FLEEING:
                tuna.alertness = 1.0;
                break;
            case this.states.PATROLLING:
                tuna.currentSpeedBoost = 1.0;
                break;
            case this.states.FEEDING:
                tuna.currentSpeedBoost = 1.0;
                break;
        }
    }
}

// Create singleton instance
const tunaAI = new TunaAI();

// Make globally accessible
if (typeof window !== 'undefined') {
window.TunaAI = tunaAI; 
} 