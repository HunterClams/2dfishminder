// Boid Threat System - Threat detection and response for fry/boids
// Handles detection of predators (tuna and giant squids) and flee response
// Similar to TunaThreatSystem but adapted for boids

class BoidThreatSystem {
    constructor() {
        // Make globally available first
        if (typeof window !== 'undefined') {
            window.BoidThreatSystem = this;
        }
    }
    
    /**
     * Get config - lazy load to ensure BoidConfig is initialized
     */
    getConfig() {
        return window.BoidConfig?.BEHAVIOR_CONFIG || {};
    }
    
    /**
     * Get flee radius - lazy load to ensure config is available
     */
    getFleeRadius() {
        const config = this.getConfig();
        const radius = config.fleeRadius || 252; // Default to 252 to match BoidConfig.BEHAVIOR_CONFIG.fleeRadius
        
        // Debug: Log if config is missing or wrong
        if (!config.fleeRadius && window.gameState && window.gameState.fryDebug) {
            console.warn(`⚠️ BoidThreatSystem: fleeRadius not found in config, using default ${radius}`);
            console.log(`   Config object:`, config);
            console.log(`   BoidConfig.BEHAVIOR_CONFIG:`, window.BoidConfig?.BEHAVIOR_CONFIG);
        }
        
        return radius;
    }
    
    /**
     * Get flee speed - lazy load to ensure config is available
     */
    getFleeSpeed() {
        const config = this.getConfig();
        return config.fleeSpeed || 1.3;
    }

    /**
     * Initialize threat system properties for a boid
     * @param {Object} boid - The boid entity
     */
    initializeThreatSystem(boid) {
        if (!boid.threatLevel) boid.threatLevel = 0;
        if (!boid.lastThreatDetection) boid.lastThreatDetection = 0;
    }

