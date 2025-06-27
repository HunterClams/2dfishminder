// Tuna Threat System - Threat detection and response for tuna
// Handles detection of predators (squids) and flee response

class TunaThreatSystem {
    constructor() {
        // Safety check for config
        this.config = window.TUNA_CONFIG || {};
        console.log('⚠️ TunaThreatSystem loaded successfully');
    }

    /**
     * Initialize threat system for a tuna
     * @param {Object} tuna - The tuna entity
     */
    initializeThreatSystem(tuna) {
        tuna.lastThreatDetection = 0;
        tuna.threatLevel = 0;
    }

    /**
     * Check for giant squid threats
     * @param {Object} tuna - The tuna entity
     * @param {Array} squid - Array of squid entities
     */
    checkForThreats(tuna, squid = []) {
        if (!squid.length) return;
        
        for (let s of squid) {
            const distance = window.Utils.distance(tuna, s);
            if (distance < this.config.fleeRadius) { // Use config flee radius
                // Transition to fleeing state if AI is available
                if (window.TunaAI && tuna.aiState !== window.TunaAI.states.FLEEING) {
                    window.TunaAI.transitionToState(tuna, window.TunaAI.states.FLEEING);
                }
                
                // Update threat tracking
                tuna.lastThreatDetection = Date.now();
                tuna.threatLevel = Math.max(tuna.threatLevel, 1 - (distance / this.config.fleeRadius));
                break;
            }
        }
        
        // Gradually reduce threat level over time
        if (tuna.threatLevel > 0) {
            tuna.threatLevel = Math.max(0, tuna.threatLevel - 0.01);
        }
    }

    /**
     * Find all threats within detection range
     * @param {Object} tuna - The tuna entity
     * @param {Object} gameEntities - Game entities object
     * @returns {Array} Array of threat entities
     */
    findThreats(tuna, gameEntities) {
        const threats = [];
        const threatRadius = this.config.fleeRadius;
        
        for (let squid of gameEntities.squid || []) {
            const distance = window.Utils.distance(tuna, squid);
            if (distance < threatRadius) {
                threats.push({
                    entity: squid,
                    distance: distance,
                    threatLevel: 1 - (distance / threatRadius)
                });
            }
        }
        
        return threats.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Calculate threat level based on distance and number of threats
     * @param {Object} tuna - The tuna entity
     * @param {Array} threats - Array of threat objects
     * @returns {number} Threat level (0-1)
     */
    calculateThreatLevel(tuna, threats) {
        if (threats.length === 0) return 0;
        
        let totalThreat = 0;
        for (let threat of threats) {
            totalThreat += threat.threatLevel;
        }
        
        return Math.min(1, totalThreat / threats.length);
    }

    /**
     * Check if tuna should flee based on threats
     * @param {Object} tuna - The tuna entity
     * @param {Array} threats - Array of threat objects
     * @returns {boolean} True if tuna should flee
     */
    shouldFlee(tuna, threats) {
        if (threats.length === 0) return false;
        
        // Always flee if any threat is very close
        const closestThreat = threats[0];
        if (closestThreat.distance < this.config.fleeRadius * 0.5) {
            return true;
        }
        
        // Flee if multiple threats are present
        if (threats.length > 1) {
            return true;
        }
        
        // Flee if threat level is high
        const threatLevel = this.calculateThreatLevel(tuna, threats);
        return threatLevel > 0.7;
    }

    /**
     * Get flee direction away from threats
     * @param {Object} tuna - The tuna entity
     * @param {Array} threats - Array of threat objects
     * @returns {Object} Normalized flee direction {x, y}
     */
    getFleeDirection(tuna, threats) {
        if (threats.length === 0) {
            return { x: 0, y: 0 };
        }
        
        let fleeX = 0, fleeY = 0;
        
        for (let threat of threats) {
            const distance = threat.distance;
            const strength = this.config.fleeRadius / distance;
            
            fleeX += (tuna.x - threat.entity.x) * strength;
            fleeY += (tuna.y - threat.entity.y) * strength;
        }
        
        if (threats.length > 0) {
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
     * Apply flee forces based on threats
     * @param {Object} tuna - The tuna entity
     * @param {Array} threats - Array of threat objects
     */
    applyFleeForces(tuna, threats) {
        if (threats.length === 0) return;
        
        const fleeDirection = this.getFleeDirection(tuna, threats);
        const threatLevel = this.calculateThreatLevel(tuna, threats);
        
        // Apply flee force with reduced multiplier (as configured in steering forces)
        const fleeForce = 0.1; // This matches the current configuration
        tuna.applyForce({
            x: fleeDirection.x * tuna.maxForce * fleeForce,
            y: fleeDirection.y * tuna.maxForce * fleeForce
        });
    }

    /**
     * Check if tuna is currently under threat
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if tuna is under threat
     */
    isUnderThreat(tuna) {
        return tuna.threatLevel > 0.1;
    }

    /**
     * Get time since last threat detection
     * @param {Object} tuna - The tuna entity
     * @returns {number} Time in milliseconds since last threat
     */
    getTimeSinceLastThreat(tuna) {
        return Date.now() - tuna.lastThreatDetection;
    }

    /**
     * Check if tuna should stop fleeing (no threats for a while)
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if tuna should stop fleeing
     */
    shouldStopFleeing(tuna) {
        const timeSinceThreat = this.getTimeSinceLastThreat(tuna);
        return timeSinceThreat > 5000; // Stop fleeing after 5 seconds without threats
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaThreatSystem = TunaThreatSystem;
} 