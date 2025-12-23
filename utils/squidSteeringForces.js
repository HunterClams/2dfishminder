// GiantSquid Steering Forces - Movement and force calculations
// Handles all steering, hunting, attack, retreat, and prey capture logic

class SquidSteeringForces {
    constructor() {
        this.config = window.SQUID_CONFIG;
        this.states = window.SQUID_STATES;
    }

    /**
     * Apply patrolling forces
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    applyPatrollingForces(squid, jetSystem) {
        // Random gentle movement with increased intensity
        const direction = {
            x: (Math.random() - 0.5) * 0.8,
            y: (Math.random() - 0.5) * 0.5
        };
        jetSystem.finPropulsion(squid, direction, 0.6);
    }

    /**
     * Apply hunting forces
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    applyHuntingForces(squid, jetSystem) {
        if (!squid.huntTarget) return;

        const dist = this.distance(squid, squid.huntTarget);
        
        if (dist < squid.attackRange) {
            return; // Will transition to attacking
        }
        
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const maxShallowDepth = WORLD_HEIGHT * 0.5; // 50% depth limit (4000px if WORLD_HEIGHT is 8000)
        const currentDepth = squid.y;
        
        // Calculate direction to target
        let direction = this.normalize({
            x: squid.huntTarget.x - squid.x,
            y: squid.huntTarget.y - squid.y
        });
        
        // Enforce 50% depth limit: prevent upward movement if at or above 50% depth
        if (direction.y < 0 && currentDepth <= maxShallowDepth) {
            // Squid is at or above 50% depth and trying to move up - prevent upward movement
            // Only allow horizontal movement or downward movement
            direction.y = 0; // Force horizontal movement only
            // Re-normalize horizontal direction
            if (direction.x !== 0) {
                const mag = Math.abs(direction.x);
                direction.x = direction.x / mag;
            } else {
                // No horizontal component, use random horizontal direction
                direction.x = Math.random() > 0.5 ? 1 : -1;
            }
        }
        
        // Use jet propulsion to close distance - allow jet until much closer to target
        const jetRange = 150; // Use jet propulsion until within 150px of target
        
        if (jetSystem.canJet(squid) && dist > jetRange) {
            // Use powerful jet to close distance to target (but respect depth limit)
            jetSystem.jet(squid, direction, 0.9);
            
            // Debug logging for jet propulsion
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                console.log(`🦑 Squid jetting toward target: distance ${Math.round(dist)}px, jet power 0.9, depth: ${Math.round((currentDepth / WORLD_HEIGHT) * 100)}%`);
            }
        } else if (dist <= jetRange && dist > squid.attackRange) {
            // Use fins for fine positioning when very close but not in attack range
            jetSystem.finPropulsion(squid, direction, 0.7);
            
            // Debug logging for fin propulsion
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                console.log(`🦑 Squid using fins for fine positioning: distance ${Math.round(dist)}px, attack range ${squid.attackRange}px, depth: ${Math.round((currentDepth / WORLD_HEIGHT) * 100)}%`);
            }
        }
    }

    /**
     * Apply attack forces
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    applyAttackForces(squid, jetSystem) {
        if (!squid.huntTarget) return;

        const dist = this.distance(squid, squid.huntTarget);
        
        if (dist < 220) {
            return; // Will grab prey
        }
        
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const maxShallowDepth = WORLD_HEIGHT * 0.5; // 50% depth limit
        const currentDepth = squid.y;
        
        // Final attack approach
        let direction = this.normalize({
            x: squid.huntTarget.x - squid.x,
            y: squid.huntTarget.y - squid.y
        });
        
        // Enforce 50% depth limit: prevent upward movement if at or above 50% depth
        if (direction.y < 0 && currentDepth <= maxShallowDepth) {
            // Squid is at or above 50% depth and trying to move up - prevent upward movement
            direction.y = 0; // Force horizontal movement only
            // Re-normalize horizontal direction
            if (direction.x !== 0) {
                const mag = Math.abs(direction.x);
                direction.x = direction.x / mag;
            } else {
                // No horizontal component, use random horizontal direction
                direction.x = Math.random() > 0.5 ? 1 : -1;
            }
        }
        
        // Use jet propulsion for upward movement during attack, tentacles for fine positioning
        const needsUpwardMovement = direction.y < -0.3; // Moving significantly upward
        const isCloseAttack = dist <= 315 && dist > 220;
        
        if (jetSystem.canJet(squid) && needsUpwardMovement && isCloseAttack) {
            // Use jet for upward movement during close attack
            jetSystem.jet(squid, direction, 0.6);
        } else {
            // Use tentacles for fine positioning
            jetSystem.tentacleAdjust(squid, direction, 0.8);
        }
    }

    /**
     * Apply retreat forces
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    applyRetreatForces(squid, jetSystem) {
        // If fleeing from another squid, move away from it
        if (squid.fleeingFromSquid && squid.fleeingFromSquid.x !== undefined && squid.fleeingFromSquid.y !== undefined) {
            const squidDetectionRange = window.SQUID_CONFIG?.SQUID_DETECTION_RANGE || 1000;
            const dist = this.distance(squid, squid.fleeingFromSquid);
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const currentDepthPercent = squid.y / WORLD_HEIGHT;
            const preferredDepthMin = window.SQUID_CONFIG?.PREFERRED_DEPTH_MIN || 0.75;
            
            // Check if squid is in shallow waters (above preferred depth)
            const isInShallowWaters = currentDepthPercent < preferredDepthMin;
            
            // Generate or use existing retreat target point with random variation
            if (!squid.retreatTargetPoint) {
                // Calculate base direction away from threatening squid
                const baseDirection = {
                    x: squid.x - squid.fleeingFromSquid.x,
                    y: squid.y - squid.fleeingFromSquid.y
                };
                const baseMag = Math.sqrt(baseDirection.x ** 2 + baseDirection.y ** 2);
                if (baseMag > 0) {
                    baseDirection.x /= baseMag;
                    baseDirection.y /= baseMag;
                }
                
                // Generate retreat target point with random variation:
                // - Within squid's size/radius (squid.size pixels) for vertical variation
                // - 800 horizontal px variation
                const retreatDistance = 1000; // Base retreat distance
                const horizontalVariation = (Math.random() - 0.5) * 800; // ±400px horizontal
                const verticalVariation = (Math.random() - 0.5) * squid.size; // Within squid's size
                
                // Calculate retreat target point
                const retreatTargetX = squid.x + baseDirection.x * retreatDistance + horizontalVariation;
                const retreatTargetY = squid.y + baseDirection.y * retreatDistance + verticalVariation;
                
                squid.retreatTargetPoint = { x: retreatTargetX, y: retreatTargetY };
                
                if (window.gameState && window.gameState.squidDebug) {
                    console.log(`🦑 Squid generated retreat target:`, {
                        from: { x: Math.round(squid.x), y: Math.round(squid.y) },
                        to: { x: Math.round(retreatTargetX), y: Math.round(retreatTargetY) },
                        horizontalVariation: Math.round(horizontalVariation),
                        verticalVariation: Math.round(verticalVariation)
                    });
                }
            }
            
            // Calculate direction to retreat target point
            const directionToTarget = {
                x: squid.retreatTargetPoint.x - squid.x,
                y: squid.retreatTargetPoint.y - squid.y
            };
            const distToTarget = Math.sqrt(directionToTarget.x ** 2 + directionToTarget.y ** 2);
            
            // Normalize direction
            const fleeDirection = this.normalize(directionToTarget);
            
            // If we've reached the retreat target, generate a new one
            if (distToTarget < 200) {
                squid.retreatTargetPoint = null; // Will generate new one next frame
            }
            
            // REGULATED RETREAT SPEED SYSTEM: Consistent speed when retreating from other squids
            // Use regulated speed multiplier from config (70% of hunting speed)
            const baseRetreatSpeed = this.config.SQUID_RETREAT_SPEED_MULTIPLIER || 0.7; // 70% of hunting speed
            
            // SPEED SYSTEM: Only apply distance-based speed when retreating from shallow waters
            // When in deep waters: Use regulated retreat speed (0.7)
            // When in shallow waters: Start fast (regulated speed) when close, slow down as distance increases
            let speedMultiplier;
            
            if (isInShallowWaters) {
                // RETREATING FROM SHALLOW WATERS: Distance-based speed system
                // Close to threat (< 500px): Regulated speed (0.7) = base retreat speed
                // Far from threat (> 1500px): Slow speed (0.3) = much slower
                // Between: Linear interpolation
                const closeDistance = 500; // Within this distance, use regulated retreat speed
                const farDistance = 1500; // Beyond this distance, use slow speed
                const minSpeedMultiplier = 0.3; // Minimum speed when far away (30% of hunting speed)
                const maxSpeedMultiplier = baseRetreatSpeed; // Maximum speed when close (70% = regulated retreat speed)
                
                if (dist <= closeDistance) {
                    // Close to threat - use regulated retreat speed
                    speedMultiplier = maxSpeedMultiplier;
                } else if (dist >= farDistance) {
                    // Far from threat - use slow speed
                    speedMultiplier = minSpeedMultiplier;
                } else {
                    // Between close and far - linear interpolation
                    const distanceRange = farDistance - closeDistance;
                    const distanceInRange = dist - closeDistance;
                    const speedRange = maxSpeedMultiplier - minSpeedMultiplier;
                    speedMultiplier = maxSpeedMultiplier - (distanceInRange / distanceRange) * speedRange;
                }
            } else {
                // RETREATING IN DEEP WATERS: Use regulated retreat speed (consistent)
                speedMultiplier = baseRetreatSpeed; // 70% of hunting speed - regulated and consistent
            }
            
            // Store speed multiplier for use in physics system
            squid.retreatSpeedMultiplier = speedMultiplier;
            
            // Match hunting behavior: use jet when far, fins when close
            // Hunting uses: jet power 0.9 when >150px, fin intensity 0.7 when <=150px
            const retreatJetRange = 300; // Use jet when further than 300px from threat
            
            if (jetSystem.canJet(squid) && dist > retreatJetRange) {
                // Far from threat - use jet propulsion (similar to hunting when far)
                // Use consistent hunting jet power (0.9) scaled by speed multiplier
                const jetPower = 0.9 * speedMultiplier; // Full power when close/in deep waters, reduced when far in shallow
                jetSystem.jet(squid, fleeDirection, jetPower);
            } else {
                // Close to threat or jet on cooldown - use fin propulsion (similar to hunting when close)
                // Use consistent hunting fin intensity (0.7) scaled by speed multiplier
                const finIntensity = 0.7 * speedMultiplier; // Full intensity when close/in deep waters, reduced when far in shallow
                jetSystem.finPropulsion(squid, fleeDirection, finIntensity);
            }
            
            // Debug logging
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                console.log(`🦑 Squid retreat speed:`, {
                    distance: Math.round(dist),
                    isInShallowWaters: isInShallowWaters,
                    currentDepth: Math.round(currentDepthPercent * 100) + '%',
                    speedMultiplier: Math.round(speedMultiplier * 100) + '%',
                    jetPower: jetSystem.canJet(squid) && dist > retreatJetRange ? Math.round(0.9 * speedMultiplier * 100) / 100 : 'N/A',
                    finIntensity: Math.round(0.7 * speedMultiplier * 100) / 100
                });
            }
            
            // Clear fleeing target if far enough away (handled in handleRetreating)
        } else {
            // Normal retreat: gentle settling movement (when not fleeing from squid)
            const settleDirection = {
                x: (Math.random() - 0.5) * 0.2,
                y: 0.1
            };
            jetSystem.finPropulsion(squid, settleDirection, 0.2);
            
            // Clear retreat target point when not fleeing
            if (squid.retreatTargetPoint) {
                squid.retreatTargetPoint = null;
            }
        }
    }

    /**
     * Attempt to grab prey
     * @param {Object} squid - The squid entity
     * @param {Array} predators - Array of predator entities
     * @param {Array} fish - Array of fish entities
     * @returns {boolean} True if prey was grabbed
     */
    attemptToGrabPrey(squid, predators, fish) {
        if (!squid.huntTarget) return false;

        const dist = this.distance(squid, squid.huntTarget);
        
        if (dist < 220) {
            // Check eating cooldown before grabbing prey
            const currentTime = Date.now();
            if (currentTime - squid.lastEatTime < this.config.EAT_COOLDOWN) {
                return false; // Still in cooldown
            }
            
            // Debug logging
            if (window.gameState && window.gameState.squidDebug) {
                console.log(`🦑 Squid attempting to grab prey:`, {
                    preyType: squid.huntTarget.tunaType || squid.huntTarget.fishType || 'unknown',
                    isTuna: squid.huntTarget.tunaType ? true : false,
                    distance: dist,
                    position: { x: squid.huntTarget.x, y: squid.huntTarget.y }
                });
            }
            
            // Successful attack - grab prey
            squid.grabbedPrey = squid.huntTarget;
            
            // Initialize eaten sprite for tuna if it's a tuna
            if (squid.grabbedPrey.tunaType && window.TunaSpriteUtils) {
                window.TunaSpriteUtils.initializeEatenSprite(squid.grabbedPrey, currentTime);
            }
            
            // Remove prey from arrays
            let preyIndex = predators.indexOf(squid.huntTarget);
            let removedFrom = 'predators';
            if (preyIndex !== -1) {
                predators.splice(preyIndex, 1);
            } else {
                preyIndex = fish.indexOf(squid.huntTarget);
                if (preyIndex !== -1) {
                    fish.splice(preyIndex, 1);
                    removedFrom = 'fish';
                }
            }
            
            // Debug logging for removal
            if (window.gameState && window.gameState.squidDebug) {
                console.log(`🦑 Squid grabbed prey from ${removedFrom}:`, {
                    preyType: squid.grabbedPrey.tunaType || squid.grabbedPrey.fishType || 'unknown',
                    isTuna: squid.grabbedPrey.tunaType ? true : false,
                    predatorsCount: predators.length,
                    fishCount: fish.length
                });
            }
            
            // Simple success log regardless of debug mode
            const preyType = squid.grabbedPrey.tunaType || squid.grabbedPrey.fishType || 'unknown';
            console.log(`🦑 Squid successfully grabbed ${preyType} from ${removedFrom} array!`);
            
            // Create dramatic capture effect
            this.createCaptureBubbles(squid);
            
            // Powerful escape jet
            const escapeDirection = {
                x: (Math.random() - 0.5),
                y: 0.8 // Dive down
            };
            
            return true;
        }
        
        return false;
    }

