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
        
        // REMOVED: Spawn grace period initialization - no longer needed
        // Squids will immediately start moving toward preferred depth when spawned shallow
        squid.spawnGracePeriod = 0; // Always 0 - no grace period
        
        // Set targetDepth to current position initially (will be adjusted by maintainDepth)
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
     * Determine if this squid should retreat from another squid
     * Uses deterministic comparison to ensure only one squid retreats when two detect each other
     * @param {Object} squid - The squid entity
     * @param {Object} otherSquid - The other squid entity
     * @returns {boolean} True if this squid should retreat
     */
    shouldRetreatFromSquid(squid, otherSquid) {
        if (!otherSquid) return false;
        
        // Use deterministic comparison based on position
        // Squid with smaller combined coordinate (x + y) continues hunting
        // Squid with larger combined coordinate retreats
        // This ensures consistent behavior when both squids detect each other
        const thisSquidValue = squid.x + squid.y;
        const otherSquidValue = otherSquid.x + otherSquid.y;
        
        // If values are equal (very rare), use x coordinate as tiebreaker
        if (thisSquidValue === otherSquidValue) {
            return squid.x > otherSquid.x;
        }
        
        // This squid retreats if it has the larger combined coordinate
        return thisSquidValue > otherSquidValue;
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
        // CRITICAL: Use hunting radius instead of vision range - only hunt tuna within hunting radius
        let closestDistance = squid.huntingRadiusSquared;
        
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
                huntingRadius: squid.huntingRadius,
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
                
                // CRITICAL: Only consider tuna within hunting radius (not vision range)
                if (distSquared > squid.huntingRadiusSquared) {
                    // Tuna is outside hunting radius - skip it
                    if (window.gameState && window.gameState.squidDebug) {
                        console.log(`🦑 Squid skipping tuna (outside hunting radius):`, {
                            tunaType: tuna.tunaType,
                            distance: Math.round(distance),
                            huntingRadius: squid.huntingRadius,
                            visionRange: squid.visionRange
                        });
                    }
                    continue;
                }
                
                // REMOVED: Depth restriction - squids can now detect and hunt tuna at any depth
                // The hunting commitment system will handle depth preference during the hunt
                
                // Debug logging for each tuna
                if (window.gameState && window.gameState.squidDebug) {
                    console.log(`🦑 Squid checking tuna:`, {
                        tunaType: tuna.tunaType,
                        distance: distance,
                        huntingRadius: squid.huntingRadius,
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
        // BUT: If we have a dive target, we need to apply forces even during jetting to prevent freezing
        const isJetting = this.controller && this.controller.jetSystem && this.controller.jetSystem.isJetting(squid);
        const hasDiveTarget = squid.diveTargetPoint !== null && squid.diveTargetPoint !== undefined;
        
        if (isJetting && !hasDiveTarget) {
            // Skip depth maintenance during jet propulsion to preserve momentum
            // UNLESS we have a dive target - then we need to keep applying forces
            return;
        }
        
        // REMOVED: Grace period check - squids now move immediately when spawned shallow
        // No need to skip depth maintenance - squids should start moving right away
        
        // If hunting, be more flexible with depth to reach prey
        const isHunting = squid.state === this.states.HUNTING || squid.state === this.states.ATTACKING;
        const hasTarget = squid.huntTarget !== null;
        
        // HUNTING COMMITMENT SYSTEM: Distance-based depth preference override
        // When close to prey, ignore depth preference completely to commit to the hunt
        let huntingCommitmentLevel = 0; // 0 = no commitment (apply full depth forces), 1 = full commitment (ignore depth)
        let shouldSkipDepthMaintenance = false;
        
        if (isHunting && hasTarget) {
            // Calculate distance to prey
            const distToPrey = window.Utils ? window.Utils.distance(squid, squid.huntTarget) : 
                Math.sqrt((squid.x - squid.huntTarget.x) ** 2 + (squid.y - squid.huntTarget.y) ** 2);
            
            const commitmentDistance = this.config.HUNTING_COMMITMENT_DISTANCE || 500;
            const fadeDistance = this.config.HUNTING_COMMITMENT_FADE_DISTANCE || 800;
            
            if (distToPrey <= commitmentDistance) {
                // Within commitment distance - FULL COMMITMENT: ignore depth preference completely
                huntingCommitmentLevel = 1.0;
                shouldSkipDepthMaintenance = true;
                
                // Set target depth to prey position (no depth restrictions)
                squid.targetDepth = squid.huntTarget.y;
                
                if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                    console.log(`🦑 Squid FULL COMMITMENT to hunt (distance: ${Math.round(distToPrey)}px <= ${commitmentDistance}px) - ignoring depth preference`);
                }
            } else if (distToPrey <= fadeDistance) {
                // Between commitment and fade distance - GRADUAL COMMITMENT: reduce depth forces
                // Calculate commitment level (1.0 at commitment distance, 0.0 at fade distance)
                huntingCommitmentLevel = 1.0 - ((distToPrey - commitmentDistance) / (fadeDistance - commitmentDistance));
                
                // Set target depth to prey position but allow some depth preference influence
                const targetDepth = squid.huntTarget.y / WORLD_HEIGHT;
                const maxShallowDepth = 0.5; // Cannot go above 50% depth
                
                if (targetDepth < maxShallowDepth) {
                    squid.targetDepth = WORLD_HEIGHT * maxShallowDepth;
                } else {
                    squid.targetDepth = squid.huntTarget.y;
                }
                
                if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                    console.log(`🦑 Squid PARTIAL COMMITMENT (distance: ${Math.round(distToPrey)}px, commitment: ${Math.round(huntingCommitmentLevel * 100)}%)`);
                }
            } else {
                // Beyond fade distance - LOW COMMITMENT: apply normal depth restrictions
                huntingCommitmentLevel = 0.0;
                
                // When hunting but far from prey, allow movement outside preferred depth range to reach prey
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
            }
            
            // Store commitment level for use in depth force calculation
            squid.huntingCommitmentLevel = huntingCommitmentLevel;
        } else {
            // Not hunting - clear commitment level
            squid.huntingCommitmentLevel = 0;
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
        
        // CRITICAL FIX: When squid is shallow, generate a target point and actively swim toward it
        // This handles retreating back to preferred depth after failed hunts or spawning shallow
        // BUT: Skip this if hunting with high commitment - let hunting commitment system handle depth
        const isRetreatingToDepth = currentDepth < this.config.PREFERRED_DEPTH_MIN;
        const commitmentLevel = squid.huntingCommitmentLevel || 0;
        const shouldSkipDiveTarget = isHunting && commitmentLevel > 0.5; // Skip dive target if hunting with >50% commitment
        
        if (isRetreatingToDepth && !shouldSkipDiveTarget) {
            // Grace period expired - generate a target point in preferred depth region
            if (!squid.diveTargetPoint) {
                const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
                // Generate target point below squid in preferred depth range
                const targetDepthRange = this.config.PREFERRED_DEPTH_MAX - this.config.PREFERRED_DEPTH_MIN;
                const randomDepthOffset = Math.random() * targetDepthRange;
                const targetY = WORLD_HEIGHT * (this.config.PREFERRED_DEPTH_MIN + randomDepthOffset);
                // Keep similar X position with some variation
                const targetX = squid.x + (Math.random() - 0.5) * 500; // ±250px horizontal variation
                
                squid.diveTargetPoint = { x: targetX, y: targetY };
                
                console.log(`🦑 Squid generated dive target point:`, {
                    from: { x: Math.round(squid.x), y: Math.round(squid.y) },
                    to: { x: Math.round(targetX), y: Math.round(targetY) },
                    depthDiff: Math.round(targetY - squid.y),
                    currentVelocity: { x: squid.velocity.x, y: squid.velocity.y }
                });
            }
            
            // Actively swim toward the dive target point using steering
            const distToTarget = Math.sqrt(
                (squid.x - squid.diveTargetPoint.x) ** 2 + 
                (squid.y - squid.diveTargetPoint.y) ** 2
            );
            
            // If we've reached the target point (within 200px), clear it and use normal depth maintenance
            if (distToTarget < 200) {
                squid.diveTargetPoint = null;
                console.log(`🦑 Squid reached dive target, switching to normal depth maintenance`);
                // Use normal depth adjustment below
            } else {
                // Calculate direction to dive target
                const direction = {
                    x: squid.diveTargetPoint.x - squid.x,
                    y: squid.diveTargetPoint.y - squid.y
                };
                const mag = Math.sqrt(direction.x ** 2 + direction.y ** 2);
                if (mag > 0) {
                    direction.x /= mag;
                    direction.y /= mag;
                }
                
                // CRITICAL: Ensure we have a jet system and apply forces immediately EVERY FRAME
                // This prevents freezing - forces must be applied continuously, not just when patrolling forces apply
                // STANDARDIZED SPEED: Use consistent hunting speed (0.9 jet, 0.7 fin) when retreating back to depth
                if (this.controller && this.controller.jetSystem) {
                    // Use jet if available and far away, otherwise use fin propulsion
                    // Always apply forces - don't skip if jet is on cooldown
                    // Match hunting speed: jet power 0.9 when >150px, fin intensity 0.7 when <=150px
                    const diveJetRange = 500; // Use jet when further than 500px from dive target
                    
                    if (distToTarget > diveJetRange && this.controller.jetSystem.canJet(squid)) {
                        // Use consistent hunting jet power (0.9) when retreating back to depth
                        this.controller.jetSystem.jet(squid, direction, 0.9);
                        if (squid.stateTimer % 30 === 0) {
                            console.log(`🦑 Squid jetting toward dive target (hunting speed), distance: ${Math.round(distToTarget)}`);
                        }
                    } else {
                        // CRITICAL: Always apply fin propulsion EVERY FRAME when diving
                        // This ensures continuous movement and prevents freezing
                        // Use consistent hunting fin intensity (0.7) when retreating back to depth
                        // No direct velocity boost - let the physics system handle it consistently
                        this.controller.jetSystem.finPropulsion(squid, direction, 0.7);
                        
                        if (squid.stateTimer % 30 === 0) {
                            console.log(`🦑 Squid fin propulsion toward dive target (hunting speed), distance: ${Math.round(distToTarget)}`);
                        }
                    }
                } else {
                    console.error(`🦑 ERROR: Squid missing jet system or controller!`);
                }
                
                // Skip normal depth adjustment when actively diving to target
                return;
            }
        } else if (squid.diveTargetPoint && currentDepth >= this.config.PREFERRED_DEPTH_MIN) {
            // We've reached preferred depth, clear the dive target
            squid.diveTargetPoint = null;
            console.log(`🦑 Squid reached preferred depth, clearing dive target`);
        }
        
        // HUNTING COMMITMENT SYSTEM: Skip depth maintenance if fully committed to hunt
        if (shouldSkipDepthMaintenance) {
            // Fully committed to hunt - skip depth maintenance entirely
            return;
        }
        
        // REDUCED DEPTH FORCES: Rely on hunting commitment system instead of strong depth maintenance
        // Only apply minimal depth adjustment when not hunting or when commitment is low
        // The distance-based hunting commitment system handles depth preference during hunts
        const depthDiff = squid.targetDepth - squid.y;
        const adjustmentThreshold = currentDepth < 0.3 ? 200 : 500; // Much higher threshold - only adjust when very far from target
        // commitmentLevel already declared above
        
        // When hunting with high commitment, skip depth adjustment entirely
        // When hunting with low commitment, apply very weak forces
        // When not hunting, apply minimal forces
        let baseIntensity;
        if (isHunting) {
            // When hunting: very weak forces, reduced by commitment level
            baseIntensity = 0.05; // Much weaker (was 0.1)
        } else {
            // When not hunting: minimal forces
            baseIntensity = currentDepth < 0.3 ? 0.2 : 0.1; // Reduced from 0.4/0.2
        }
        
        // Reduce intensity by commitment level (0 = full intensity, 1 = no intensity)
        const adjustmentIntensity = baseIntensity * (1.0 - commitmentLevel);
        
        // Only apply if far from target depth AND intensity is meaningful
        if (Math.abs(depthDiff) > adjustmentThreshold && adjustmentIntensity > 0.01) {
            const direction = { x: 0, y: Math.sign(depthDiff) };
            if (this.controller && this.controller.jetSystem) {
                this.controller.jetSystem.finPropulsion(squid, direction, adjustmentIntensity);
                
                if (window.gameState && window.gameState.squidDebug && isHunting && squid.stateTimer % 60 === 0) {
                    console.log(`🦑 Squid depth adjustment:`, {
                        depthDiff: Math.round(depthDiff),
                        commitmentLevel: Math.round(commitmentLevel * 100) + '%',
                        intensity: Math.round(adjustmentIntensity * 1000) / 1000,
                        threshold: adjustmentThreshold
                    });
                }
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