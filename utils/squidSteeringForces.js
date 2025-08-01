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
        
        // Approach using jet propulsion
        const direction = this.normalize({
            x: squid.huntTarget.x - squid.x,
            y: squid.huntTarget.y - squid.y
        });
        
        // Use jet propulsion to close distance - allow jet until much closer to target
        const jetRange = 150; // Use jet propulsion until within 150px of target
        const needsUpwardMovement = direction.y < -0.3; // Moving significantly upward
        
        if (jetSystem.canJet(squid) && dist > jetRange) {
            // Use powerful jet to close distance to target
            jetSystem.jet(squid, direction, 0.9);
            
            // Debug logging for jet propulsion
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                console.log(`🦑 Squid jetting toward target: distance ${Math.round(dist)}px, jet power 0.9`);
            }
        } else if (dist <= jetRange && dist > squid.attackRange) {
            // Use fins for fine positioning when very close but not in attack range
            jetSystem.finPropulsion(squid, direction, 0.7);
            
            // Debug logging for fin propulsion
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 30 === 0) {
                console.log(`🦑 Squid using fins for fine positioning: distance ${Math.round(dist)}px, attack range ${squid.attackRange}px`);
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
        
        // Final attack approach
        const direction = this.normalize({
            x: squid.huntTarget.x - squid.x,
            y: squid.huntTarget.y - squid.y
        });
        
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
        // Gentle settling movement
        const settleDirection = {
            x: (Math.random() - 0.5) * 0.2,
            y: 0.1
        };
        jetSystem.finPropulsion(squid, settleDirection, 0.2);
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