    /**
     * Consume grabbed prey
     * @param {Object} squid - The squid entity
     */
    consumePrey(squid) {
        if (!squid.grabbedPrey) return;

        // Update eaten sprite for tuna
        if (squid.grabbedPrey.tunaType && window.TunaSpriteUtils) {
            window.TunaSpriteUtils.updateEatenSprite(squid.grabbedPrey, Date.now());
        }
        
        // Consumption complete after 3 seconds
        if (squid.stateTimer > this.config.CONSUMPTION_DURATION) {
            // Create large poop (100% of the time when eating tuna)
            if (window.gameEntities && window.Poop) {
                window.gameEntities.poop.push(new window.Poop(squid.x, squid.y, 'squid'));
            }
            squid.lastEatTime = Date.now();
            squid.lastPoopTime = Date.now(); // Track when we pooped
            
            // Final consumption bubbles
            this.createConsumptionBubbles(squid);
            
            // Clean up eaten sprite state if it exists
            if (squid.grabbedPrey && squid.grabbedPrey.tunaType && window.TunaSpriteUtils) {
                window.TunaSpriteUtils.cleanupEatenSprite(squid.grabbedPrey);
            }
            
            squid.grabbedPrey = null;
        }
    }

    /**
     * Create capture bubble effects
     * @param {Object} squid - The squid entity
     */
    createCaptureBubbles(squid) {
        for (let i = 0; i < this.config.CAPTURE_BUBBLE_COUNT; i++) {
            if (window.ObjectPools) {
                window.ObjectPools.getEatingBubble(
                    squid.x + (Math.random() - 0.5) * this.config.BUBBLE_SPREAD_RANGE, 
                    squid.y + (Math.random() - 0.5) * this.config.BUBBLE_SPREAD_RANGE
                );
            }
        }
    }

