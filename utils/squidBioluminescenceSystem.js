// GiantSquid Bioluminescence System - Advanced visual effects
// Handles bioluminescent effects, blinking, and depth-based intensity
// Preserves the old system's visual quality while maintaining modular architecture

class SquidBioluminescenceSystem {
    constructor() {
        this.config = window.SQUID_CONFIG;
    }

    /**
     * Initialize bioluminescence system for a squid
     * @param {Object} squid - The squid entity
     */
    initializeBioluminescenceSystem(squid) {
        // Bioluminescent blinking system (from old system)
        squid.blinkTimer = 0;
        squid.blinkCycle = this.config.BLINK_CYCLE;
        squid.blinkDuration = this.config.BLINK_DURATION;
        
        // Bioluminescence state
        squid.bioluminescenceState = {
            isActive: false,
            intensity: 0,
            depthFactor: 0,
            isBlinking: false
        };
    }

    /**
     * Update bioluminescence system
     * @param {Object} squid - The squid entity
     */
    updateBioluminescenceSystem(squid) {
        // Update blinking timer
        squid.blinkTimer++;
        if (squid.blinkTimer >= squid.blinkCycle) {
            squid.blinkTimer = 0; // Reset timer
        }
        
        // Calculate depth factor
        const depthFactor = window.Utils.getDepthFactor(squid.y);
        squid.bioluminescenceState.depthFactor = depthFactor;
        
        // Check if bioluminescence should be active
        const wasActive = squid.bioluminescenceState.isActive;
        squid.bioluminescenceState.isActive = depthFactor >= this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD;
        
        // Debug logging for bioluminescence state changes
        if (wasActive !== squid.bioluminescenceState.isActive && window.gameState && window.gameState.squidDebug) {
            console.log(`🦑 Bioluminescence ${squid.bioluminescenceState.isActive ? 'ACTIVATED' : 'DEACTIVATED'}:`, {
                depthFactor: Math.round(depthFactor * 100) + '%',
                threshold: Math.round(this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD * 100) + '%',
                squidY: Math.round(squid.y),
                worldHeight: window.WORLD_HEIGHT || 8000
            });
        }
        
        // Calculate intensity based on depth
        if (squid.bioluminescenceState.isActive) {
            squid.bioluminescenceState.intensity = this.calculateBioluminescenceIntensity(depthFactor);
        } else {
            squid.bioluminescenceState.intensity = 0;
        }
        
        // Update blinking state
        squid.bioluminescenceState.isBlinking = squid.blinkTimer < squid.blinkDuration;
    }

    /**
     * Calculate bioluminescence intensity based on depth
     * @param {number} depthFactor - Depth factor (0-1)
     * @returns {number} Intensity value (0-1)
     */
    calculateBioluminescenceIntensity(depthFactor) {
        if (depthFactor >= this.config.ABYSSAL_DEPTH_THRESHOLD) {
            // Abyssal zone (80-100%): Full intensity bioluminescence
            const abyssalProgress = (depthFactor - this.config.ABYSSAL_DEPTH_THRESHOLD) / 0.2;
            return this.config.BIO_INTENSITY_MIN + (abyssalProgress * (this.config.BIO_INTENSITY_MAX - this.config.BIO_INTENSITY_MIN));
        } else if (depthFactor >= this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD) {
            // Faint tier (70-80%): Progressive bioluminescence activation
            const faintProgress = (depthFactor - this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD) / 0.1;
            return this.config.BIO_INTENSITY_MIN + (faintProgress * (this.config.BIO_INTENSITY_MAX - this.config.BIO_INTENSITY_MIN));
        }
        return 0;
    }

    /**
     * Draw bioluminescent effects - EXACTLY like the old system
     * @param {Object} squid - The squid entity
     * @param {Image} abyssalSprite - The bioluminescent sprite
     * @param {number} baseOpacity - Base opacity
     * @param {number} angle - Rotation angle
     */
    drawBioluminescence(squid, abyssalSprite, baseOpacity, angle) {
        // Debug logging for bioluminescence drawing
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 60 === 0) {
            console.log(`🦑 Bioluminescence draw attempt:`, {
                hasAbyssalSprite: !!abyssalSprite,
                isActive: squid.bioluminescenceState.isActive,
                depthFactor: Math.round(squid.bioluminescenceState.depthFactor * 100) + '%',
                intensity: Math.round(squid.bioluminescenceState.intensity * 100) + '%',
                isBlinking: squid.bioluminescenceState.isBlinking,
                squidY: Math.round(squid.y)
            });
        }
        
