// GiantSquid Behavior Tree - State machine and decision logic
// Handles state transitions, prey scanning, and high-level decisions

class SquidBehaviorTree {
    constructor() {
        this.config = window.SQUID_CONFIG;
        this.states = window.SQUID_STATES;
        this.controller = null; // Will be set by the main controller
    }

    /**
     * Set the main controller reference
     * @param {Object} controller - The main squid AI controller
     */
    setController(controller) {
        this.controller = controller;
    }

    /**
     * Initialize behavior tree for a squid
     * @param {Object} squid - The squid entity
     */
    initializeBehaviorTree(squid) {
        squid.state = this.states.PATROLLING;
        squid.stateTimer = 0;
        squid.huntTarget = null;
        squid.grabbedPrey = null;
        squid.fleeingFromSquid = null; // Track which squid we're fleeing from
        squid.lastEatTime = 0;
        squid.lastPoopTime = 0;
        squid.targetDepth = squid.y;
        squid.tentaclePulse = 0;
        squid.finUndulation = 0;
        squid.currentSpeed = 0;
        squid.blinkTimer = 0;
    }

    /**
     * Update behavior state machine
     * @param {Object} squid - The squid entity
     * @param {Array} fish - Array of fish entities
     * @param {Array} predators - Array of predator entities
     * @param {Array} krill - Array of krill entities
     */
    updateBehaviorTree(squid, fish, predators, krill) {
        squid.stateTimer++;
        
        // Delegate to main controller for state handling
        if (this.controller) {
            switch (squid.state) {
                case this.states.PATROLLING:
                    this.controller.handlePatrolling(fish, predators);
                    break;
                case this.states.HUNTING:
                    this.controller.handleHunting(fish, predators);
                    break;
                case this.states.ATTACKING:
                    this.controller.handleAttacking(fish, predators);
                    break;
                case this.states.RETREATING:
                    this.controller.handleRetreating(fish, predators);
                    break;
            }
        }
    }

    /**
     * Scan for nearby other squids (for avoidance/fleeing)
     * @param {Object} squid - The squid entity
     * @param {Array} allSquids - Array of all squid entities
     * @returns {Object|null} Nearest other squid or null
     */
    scanForOtherSquids(squid, allSquids) {
        if (!allSquids || allSquids.length <= 1) return null; // Need at least 2 squids
        
        let nearestSquid = null;
        let nearestDistance = this.config.SQUID_DETECTION_RANGE * this.config.SQUID_DETECTION_RANGE;
        
        for (let other of allSquids) {
            if (other === squid) continue; // Skip self
            
            const distSquared = window.Utils.distanceSquared(squid, other);
            if (distSquared < nearestDistance) {
                nearestSquid = other;
                nearestDistance = distSquared;
            }
        }
        
        return nearestSquid;
    }

