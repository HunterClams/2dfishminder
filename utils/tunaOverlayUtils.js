// Tuna Sprite Replacement Utilities - Modular system for handling tuna eaten sprite replacement
const TunaSpriteUtils = {
    // Configuration constants
    CONFIG: {
        EATEN_SPRITE_DELAY: 800, // 800ms delay before showing eaten sprite
        EATEN_SPRITE_DURATION: 2000, // 2 seconds total duration
        SPRITE_SCALE: 1.1, // Slightly larger than original sprite
        PULSE_FREQUENCY: 0.02, // Pulse animation speed
        PULSE_AMPLITUDE: 0.1 // Pulse opacity variation
    },

    /**
     * Initialize eaten sprite replacement for a tuna
     * @param {Object} tuna - The tuna entity
     * @param {number} grabTime - Timestamp when grabbed
     */
    initializeEatenSprite(tuna, grabTime) {
        tuna.eatenSprite = {
            grabTime: grabTime,
            showEatenSprite: false,
            spriteTimer: 0,
            pulsePhase: 0,
            originalSpriteKey: tuna.tunaType // Store original sprite for restoration
        };
        
        // Start the eaten sprite animation immediately
        tuna.eatenSprite.showEatenSprite = true;
        tuna.eatenSprite.spriteTimer = 0;
    },

    /**
     * Update eaten sprite state
     * @param {Object} tuna - The tuna entity
     * @param {number} currentTime - Current timestamp
     */
    updateEatenSprite(tuna, currentTime) {
        if (!tuna.eatenSprite) return;

        // Update sprite if active
        if (tuna.eatenSprite.showEatenSprite) {
            tuna.eatenSprite.spriteTimer += 16; // Assuming 60fps
            tuna.eatenSprite.pulsePhase += this.CONFIG.PULSE_FREQUENCY;

            // Check if sprite should end
            if (tuna.eatenSprite.spriteTimer >= this.CONFIG.EATEN_SPRITE_DURATION) {
                // Don't remove eatenSprite object - just set showEatenSprite to false
                // This prevents the flash of the original sprite
                tuna.eatenSprite.showEatenSprite = false;
            }
        }
    },

    /**
     * Get the appropriate eaten sprite key for a tuna
     * @param {Object} tuna - The tuna entity
     * @returns {string} Sprite key for the eaten sprite
     */
    getEatenSpriteKey(tuna) {
        const sprites = window.sprites || {};
        
        // Determine which eaten sprite to use based on tuna type
        if (tuna.tunaType === 'tuna2') {
            return sprites.tuna2Eaten ? 'tuna2Eaten' : 'tunaEaten';
        } else {
            return 'tunaEaten';
        }
    },

    /**
     * Get the current sprite to display for a tuna
     * @param {Object} tuna - The tuna entity
     * @returns {string} Sprite key to display, or null if no sprite should be shown
     */
    getCurrentSpriteKey(tuna) {
        if (tuna.eatenSprite && tuna.eatenSprite.showEatenSprite) {
            return this.getEatenSpriteKey(tuna);
        } else if (tuna.eatenSprite) {
            // If eatenSprite exists but showEatenSprite is false, don't show any sprite
            // This prevents the flash of the original sprite after the eaten animation ends
            return null;
        } else {
            return tuna.tunaType || 'tuna';
        }
    },

    /**
     * Calculate sprite opacity with pulse effect
     * @param {Object} tuna - The tuna entity
     * @param {number} baseOpacity - Base opacity from depth effects
     * @returns {number} Final opacity for the sprite
     */
    calculateSpriteOpacity(tuna, baseOpacity) {
        if (!tuna.eatenSprite || !tuna.eatenSprite.showEatenSprite) {
            // If eatenSprite exists but showEatenSprite is false, return 0 opacity
            // This prevents the flash of the original sprite after the eaten animation ends
            if (tuna.eatenSprite) {
                return 0;
            }
            return baseOpacity;
        }

        const progress = tuna.eatenSprite.spriteTimer / this.CONFIG.EATEN_SPRITE_DURATION;
        const pulseEffect = Math.sin(tuna.eatenSprite.pulsePhase) * this.CONFIG.PULSE_AMPLITUDE;
        
        // Fade out towards the end
        const fadeOut = Math.max(0, 1 - (progress * 1.5));
        
        return baseOpacity * fadeOut * (1 + pulseEffect);
    },

    /**
     * Check if a tuna should show the eaten sprite
     * @param {Object} tuna - The tuna entity
     * @returns {boolean} True if eaten sprite should be shown
     */
    shouldShowEatenSprite(tuna) {
        return tuna.eatenSprite && tuna.eatenSprite.showEatenSprite;
    },

    /**
     * Clean up eaten sprite state
     * @param {Object} tuna - The tuna entity
     */
    cleanupEatenSprite(tuna) {
        if (tuna.eatenSprite) {
            tuna.eatenSprite = null;
        }
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaSpriteUtils = TunaSpriteUtils;
} 