        if (!abyssalSprite || !squid.bioluminescenceState.isActive) {
            if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 60 === 0) {
                console.log(`🦑 Bioluminescence draw skipped:`, {
                    noSprite: !abyssalSprite,
                    notActive: !squid.bioluminescenceState.isActive
                });
            }
            return;
        }

        const ctx = window.ctx;
        if (!ctx) return;

        // Get the appropriate bioluminescent sprite based on blinking state
        const isBlinking = squid.bioluminescenceState.isBlinking;
        let bioSprite = abyssalSprite;
        
        // If we have separate blinking sprites, use them
        const sprites = window.sprites || {};
        if (isBlinking && squid.mantle && squid.mantle.contracted) {
            bioSprite = sprites.abyssalSquid2Blink || abyssalSprite;
        } else if (isBlinking) {
            bioSprite = sprites.abyssalSquid1Blink || abyssalSprite;
        }

        // EXACTLY like the old system - calculate bioIntensity based on depth
        const depthFactor = squid.bioluminescenceState.depthFactor;
        let bioIntensity;
        
        if (depthFactor >= 0.8) {
            // Abyssal zone (80-100%): Full intensity bioluminescence
            const abyssalProgress = (depthFactor - 0.8) / 0.2; // 0 to 1 in abyssal zone
            bioIntensity = 0.3 + (abyssalProgress * 0.4); // 0.3 to 0.7 opacity
        } else {
            // Faint tier (70-80%): Progressive bioluminescence activation
            const faintProgress = (depthFactor - 0.7) / 0.1; // 0 to 1 in faint zone
            bioIntensity = 0.1 + (faintProgress * 0.2); // 0.1 to 0.3 opacity
        }
        
        // Full brightness for abyssal sprites - no depth shader tint (like the old system)
        const spotReducedOpacity = 1.0; // Maximum opacity, no depth effects
        
        // Draw bioluminescent overlay with additive blending for glow effect
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
        
        // Use the Entity's drawSprite method with the exact same parameters as the base sprite
        // This ensures perfect alignment and applies depth shader with full opacity
        squid.drawSprite(bioSprite, squid.size, spotReducedOpacity, angle);
        
        ctx.restore();
        
        // Debug logging for successful bioluminescence drawing
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 60 === 0) {
            console.log(`🦑 Bioluminescence drawn successfully:`, {
                spriteUsed: bioSprite === abyssalSprite ? 'normal' : 'blinking',
                opacity: spotReducedOpacity,
                bioIntensity: bioIntensity,
                blendMode: 'screen',
                size: squid.size,
                position: { x: Math.round(squid.x), y: Math.round(squid.y) }
            });
        }
    }

    /**
     * Check if squid is currently blinking
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if blinking
     */
    isBlinking(squid) {
        return squid.bioluminescenceState.isBlinking;
    }

    /**
     * Check if bioluminescence is active
     * @param {Object} squid - The squid entity
     * @returns {boolean} True if bioluminescence is active
     */
    isBioluminescenceActive(squid) {
        return squid.bioluminescenceState.isActive;
    }

    /**
     * Get current bioluminescence intensity
     * @param {Object} squid - The squid entity
     * @returns {number} Current intensity (0-1)
     */
    getBioluminescenceIntensity(squid) {
        return squid.bioluminescenceState.intensity;
    }

    /**
     * Get bioluminescence state for debugging
     * @param {Object} squid - The squid entity
     * @returns {Object} Bioluminescence state object
     */
    getBioluminescenceState(squid) {
        return {
            ...squid.bioluminescenceState,
            depthFactor: squid.bioluminescenceState.depthFactor,
            depthPercent: Math.round(squid.bioluminescenceState.depthFactor * 100)
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SquidBioluminescenceSystem = SquidBioluminescenceSystem;
} 