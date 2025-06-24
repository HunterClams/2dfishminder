// Squid-specific utilities and behaviors
const SquidUtils = {
    // Squid movement constants
    CONSTANTS: {
        JET_FORCE_MULTIPLIER: 1.68,
        FIN_FORCE_MULTIPLIER: 0.315,
        TENTACLE_FORCE_MULTIPLIER: 0.168,
        DRAG_COEFFICIENT: 0.94,
        DEPTH_ADJUSTMENT_THRESHOLD: 150,
        BLINK_CYCLE: 80,
        BLINK_DURATION: 20,
        VISION_RANGE: 1050,
        ATTACK_RANGE: 315,
        ATTACK_DISTANCE: 220,
        COOLDOWN_DURATION: 10000,
        POOP_IGNORE_DURATION: 8000
    },

    // Depth zone preferences for giant squids
    DEPTH_ZONES: {
        PREFERRED_MIN: 0.75,
        PREFERRED_MAX: 0.95,
        OPTIMAL: 0.85,
        SHALLOW_THRESHOLD: 0.7,
        DEEP_THRESHOLD: 0.95
    },

    // State machine transitions
    STATE_TIMEOUTS: {
        HUNTING: 200,
        ATTACKING: 60,
        RETREATING_WITH_PREY: 180,
        RETREATING_WITHOUT_PREY: 120,
        PATROL_CYCLE: 300
    },

    /**
     * Calculate jet propulsion force and effects
     * @param {Object} squid - The giant squid entity
     * @param {Object} direction - Normalized direction vector
     * @param {number} power - Jet power (0-1)
     * @returns {Object} Force vector and effects
     */
    calculateJetPropulsion(squid, direction, power = 1.0) {
        if (squid.jetCooldown > 0) return null;

        const jetForce = power * this.CONSTANTS.JET_FORCE_MULTIPLIER;
        const duration = 15 + (power * 10);
        const cooldown = 30 + (power * 20);

        return {
            force: {
                x: direction.x * jetForce,
                y: direction.y * jetForce
            },
            duration,
            cooldown,
            contractMantle: true
        };
    },

    /**
     * Calculate fin propulsion for gentle movement
     * @param {Object} direction - Direction vector
     * @param {number} intensity - Intensity (0-1)
     * @returns {Object} Force vector
     */
    calculateFinPropulsion(direction, intensity = 0.5) {
        const finForce = intensity * this.CONSTANTS.FIN_FORCE_MULTIPLIER;
        return {
            x: direction.x * finForce,
            y: direction.y * finForce
        };
    },

    /**
     * Calculate tentacle adjustment force
     * @param {Object} direction - Direction vector
     * @param {number} strength - Strength (0-1)
     * @returns {Object} Force vector
     */
    calculateTentacleForce(direction, strength = 0.3) {
        const tentacleForce = strength * this.CONSTANTS.TENTACLE_FORCE_MULTIPLIER;
        return {
            x: direction.x * tentacleForce,
            y: direction.y * tentacleForce
        };
    },

    /**
     * Determine optimal depth target based on current position
     * @param {number} currentY - Current Y position
     * @param {number} worldHeight - World height
     * @returns {number} Target depth Y position
     */
    calculateOptimalDepth(currentY, worldHeight) {
        const currentDepth = currentY / worldHeight;
        let targetDepthPercent = this.DEPTH_ZONES.OPTIMAL;

        if (currentDepth < this.DEPTH_ZONES.SHALLOW_THRESHOLD) {
            targetDepthPercent = 0.8; // Dive deeper
        } else if (currentDepth > this.DEPTH_ZONES.DEEP_THRESHOLD) {
            targetDepthPercent = 0.9; // Rise slightly
        }

        return worldHeight * targetDepthPercent;
    },

    /**
     * Check if squid should ignore prey after recent feeding
     * @param {number} lastPoopTime - Timestamp of last poop
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} Should ignore prey
     */
    shouldIgnorePrey(lastPoopTime, currentTime) {
        return (currentTime - lastPoopTime) < this.CONSTANTS.POOP_IGNORE_DURATION;
    },

    /**
     * Calculate bioluminescence intensity based on depth
     * @param {number} depthFactor - Depth factor (0-1)
     * @returns {number} Bioluminescence intensity
     */
    calculateBioluminescence(depthFactor) {
        if (depthFactor < 0.7) return 0; // No bioluminescence in shallow waters

        if (depthFactor >= 0.8) {
            // Abyssal zone (80-100%): Full intensity bioluminescence
            const abyssalProgress = (depthFactor - 0.8) / 0.2;
            return 0.3 + (abyssalProgress * 0.4); // 0.3 to 0.7 opacity
        } else {
            // Faint tier (70-80%): Progressive bioluminescence activation
            const faintProgress = (depthFactor - 0.7) / 0.1;
            return 0.1 + (faintProgress * 0.2); // 0.1 to 0.3 opacity
        }
    },

    /**
     * Determine sprite selection based on squid state
     * @param {Object} squid - Giant squid entity
     * @param {Object} sprites - Sprite collection
     * @returns {Object} Selected sprites {base, bioluminescent}
     */
    selectSprites(squid, sprites) {
        const isBlinking = squid.blinkTimer < this.CONSTANTS.BLINK_DURATION;
        
        if (squid.mantle.contracted || squid.jetDuration > 0) {
            return {
                base: sprites.giantSquid2,
                bioluminescent: isBlinking ? sprites.abyssalSquid2Blink : sprites.abyssalSquid2
            };
        } else {
            return {
                base: sprites.giantSquid1,
                bioluminescent: isBlinking ? sprites.abyssalSquid1Blink : sprites.abyssalSquid1
            };
        }
    },

    /**
     * Generate bubble effects for squid actions
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} effectType - Type of effect ('jet', 'capture', 'consumption')
     * @param {Object} ObjectPools - Object pool system
     */
    createBubbleEffect(x, y, effectType, ObjectPools) {
        if (!ObjectPools) return;

        let bubbleCount = 5;
        let spread = 100;

        switch (effectType) {
            case 'jet':
                bubbleCount = 5;
                spread = 40;
                break;
            case 'capture':
                bubbleCount = 20;
                spread = 250;
                break;
            case 'consumption':
                bubbleCount = 15;
                spread = 300;
                break;
        }

        for (let i = 0; i < bubbleCount; i++) {
            ObjectPools.getEatingBubble(
                x + (Math.random() - 0.5) * spread,
                y + (Math.random() - 0.5) * spread
            );
        }
    },

    /**
     * Generate random patrol direction
     * @returns {Object} Direction vector
     */
    generatePatrolDirection() {
        return {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.3
        };
    },

    /**
     * Generate escape direction for retreating
     * @returns {Object} Direction vector (biased downward)
     */
    generateEscapeDirection() {
        return {
            x: (Math.random() - 0.5),
            y: 0.8 // Bias toward diving down
        };
    },

    /**
     * Generate settling direction for resting
     * @returns {Object} Direction vector
     */
    generateSettlingDirection() {
        return {
            x: (Math.random() - 0.5) * 0.2,
            y: 0.1
        };
    }
};

// Export for global access
window.SquidUtils = SquidUtils; 