    /**
     * Check for predator threats (tuna and giant squids)
     * @param {Object} boid - The boid entity
     * @param {Array} predators - Array of predator (tuna) entities
     * @param {Array} squids - Array of giant squid entities
     * @returns {Array} Array of threat entities
     */
    findThreats(boid, predators = [], squids = []) {
        const threats = [];
        const threatRadius = this.getFleeRadius(); // Use lazy-loaded config
        
        // Debug logging (only log occasionally to avoid spam)
        const shouldDebug = window.gameState && window.gameState.fryDebug;
        const frameCount = boid.frameCount || 0;
        const logThisFrame = shouldDebug && frameCount % 120 === 0;
        
        if (logThisFrame) {
            console.log(`🔍 BoidThreatSystem.findThreats:`, {
                boidType: boid.fishType,
                boidPos: { x: Math.round(boid.x), y: Math.round(boid.y) },
                threatRadius: Math.round(threatRadius),
                predatorsCount: predators ? predators.length : 0,
                squidsCount: squids ? squids.length : 0
            });
        }
        
        // Check for tuna threats
        if (predators && predators.length > 0) {
            for (let predator of predators) {
                // CRITICAL: Check if predator is valid and has position
                if (!predator) continue;
                if (predator.x === undefined || predator.x === null) continue;
                if (predator.y === undefined || predator.y === null) continue;
                
                const distance = window.Utils ? window.Utils.distance(boid, predator) : 
                    Math.sqrt((boid.x - predator.x) ** 2 + (boid.y - predator.y) ** 2);
                
                if (logThisFrame) {
                    console.log(`  🐟 Checking predator:`, {
                        distance: Math.round(distance),
                        threatRadius: Math.round(threatRadius),
                        withinRange: distance < threatRadius,
                        predatorPos: { x: Math.round(predator.x), y: Math.round(predator.y) },
                        predatorType: predator.tunaType || predator.constructor?.name || 'unknown'
                    });
                }
                
                if (distance < threatRadius) {
                    threats.push({
                        entity: predator,
                        distance: distance,
                        threatLevel: 1 - (distance / threatRadius),
                        type: 'tuna'
                    });
                    
                    // Always log threat detection (not just every 120 frames)
                    if (shouldDebug) {
                        console.log(`  ⚠️ THREAT DETECTED! Tuna at distance ${Math.round(distance)}px (radius: ${Math.round(threatRadius)}px)`);
                    }
                }
            }
        }
        
        // Check for giant squid threats
        if (squids && squids.length > 0) {
            for (let squid of squids) {
                if (!squid || !squid.x || !squid.y) continue;
                const distance = window.Utils.distance(boid, squid);
                if (distance < threatRadius) {
                    threats.push({
                        entity: squid,
                        distance: distance,
                        threatLevel: 1 - (distance / threatRadius),
                        type: 'squid'
                    });
                }
            }
        }
        
        // Sort by distance (closest first)
        return threats.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Calculate threat level based on distance and number of threats
     * @param {Object} boid - The boid entity
     * @param {Array} threats - Array of threat objects
     * @returns {number} Threat level (0-1)
     */
    calculateThreatLevel(boid, threats) {
        if (threats.length === 0) return 0;
        
        let totalThreat = 0;
        for (let threat of threats) {
            totalThreat += threat.threatLevel;
        }
        
        return Math.min(1, totalThreat / threats.length);
    }

    /**
     * Get flee direction away from threats
     * @param {Object} boid - The boid entity
     * @param {Array} threats - Array of threat objects
     * @returns {Object} Normalized flee direction {x, y}
     */
    getFleeDirection(boid, threats) {
        if (threats.length === 0) {
            return { x: 0, y: 0 };
        }
        
        let fleeX = 0, fleeY = 0;
        
        for (let threat of threats) {
            const distance = threat.distance;
            if (distance <= 0) continue;
            
            // Strength inversely proportional to distance (stronger when closer)
            const strength = this.getFleeRadius() / distance; // Use lazy-loaded config
            
            // Direction away from threat
            fleeX += (boid.x - threat.entity.x) * strength;
            fleeY += (boid.y - threat.entity.y) * strength;
        }
        
        if (threats.length > 0) {
            // Average the flee directions
            fleeX /= threats.length;
            fleeY /= threats.length;
            
            // Normalize the direction
            const magnitude = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
            if (magnitude > 0) {
                fleeX /= magnitude;
                fleeY /= magnitude;
            }
        }
        
        return { x: fleeX, y: fleeY };
    }

    /**
     * Apply flee forces to boid velocity
     * Similar to tuna's applyFleeForces but adapted for boids
     * @param {Object} boid - The boid entity
     * @param {Array} threats - Array of threat objects
     */
    applyFleeForces(boid, threats) {
        if (threats.length === 0) return;
        
        // Get normalized flee direction
        const fleeDir = this.getFleeDirection(boid, threats);
        
        // Calculate desired velocity (flee direction * max speed * flee speed boost)
        const maxSpeed = boid.maxSpeed * this.getFleeSpeed(); // Use lazy-loaded config
        const desiredX = fleeDir.x * maxSpeed;
        const desiredY = fleeDir.y * maxSpeed;
        
        // Calculate steering force (desired velocity - current velocity)
        const steerX = desiredX - boid.velocity.x;
        const steerY = desiredY - boid.velocity.y;
        
        // Limit steering force to maxForce - but make fleeing forces MUCH stronger
        const steerMag = Math.sqrt(steerX * steerX + steerY * steerY);
        const maxForce = boid.maxForce || this.config.maxForce || 0.06;
        let finalSteerX = steerX;
        let finalSteerY = steerY;
        
        // CRITICAL: Make fleeing forces 3x stronger to override any flocking forces
        const fleeForceMultiplier = 3.0;
        
        if (steerMag > maxForce) {
            finalSteerX = (steerX / steerMag) * maxForce * fleeForceMultiplier;
            finalSteerY = (steerY / steerMag) * maxForce * fleeForceMultiplier;
        } else {
            finalSteerX *= fleeForceMultiplier; // Boost flee force
            finalSteerY *= fleeForceMultiplier;
        }
        
        // Apply flee force directly to velocity (similar to how boids apply forces)
        const oldVelX = boid.velocity.x;
        const oldVelY = boid.velocity.y;
        boid.velocity.x += finalSteerX;
        boid.velocity.y += finalSteerY;
        
        // Limit velocity to max speed (with flee speed boost)
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(boid.velocity, maxSpeed);
        }
        
        // Update threat tracking
        boid.lastThreatDetection = Date.now();
        boid.threatLevel = this.calculateThreatLevel(boid, threats);
        
        // Debug logging - always log when fleeing forces are applied
        const shouldDebug = window.gameState && window.gameState.fryDebug;
        if (shouldDebug) {
            const frameCount = boid.frameCount || 0;
            if (frameCount % 30 === 0) { // Log more frequently when fleeing
                console.log(`🚨 APPLYING FLEE FORCES:`, {
                    boidType: boid.fishType,
                    threats: threats.length,
                    fleeDir: { x: Math.round(fleeDir.x * 100) / 100, y: Math.round(fleeDir.y * 100) / 100 },
                    fleeForce: { x: Math.round(finalSteerX * 1000) / 1000, y: Math.round(finalSteerY * 1000) / 1000 },
                    velocityChange: { 
                        x: Math.round((boid.velocity.x - oldVelX) * 1000) / 1000, 
                        y: Math.round((boid.velocity.y - oldVelY) * 1000) / 1000 
                    },
                    newVelocity: { x: Math.round(boid.velocity.x * 100) / 100, y: Math.round(boid.velocity.y * 100) / 100 },
                    maxSpeed: Math.round(maxSpeed * 100) / 100
                });
            }
        }
        
        // Old debug logging (less frequent)
        if (shouldDebug && boid.frameCount % 60 === 0) {
            console.log(`🐟 Fry fleeing from ${threats.length} threat(s):`, {
                fishType: boid.fishType,
                threats: threats.map(t => ({ type: t.type, distance: Math.round(t.distance) })),
                fleeDirection: { x: Math.round(fleeDir.x * 100) / 100, y: Math.round(fleeDir.y * 100) / 100 },
                threatLevel: Math.round(boid.threatLevel * 100) / 100
            });
        }
    }
}

// Create singleton instance
if (typeof window !== 'undefined') {
    window.boidThreatSystem = new BoidThreatSystem();
}