    /**
     * Scan for prey (only target tuna)
     * @param {Object} squid - The squid entity
     * @param {Array} predators - Array of predator entities
     * @param {Array} fish - Array of fish entities
     * @returns {Object|null} Closest prey or null
     */
    scanForPrey(squid, predators, fish) {
        let closestPrey = null;
        let closestDistance = squid.visionRangeSquared;
        
        // Check if squid should ignore tuna after pooping
        const currentTime = Date.now();
        const shouldIgnoreTuna = (currentTime - squid.lastPoopTime) < this.config.POOP_IGNORE_DURATION;
        
        // Debug logging
        if (window.gameState && window.gameState.squidDebug) {
            const timeSincePoop = currentTime - squid.lastPoopTime;
            const cooldownLeft = Math.max(0, this.config.POOP_IGNORE_DURATION - timeSincePoop);
            console.log(`🦑 Squid scanning for prey:`, {
                predatorsCount: predators.length,
                fishCount: fish.length,
                shouldIgnoreTuna: shouldIgnoreTuna,
                visionRange: squid.visionRange,
                timeSincePoop: Math.round(timeSincePoop / 1000) + 's',
                cooldownLeft: Math.round(cooldownLeft / 1000) + 's'
            });
        }
        
        // Only hunt tuna (predators) - ignore all other fish
        if (!shouldIgnoreTuna) {
            for (let tuna of predators) {
                // Skip tunas that are already being hunted by another squid
                if (tuna.huntedBySquid && tuna.huntedBySquid !== squid) {
                    continue; // This tuna is claimed by another squid
                }
                
                const distSquared = window.Utils.distanceSquared(squid, tuna);
                const distance = Math.sqrt(distSquared);
                
                // Debug logging for each tuna
                if (window.gameState && window.gameState.squidDebug) {
                    console.log(`🦑 Squid checking tuna:`, {
                        tunaType: tuna.tunaType,
                        distance: distance,
                        visionRange: squid.visionRange,
                        inRange: distSquared < closestDistance,
                        isClaimed: !!tuna.huntedBySquid,
                        position: { x: tuna.x, y: tuna.y },
                        squidPosition: { x: squid.x, y: squid.y }
                    });
                }
                
                if (distSquared < closestDistance) {
                    closestPrey = tuna;
                    closestDistance = distSquared;
                    
                    // Debug logging
                    if (window.gameState && window.gameState.squidDebug) {
                        console.log(`🦑 Squid found tuna:`, {
                            tunaType: tuna.tunaType,
                            distance: distance,
                            position: { x: tuna.x, y: squid.y }
                        });
                    }
                }
            }
        }
        
        // Debug logging for final result
        if (window.gameState && window.gameState.squidDebug && closestPrey) {
            console.log(`🦑 Squid selected prey:`, {
                type: closestPrey.tunaType || closestPrey.fishType || 'unknown',
                distance: Math.sqrt(closestDistance),
                isTuna: closestPrey.tunaType ? true : false
            });
        }
        
        return closestPrey;
    }

    /**
     * Maintain depth preference (stay in deep waters) with jet-awareness
     * @param {Object} squid - The squid entity
     */
    maintainDepth(squid) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const currentDepth = squid.y / WORLD_HEIGHT;
        
        // CRITICAL FIX: Check if squid is currently jetting
        // Don't interfere with jet propulsion by applying competing forces
        const isJetting = this.controller && this.controller.jetSystem && this.controller.jetSystem.isJetting(squid);
        if (isJetting) {
            // Skip depth maintenance during jet propulsion to preserve momentum
            return;
        }
        
        // If hunting, be more flexible with depth to reach prey
        const isHunting = squid.state === this.states.HUNTING || squid.state === this.states.ATTACKING;
        const hasTarget = squid.huntTarget !== null;
        
        if (isHunting && hasTarget) {
            // When hunting, allow movement outside preferred depth range to reach prey
            // But always limit to maximum 50% depth (cannot go shallower/higher than 50%)
            const targetDepth = squid.huntTarget.y / WORLD_HEIGHT;
            const maxShallowDepth = 0.5; // Cannot go above 50% depth (50% = 4000px if WORLD_HEIGHT is 8000)
            
            // If prey is shallower than 50% depth, limit to 50% depth
            if (targetDepth < maxShallowDepth) {
                squid.targetDepth = WORLD_HEIGHT * maxShallowDepth;
            } else {
                // Prey is at or below 50% depth, can pursue normally
                squid.targetDepth = squid.huntTarget.y;
            }
        } else {
            // Normal depth maintenance when not hunting
            let targetDepthPercent = this.config.PREFERRED_DEPTH_TARGET;
            
            if (currentDepth < this.config.PREFERRED_DEPTH_MIN) {
                // Too shallow - dive deeper (more aggressive if very shallow)
                if (currentDepth < 0.3) {
                    targetDepthPercent = this.config.PREFERRED_DEPTH_MIN + 0.1; // Dive deeper if very shallow
                } else {
                    targetDepthPercent = this.config.PREFERRED_DEPTH_MIN + 0.05;
                }
            } else if (currentDepth > this.config.PREFERRED_DEPTH_MAX) {
                // Too deep - rise slightly
                targetDepthPercent = this.config.PREFERRED_DEPTH_MAX - 0.05;
            }
            
            squid.targetDepth = WORLD_HEIGHT * targetDepthPercent;
        }
        
