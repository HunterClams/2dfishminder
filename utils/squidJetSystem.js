// GiantSquid Jet Propulsion System - Advanced movement mechanics
// Handles jet propulsion, mantle contraction, and movement forces

class SquidJetSystem {
    constructor() {
        this.config = window.SQUID_CONFIG;
    }

    /**
     * Initialize jet propulsion system for a squid
     * @param {Object} squid - The squid entity
     */
    initializeJetSystem(squid) {
        squid.jetPower = 0;
        squid.jetDirection = { x: 0, y: 0 };
        squid.jetCooldown = 0;
        squid.jetDuration = 0;
        squid.mantle = {
            contracted: false,
            contractTime: 0,
            cycleTime: 0
        };
    }

    /**
     * Activate jet propulsion
     * @param {Object} squid - The squid entity
     * @param {Object} direction - Direction vector {x, y}
     * @param {number} power - Jet power (0-1)
     */
    jet(squid, direction, power = 1.0) {
        if (squid.jetCooldown <= 0) {
            squid.jetPower = power;
            squid.jetDirection.x = direction.x;
            squid.jetDirection.y = direction.y;
            squid.jetDuration = this.config.JET_BASE_DURATION + (power * this.config.JET_POWER_MULTIPLIER);
            squid.jetCooldown = this.config.JET_BASE_COOLDOWN + (power * this.config.JET_COOLDOWN_MULTIPLIER);
            squid.mantle.contracted = true;
            squid.mantle.contractTime = this.config.MANTLE_CONTRACT_TIME;
            
            // Immediate velocity change from jet
            const jetForce = power * this.config.JET_FORCE_MULTIPLIER;
            squid.velocity.x += direction.x * jetForce;
            squid.velocity.y += direction.y * jetForce;
        }
    }

    /**
     * Apply fin-based gentle movement
     * @param {Object} squid - The squid entity
     * @param {Object} direction - Direction vector {x, y}
     * @param {number} intensity - Movement intensity (0-1)
     */
    finPropulsion(squid, direction, intensity = 0.5) {
        const finForce = intensity * this.config.FIN_FORCE_MULTIPLIER;
        squid.velocity.x += direction.x * finForce;
        squid.velocity.y += direction.y * finForce;
        squid.finUndulation += 0.3;
    }

    /**
     * Apply tentacle movement for fine positioning
     * @param {Object} squid - The squid entity
     * @param {Object} direction - Direction vector {x, y}
     * @param {number} strength - Movement strength (0-1)
     */
    tentacleAdjust(squid, direction, strength = 0.3) {
        const tentacleForce = strength * this.config.TENTACLE_FORCE_MULTIPLIER;
        squid.velocity.x += direction.x * tentacleForce;
        squid.velocity.y += direction.y * tentacleForce;
        squid.tentaclePulse += 0.2;
    }

    /**
     * Update jet propulsion system
     * @param {Object} squid - The squid entity
     */
    updateJetSystem(squid) {
        // Update jet duration
        if (squid.jetDuration > 0) {
            squid.jetDuration--;
            // Apply continuous jet force
            squid.velocity.x += squid.jetDirection.x * squid.jetPower * this.config.JET_CONTINUOUS_FORCE;
            squid.velocity.y += squid.jetDirection.y * squid.jetPower * this.config.JET_CONTINUOUS_FORCE;
        }
        
        // Update jet cooldown
        if (squid.jetCooldown > 0) {
            squid.jetCooldown--;
        }
        
        // Update mantle contraction
        if (squid.mantle.contracted) {
            squid.mantle.contractTime--;
            if (squid.mantle.contractTime <= 0) {
                squid.mantle.contracted = false;
            }
        }
    }

    /**
     * Update animation timers
     * @param {Object} squid - The squid entity
     */
    updateAnimationTimers(squid) {
        squid.finUndulation += this.config.FIN_UNDULATION_SPEED;
        squid.tentaclePulse += this.config.TENTACLE_PULSE_SPEED;
        
        // Update bioluminescent blinking
        squid.blinkTimer += this.config.BLINK_TIMER_INCREMENT;
        if (squid.blinkTimer >= this.config.BLINK_CYCLE) {
            squid.blinkTimer = 0; // Reset timer
        }
    }

    /**
     * Apply movement physics
     * @param {Object} squid - The squid entity
     */
    applyMovementPhysics(squid) {
        // Apply drag (squids are not as streamlined as fish)
        squid.velocity.x *= this.config.DRAG_FACTOR;
        squid.velocity.y *= this.config.DRAG_FACTOR;
        
        // Calculate current speed for animation
        squid.currentSpeed = Math.hypot(squid.velocity.x, squid.velocity.y);
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(squid.velocity, squid.maxSpeed);
        }
    }

    /**
     * Check if squid is currently jetting
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if jetting
     */
    isJetting(squid) {
        return squid.jetDuration > 0;
    }

    /**
     * Check if squid can jet (not on cooldown)
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if can jet
     */
    canJet(squid) {
        return squid.jetCooldown <= 0;
    }

    /**
     * Check if mantle is contracted
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if mantle is contracted
     */
    isMantleContracted(squid) {
        return squid.mantle.contracted;
    }

    /**
     * Check if squid is blinking
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if blinking
     */
    isBlinking(squid) {
        return squid.blinkTimer < this.config.BLINK_DURATION;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SquidJetSystem = SquidJetSystem;
} 