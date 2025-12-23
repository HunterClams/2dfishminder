// Tuna Physics System - Movement, physics, and edge handling for tuna
// Handles force application, velocity management, edge handling, and movement physics

class TunaPhysicsSystem {
    constructor() {
        // Safety check for config
        this.config = window.TUNA_CONFIG || {};
        console.log('⚙️ TunaPhysicsSystem loaded successfully');
    }

    /**
     * Initialize physics system for a tuna
     * @param {Object} tuna - The tuna entity
     */
    initializePhysicsSystem(tuna) {
        // Ensure velocity is initialized
        if (!tuna.velocity) {
            tuna.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
        }
        
        // Ensure acceleration is initialized
        if (!tuna.acceleration) {
            tuna.acceleration = { x: 0, y: 0 };
        }
        
        // Initialize depth preferences - allow hunting in shallower waters
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        tuna.preferredDepth = WORLD_HEIGHT * 0.4; // Reduced from 0.6 to 0.4 (40% depth - mid-shallow waters)
        tuna.depthTolerance = WORLD_HEIGHT * 0.4; // Increased from 0.3 to 0.4 (40% tolerance - 0% to 80% depth range)
    }

    /**
     * Apply force to acceleration
     * @param {Object} tuna - The tuna entity
     * @param {Object} force - Force vector {x, y}
     */
    applyForce(tuna, force) {
        if (!tuna.acceleration) {
            tuna.acceleration = { x: 0, y: 0 };
        }
        tuna.acceleration.x += force.x;
        tuna.acceleration.y += force.y;
    }

    /**
     * Handle world edges
     * @param {Object} tuna - The tuna entity
     */
    handleEdges(tuna) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(tuna, 50, 0.9, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }

    /**
     * Apply movement physics and update position
     * @param {Object} tuna - The tuna entity
     */
    updatePhysics(tuna) {
        // CRITICAL: Check and clamp position BEFORE applying forces to prevent getting stuck
        // ENHANCED: Allow tuna to get close to edges when hunting (to catch stuck fry)
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        // When hunting, allow closer approach to edges (10px) to catch prey stuck at walls
        // When patrolling, use larger margin (25px) for safety
        const isHunting = tuna.aiState === window.TUNA_STATES.HUNTING;
        const minMargin = isHunting ? 10 : 25; // Closer when hunting, safer when patrolling
        
        // Clamp position first to prevent going outside bounds
        // But allow hunting tuna to get very close to edges
        if (tuna.x < minMargin) {
            tuna.x = minMargin;
            // When hunting, allow velocity toward edge (to pursue prey), just clamp position
            if (!isHunting && tuna.velocity.x < 0) tuna.velocity.x = 0;
        } else if (tuna.x > WORLD_WIDTH - minMargin) {
            tuna.x = WORLD_WIDTH - minMargin;
            if (!isHunting && tuna.velocity.x > 0) tuna.velocity.x = 0;
        }
        
        if (tuna.y < minMargin) {
            tuna.y = minMargin;
            if (!isHunting && tuna.velocity.y < 0) tuna.velocity.y = 0;
        } else if (tuna.y > WORLD_HEIGHT - minMargin) {
            tuna.y = WORLD_HEIGHT - minMargin;
            if (!isHunting && tuna.velocity.y > 0) tuna.velocity.y = 0;
        }
        
        // Apply acceleration to velocity
        if (tuna.acceleration) {
            tuna.velocity.x += tuna.acceleration.x;
            tuna.velocity.y += tuna.acceleration.y;
            
            // Reset acceleration
            tuna.acceleration.x = 0;
            tuna.acceleration.y = 0;
        }
        
        // Limit velocity (respect speed boost from state)
        if (window.Utils && window.Utils.limitVelocity) {
            const speedBoost = tuna.currentSpeedBoost || 1.0;
            window.Utils.limitVelocity(tuna.velocity, tuna.maxSpeed * speedBoost);
        }
        
        // Apply depth preference
        this.applyDepthPreference(tuna);
        
        // Apply edge avoidance (reduced or disabled when hunting to allow approaching walls)
        this.applyEdgeAvoidance(tuna);
        
        // Update position
        tuna.x += tuna.velocity.x;
        tuna.y += tuna.velocity.y;
        
        // Final safety clamp after movement (prevents any possibility of going outside)
        // Use same margin logic as before
        if (tuna.x < minMargin) {
            tuna.x = minMargin;
            // When hunting, allow velocity toward edge (to pursue prey at walls)
            if (!isHunting) tuna.velocity.x = Math.max(0, tuna.velocity.x);
        }
        if (tuna.x > WORLD_WIDTH - minMargin) {
            tuna.x = WORLD_WIDTH - minMargin;
            if (!isHunting) tuna.velocity.x = Math.min(0, tuna.velocity.x);
        }
        if (tuna.y < minMargin) {
            tuna.y = minMargin;
            if (!isHunting) tuna.velocity.y = Math.max(0, tuna.velocity.y);
        }
        if (tuna.y > WORLD_HEIGHT - minMargin) {
            tuna.y = WORLD_HEIGHT - minMargin;
            if (!isHunting) tuna.velocity.y = Math.min(0, tuna.velocity.y);
        }
        
        // NOTE: Removed handleEdges call - we now handle edges directly with position clamping
        // This prevents velocity reversal oscillation that could cause sticking
    }

    /**
     * Apply depth preference forces
     * @param {Object} tuna - The tuna entity
     */
    applyDepthPreference(tuna) {
        // Only apply depth preference when not hunting
        if (tuna.aiState === window.TUNA_STATES.HUNTING) {
            return; // Skip depth preference during active hunting
        }
        
        const depthDifference = tuna.y - tuna.preferredDepth;
        if (Math.abs(depthDifference) > tuna.depthTolerance) {
            // Much gentler depth force - reduced from 0.0001 to 0.00001 (10x weaker)
            const depthForce = -depthDifference * 0.00001;
            this.applyForce(tuna, { x: 0, y: depthForce * tuna.maxForce });
        }
    }