        // CRITICAL FIX: Apply depth adjustment with much higher threshold and lower intensity
        // Reduces interference with horizontal movement
        const depthDiff = squid.targetDepth - squid.y;
        const adjustmentThreshold = currentDepth < 0.3 ? 100 : 300; // Increased from 150 to 300
        const adjustmentIntensity = isHunting ? 0.1 : (currentDepth < 0.3 ? 0.4 : 0.2); // Reduced intensity
        
        if (Math.abs(depthDiff) > adjustmentThreshold) {
            const direction = { x: 0, y: Math.sign(depthDiff) };
            if (this.controller && this.controller.jetSystem) {
                this.controller.jetSystem.finPropulsion(squid, direction, adjustmentIntensity);
            }
        }
    }

    /**
     * Transition to a new state
     * @param {Object} squid - The squid entity
     * @param {string} newState - New state to transition to
     * @param {Object} target - Optional target for the new state
     */
    transitionToState(squid, newState, target = null) {
        if (squid.state === newState) return;
        
        // Clear claim on previous hunt target if transitioning away from hunting
        if (squid.huntTarget && squid.huntTarget.huntedBySquid === squid) {
            if (newState !== this.states.HUNTING && newState !== this.states.ATTACKING) {
                // Only clear if not transitioning to another hunting-related state
                squid.huntTarget.huntedBySquid = null;
            }
        }
        
        squid.state = newState;
        squid.stateTimer = 0;
        
        if (target) {
            squid.huntTarget = target;
            // Claim the target if transitioning to hunting state
            if (newState === this.states.HUNTING && target.huntedBySquid !== squid) {
                target.huntedBySquid = squid;
            }
        }
    }

    /**
     * Check if squid should ignore prey after pooping
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if should ignore prey
     */
    shouldIgnorePrey(squid) {
        const currentTime = Date.now();
        return (currentTime - squid.lastPoopTime) < this.config.POOP_IGNORE_DURATION;
    }

    /**
     * Check if squid can eat (not on cooldown)
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if can eat
     */
    canEat(squid) {
        const currentTime = Date.now();
        return (currentTime - squid.lastEatTime) >= this.config.EAT_COOLDOWN;
    }

    /**
     * Check if prey consumption is complete
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if consumption is complete
     */
    isConsumptionComplete(squid) {
        return squid.stateTimer > this.config.CONSUMPTION_DURATION;
    }

    /**
     * Check if hunting should timeout
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if hunting should timeout
     */
    shouldHuntTimeout(squid) {
        return squid.stateTimer > this.config.HUNT_TIMEOUT;
    }

    /**
     * Check if attack should timeout
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if attack should timeout
     */
    shouldAttackTimeout(squid) {
        return squid.stateTimer > this.config.ATTACK_TIMEOUT;
    }

    /**
     * Check if retreat should timeout
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if retreat should timeout
     */
    shouldRetreatTimeout(squid) {
        return squid.stateTimer > this.config.RETREAT_TIMEOUT;
    }

    /**
     * Check if patrol should change to hunting
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if should change to hunting
     */
    shouldPatrolToHunting(squid) {
        return squid.stateTimer > (300 + Math.random() * 300);
    }

    /**
     * Check if patrol movement should occur
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if should move
     */
    shouldPatrolMove(squid) {
        return squid.stateTimer % this.config.PATROL_MOVEMENT_INTERVAL === 0;
    }

    /**
     * Check if retreat settling should occur
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if should settle
     */
    shouldRetreatSettle(squid) {
        return squid.stateTimer % this.config.RETREAT_SETTLE_INTERVAL === 0;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SquidBehaviorTree = SquidBehaviorTree;
} 