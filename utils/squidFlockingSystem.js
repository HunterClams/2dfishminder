// Squid Flocking System - Simple repulsion-based schooling for squids
// Makes squids avoid being too close to each other

class SquidFlockingSystem {
    constructor() {
        this.constants = {
            REPULSION_RADIUS: 200, // Increased from 80 to 200 for more noticeable repulsion
            REPULSION_FORCE: 2.0, // Increased from 0.8 to 2.0 for stronger repulsion
            MAX_FORCE: 0.3, // Increased from 0.1 to 0.3 for stronger movement
            RANDOM_FORCE: 0.05 // Increased from 0.02 to 0.05 for more movement
        };
        
        this.performanceStats = {
            queries: 0,
            lastReset: 0
        };
        
        console.log('🦑 SquidFlockingSystem initialized with enhanced repulsion');
    }
    
    /**
     * Main flocking method for squids
     * @param {Object} squid - The squid to update
     * @param {Array} allSquids - Array of all squids in the game
     */
    flock(squid, allSquids) {
        this.performanceStats.queries++;
        
        // Debug output only when debug is enabled
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 180 === 0) {
            console.log(`🦑 Squid flocking called for squid at (${Math.round(squid.x)}, ${Math.round(squid.y)}) with ${allSquids.length} total squids`);
        }
        
        // Calculate repulsion forces from nearby squids
        const forces = this.calculateRepulsionForces(squid, allSquids);
        
        // Apply forces to squid velocity
        squid.velocity.x += forces.x;
        squid.velocity.y += forces.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(squid.velocity, squid.maxSpeed);
        }
        
        // Debug logging
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 120 === 0) {
            console.log(`🦑 Squid flocking:`, {
                squidId: squid.x + squid.y,
                repulsionForces: { x: Math.round(forces.x * 100) / 100, y: Math.round(forces.y * 100) / 100 },
                currentPosition: { x: Math.round(squid.x), y: Math.round(squid.y) },
                currentVelocity: { x: Math.round(squid.velocity.x * 100) / 100, y: Math.round(squid.velocity.y * 100) / 100 }
            });
        }
    }
    
    /**
     * Apply minimal flocking during hunting to prevent interference with hunting behavior
     * @param {Object} squid - The squid to update
     * @param {Array} allSquids - Array of all squids in the game
     */
    applyMinimalFlocking(squid, allSquids) {
        // Only apply very minimal repulsion to prevent direct overlap during hunting
        const forces = this.calculateRepulsionForces(squid, allSquids);
        
        // Apply only 10% of normal flocking force during hunting
        const reducedForceX = forces.x * 0.1;
        const reducedForceY = forces.y * 0.1;
        
        squid.velocity.x += reducedForceX;
        squid.velocity.y += reducedForceY;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(squid.velocity, squid.maxSpeed);
        }
    }
    
    /**
     * Calculate repulsion forces from nearby squids
     * @param {Object} squid - The squid to calculate forces for
     * @param {Array} allSquids - Array of all squids
     * @returns {Object} Forces to apply {x, y}
     */
    calculateRepulsionForces(squid, allSquids) {
        const forces = { x: 0, y: 0 };
        const repulsionRadiusSquared = this.constants.REPULSION_RADIUS * this.constants.REPULSION_RADIUS;
        let repulsionCount = 0;
        
        // Debug logging for repulsion calculation
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 180 === 0) {
            console.log(`🦑 Calculating repulsion forces:`, {
                totalSquids: allSquids.length,
                repulsionRadius: this.constants.REPULSION_RADIUS,
                currentSquidPosition: { x: Math.round(squid.x), y: Math.round(squid.y) }
            });
        }
        
        // Check all other squids for repulsion
        for (let other of allSquids) {
            if (other === squid) continue;
            
            const distSquared = this.distanceSquared(squid, other);
            
            // If squid is within repulsion radius, apply repulsion force
            if (distSquared < repulsionRadiusSquared) {
                const dist = Math.sqrt(distSquared);
                
                // Debug output for repulsion only when debug is enabled
                if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 180 === 0) {
                    console.log(`🦑 REPULSION DETECTED! Squid at (${Math.round(squid.x)}, ${Math.round(squid.y)}) repelling from squid at (${Math.round(other.x)}, ${Math.round(other.y)}) - Distance: ${Math.round(dist)}`);
                }
                
                // Calculate repulsion direction (away from other squid)
                const repulsionX = (squid.x - other.x) / dist;
                const repulsionY = (squid.y - other.y) / dist;
                
                // Apply repulsion force (stronger when closer)
                const repulsionStrength = this.constants.REPULSION_FORCE * (1 - dist / this.constants.REPULSION_RADIUS);
                forces.x += repulsionX * repulsionStrength;
                forces.y += repulsionY * repulsionStrength;
                
                repulsionCount++;
                
                // Debug logging for repulsion application
                if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 180 === 0) {
                    console.log(`🦑 Repulsion applied:`, {
                        distance: Math.round(dist),
                        repulsionStrength: Math.round(repulsionStrength * 100) / 100,
                        repulsionDirection: { x: Math.round(repulsionX * 100) / 100, y: Math.round(repulsionY * 100) / 100 },
                        otherSquidPosition: { x: Math.round(other.x), y: Math.round(other.y) }
                    });
                }
            }
        }
        
        // Add small random movement to prevent getting stuck
        const randomAngle = Math.random() * Math.PI * 2;
        forces.x += Math.cos(randomAngle) * this.constants.RANDOM_FORCE;
        forces.y += Math.sin(randomAngle) * this.constants.RANDOM_FORCE;
        
        // Limit total force
        const totalForce = Math.sqrt(forces.x * forces.x + forces.y * forces.y);
        if (totalForce > this.constants.MAX_FORCE) {
            forces.x = (forces.x / totalForce) * this.constants.MAX_FORCE;
            forces.y = (forces.y / totalForce) * this.constants.MAX_FORCE;
        }
        
        // Debug logging for final forces
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 180 === 0) {
            console.log(`🦑 Final repulsion forces:`, {
                repulsionCount: repulsionCount,
                totalForces: { x: Math.round(forces.x * 100) / 100, y: Math.round(forces.y * 100) / 100 },
                totalForceMagnitude: Math.round(totalForce * 100) / 100
            });
        }
        
        return forces;
    }
    
    /**
     * Calculate squared distance between two objects
     * @param {Object} obj1 - First object with x, y coordinates
     * @param {Object} obj2 - Second object with x, y coordinates
     * @returns {number} Squared distance
     */
    distanceSquared(obj1, obj2) {
        return (obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2;
    }
    
    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getStats() {
        return {
            queries: this.performanceStats.queries,
            repulsionRadius: this.constants.REPULSION_RADIUS,
            repulsionForce: this.constants.REPULSION_FORCE
        };
    }
    
    /**
     * Reset performance statistics
     */
    reset() {
        this.performanceStats.queries = 0;
        this.performanceStats.lastReset = Date.now();
    }
}

// Make globally accessible
window.SquidFlockingSystem = SquidFlockingSystem; 