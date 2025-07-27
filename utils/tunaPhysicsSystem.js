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
        // Apply acceleration to velocity
        if (tuna.acceleration) {
            tuna.velocity.x += tuna.acceleration.x;
            tuna.velocity.y += tuna.acceleration.y;
            
            // Reset acceleration
            tuna.acceleration.x = 0;
            tuna.acceleration.y = 0;
        }
        
        // Limit velocity (safety check)
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(tuna.velocity, tuna.maxSpeed);
        }
        
        // Apply depth preference
        this.applyDepthPreference(tuna);
        
        // Apply edge avoidance
        this.applyEdgeAvoidance(tuna);
        
        // Update position
        tuna.x += tuna.velocity.x;
        tuna.y += tuna.velocity.y;
        
        // Handle world edges
        this.handleEdges(tuna);
    }

    /**
     * Apply depth preference forces
     * @param {Object} tuna - The tuna entity
     */
    applyDepthPreference(tuna) {
        // Only apply depth preference when not hunting or attacking
        if (tuna.aiState === window.TUNA_STATES.HUNTING || tuna.aiState === window.TUNA_STATES.ATTACKING) {
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
     * @param {Object} tuna - The tuna entity
     */
    applyEdgeAvoidance(tuna) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const edgeBuffer = 200;
        
        if (tuna.x < edgeBuffer) {
            this.applyForce(tuna, { x: tuna.maxForce * 0.5, y: 0 });
        } else if (tuna.x > WORLD_WIDTH - edgeBuffer) {
            this.applyForce(tuna, { x: -tuna.maxForce * 0.5, y: 0 });
        }
        
        if (tuna.y < edgeBuffer) {
            this.applyForce(tuna, { x: 0, y: tuna.maxForce * 0.5 });
        } else if (tuna.y > WORLD_HEIGHT - edgeBuffer) {
            this.applyForce(tuna, { x: 0, y: -tuna.maxForce * 0.5 });
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
     * Update energy over time
     * @param {Object} tuna - The tuna entity
     */
    updateEnergy(tuna) {
        // Decrease energy over time
        tuna.energy = Math.max(0, tuna.energy - 0.02);
        
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