    /**
     * Create consumption bubble effects
     * @param {Object} squid - The squid entity
     */
    createConsumptionBubbles(squid) {
        for (let i = 0; i < this.config.CONSUMPTION_BUBBLE_COUNT; i++) {
            if (window.ObjectPools) {
                window.ObjectPools.getEatingBubble(
                    squid.x + (Math.random() - 0.5) * this.config.CONSUMPTION_BUBBLE_SPREAD, 
                    squid.y + (Math.random() - 0.5) * this.config.CONSUMPTION_BUBBLE_SPREAD
                );
            }
        }
    }

    /**
     * Apply escape jet after grabbing prey
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    applyEscapeJet(squid, jetSystem) {
        const escapeDirection = {
            x: (Math.random() - 0.5),
            y: 0.8 // Dive down
        };
        jetSystem.jet(squid, this.normalize(escapeDirection), 1.0);
    }

    /**
     * Calculate distance between two objects
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {number} Distance between objects
     */
    distance(obj1, obj2) {
        return Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
    }

    /**
     * Normalize a vector
     * @param {Object} vector - Vector to normalize
     * @returns {Object} Normalized vector
     */
    normalize(vector) {
        const mag = Math.sqrt(vector.x ** 2 + vector.y ** 2);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }

    /**
     * Handle world edges
     * @param {Object} squid - The squid entity
     */
    handleEdges(squid) {
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(squid, this.config.EDGE_BUFFER, this.config.EDGE_FORCE);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SquidSteeringForces = SquidSteeringForces;
} 