    /**
     * Apply edge avoidance forces
     * ENHANCED: Reduced or disabled when hunting to allow approaching walls to catch stuck prey
     * @param {Object} tuna - The tuna entity
     */
    applyEdgeAvoidance(tuna) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const isHunting = tuna.aiState === window.TUNA_STATES.HUNTING;
        
        // When hunting, reduce edge avoidance significantly to allow approaching walls
        // When patrolling, use normal edge avoidance
        const edgeBuffer = isHunting ? 100 : 300; // Smaller buffer when hunting
        const maxForceMultiplier = isHunting ? 0.2 : 1.5; // Much weaker force when hunting
        
        // Calculate distance from each edge
        const distFromLeft = tuna.x;
        const distFromRight = WORLD_WIDTH - tuna.x;
        const distFromTop = tuna.y;
        const distFromBottom = WORLD_HEIGHT - tuna.y;
        
        // Horizontal edge avoidance with distance-based strength
        // When hunting, only apply weak force when very close to edge
        if (distFromLeft < edgeBuffer) {
            const forceStrength = (1.0 - distFromLeft / edgeBuffer) * maxForceMultiplier;
            // When hunting, only apply force if very close (within 50px)
            if (!isHunting || distFromLeft < 50) {
                this.applyForce(tuna, { x: tuna.maxForce * forceStrength, y: 0 });
            }
        } else if (distFromRight < edgeBuffer) {
            const forceStrength = (1.0 - distFromRight / edgeBuffer) * maxForceMultiplier;
            if (!isHunting || distFromRight < 50) {
                this.applyForce(tuna, { x: -tuna.maxForce * forceStrength, y: 0 });
            }
        }
        
        // Vertical edge avoidance with distance-based strength
        if (distFromTop < edgeBuffer) {
            const forceStrength = (1.0 - distFromTop / edgeBuffer) * maxForceMultiplier;
            if (!isHunting || distFromTop < 50) {
                this.applyForce(tuna, { x: 0, y: tuna.maxForce * forceStrength });
            }
        } else if (distFromBottom < edgeBuffer) {
            const forceStrength = (1.0 - distFromBottom / edgeBuffer) * maxForceMultiplier;
            if (!isHunting || distFromBottom < 50) {
                this.applyForce(tuna, { x: 0, y: -tuna.maxForce * forceStrength });
            }
        }
    }

    /**
     * Apply wander forces for patrolling behavior
     * @param {Object} tuna - The tuna entity
     */
    applyWanderForces(tuna) {
        if (!tuna.wanderTarget) {
            tuna.wanderTarget = this.generateWanderTarget(tuna);
        }
        
        const distToWander = window.Utils.distance(tuna, tuna.wanderTarget);
        
        if (distToWander < 30) {
            tuna.wanderTarget = this.generateWanderTarget(tuna);
        }
        
        const wander = window.Utils.calculateSteering(
            tuna, 
            tuna.wanderTarget, 
            tuna.maxSpeed * this.config.patrolSpeed, 
            tuna.maxForce
        );
        
        this.applyForce(tuna, {
            x: wander.x * 0.5,
            y: wander.y * 0.5
        });
    }

    /**
     * Generate a random wander target
     * @param {Object} tuna - The tuna entity
     * @returns {Object} Wander target position {x, y}
     */
    generateWanderTarget(tuna) {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.config.wanderRadius * (0.5 + Math.random() * 0.5);
        
        return {
            x: tuna.x + Math.cos(angle) * distance,
            y: tuna.y + Math.sin(angle) * distance
        };
    }

    /**
     * Find a good resting spot
     * @param {Object} tuna - The tuna entity
     * @returns {Object} Resting spot position {x, y}
     */
    findRestingSpot(tuna) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        
        return {
            x: Math.max(100, Math.min(WORLD_WIDTH - 100, tuna.x + (Math.random() - 0.5) * 200)),
            y: Math.max(WORLD_HEIGHT * 0.6, Math.min(WORLD_HEIGHT - 100, tuna.y + Math.random() * 100))
        };
    }

    /**
     * Apply rest movement forces
     * @param {Object} tuna - The tuna entity
     */
    applyRestForces(tuna) {
        if (!tuna.restingSpot) {
            tuna.restingSpot = this.findRestingSpot(tuna);
        }
        
        if (tuna.restingSpot) {
            const distToRest = window.Utils.distance(tuna, tuna.restingSpot);
            if (distToRest > 20) {
                const restForce = window.Utils.calculateSteering(tuna, tuna.restingSpot, tuna.maxSpeed * 0.5, tuna.maxForce);
                this.applyForce(tuna, {
                    x: restForce.x * 0.3,
                    y: restForce.y * 0.3
                });
            }
        }
    }

    /**
     * Update cooldown timers
     * @param {Object} tuna - The tuna entity
     */
    updateEnergy(tuna) {
        // Update hunt cooldown
        if (tuna.huntCooldown > 0) {
            tuna.huntCooldown--;
        }
    }

    /**
     * Get current speed of tuna
     * @param {Object} tuna - The tuna entity
     * @returns {number} Current speed
     */
    getCurrentSpeed(tuna) {
        return Math.hypot(tuna.velocity.x, tuna.velocity.y);
    }

    /**
     * Check if tuna is moving
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if tuna is moving
     */
    isMoving(tuna) {
        const speed = this.getCurrentSpeed(tuna);
        return speed > 0.1; // Threshold for considering movement
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaPhysicsSystem = TunaPhysicsSystem;
} 