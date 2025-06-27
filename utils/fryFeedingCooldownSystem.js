// Fry Feeding Cooldown System - Prevents hunting after egg laying
// When fry lay eggs, they enter a 15-second feeding cooldown where they cannot hunt

class FryFeedingCooldownSystem {
    constructor() {
        this.config = {
            FEEDING_COOLDOWN_DURATION: 15000, // 15 seconds cooldown after laying eggs
            COOLDOWN_STATE: 'feeding_cooldown', // Special state for feeding cooldown
            DEBUG: true
        };
        
        // Track fry that are in feeding cooldown
        this.feedingCooldowns = new Map(); // fryId -> { startTime, endTime }
        
        console.log('⏰ FryFeedingCooldownSystem initialized');
    }
    
    /**
     * Start feeding cooldown for a fry that just laid eggs
     * @param {Object} fry - The fry entity that laid eggs
     */
    startFeedingCooldown(fry) {
        const fryId = this.getFryId(fry);
        const now = Date.now();
        const endTime = now + this.config.FEEDING_COOLDOWN_DURATION;
        
        // Set cooldown tracking
        this.feedingCooldowns.set(fryId, {
            startTime: now,
            endTime: endTime,
            fry: fry
        });
        
        // Set fry to feeding cooldown state
        fry.behaviorState = this.config.COOLDOWN_STATE;
        fry.feedingCooldownTimer = 0;
        fry.huntTarget = null; // Clear any hunt target
        
        if (window.gameState?.fryDebug) {
            console.log(`⏰ Fry ${fryId} entered feeding cooldown for ${this.config.FEEDING_COOLDOWN_DURATION/1000}s`);
        }
    }
    
    /**
     * Check if fry is in feeding cooldown
     * @param {Object} fry - The fry entity to check
     * @returns {boolean} True if fry is in feeding cooldown
     */
    isInFeedingCooldown(fry) {
        const fryId = this.getFryId(fry);
        const cooldown = this.feedingCooldowns.get(fryId);
        
        if (!cooldown) {
            return false;
        }
        
        const now = Date.now();
        const isExpired = now >= cooldown.endTime;
        
        if (isExpired) {
            // Cooldown expired, clean up
            this.endFeedingCooldown(fry);
            return false;
        }
        
        return true;
    }
    
    /**
     * End feeding cooldown for a fry
     * @param {Object} fry - The fry entity
     */
    endFeedingCooldown(fry) {
        const fryId = this.getFryId(fry);
        
        // Remove from cooldown tracking
        this.feedingCooldowns.delete(fryId);
        
        // Reset fry state
        fry.behaviorState = 'foraging';
        fry.feedingCooldownTimer = 0;
        fry.huntTarget = null;
        
        if (window.gameState?.fryDebug) {
            console.log(`⏰ Fry ${fryId} feeding cooldown ended, returning to foraging`);
        }
    }
    
    /**
     * Update feeding cooldown timer for a fry
     * @param {Object} fry - The fry entity
     */
    updateFeedingCooldown(fry) {
        if (!this.isInFeedingCooldown(fry)) {
            return;
        }
        
        // Update timer (assuming ~60fps, so ~16ms per frame)
        fry.feedingCooldownTimer += 16;
        
        // Check if cooldown should end
        const fryId = this.getFryId(fry);
        const cooldown = this.feedingCooldowns.get(fryId);
        
        if (cooldown && Date.now() >= cooldown.endTime) {
            this.endFeedingCooldown(fry);
        }
    }
    
    /**
     * Get remaining cooldown time for a fry
     * @param {Object} fry - The fry entity
     * @returns {number} Remaining time in milliseconds, or 0 if not in cooldown
     */
    getRemainingCooldownTime(fry) {
        const fryId = this.getFryId(fry);
        const cooldown = this.feedingCooldowns.get(fryId);
        
        if (!cooldown) {
            return 0;
        }
        
        const remaining = cooldown.endTime - Date.now();
        return Math.max(0, remaining);
    }
    
    /**
     * Get unique ID for fry (for cooldown tracking)
     * @param {Object} fry - The fry entity
     * @returns {string} Unique fry ID
     */
    getFryId(fry) {
        // Use position and fish type as a simple ID
        return `${fry.fishType}_${Math.floor(fry.x)}_${Math.floor(fry.y)}`;
    }
    
    /**
     * Clean up old cooldown entries
     */
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - this.config.FEEDING_COOLDOWN_DURATION * 2; // Remove entries older than 2x cooldown
        
        for (let [fryId, cooldown] of this.feedingCooldowns.entries()) {
            if (cooldown.startTime < cutoffTime) {
                this.feedingCooldowns.delete(fryId);
            }
        }
    }
    
    /**
     * Process all fry for feeding cooldown updates
     * @param {Array} allFry - Array of all fry entities
     */
    processAllFry(allFry) {
        for (let fry of allFry) {
            this.updateFeedingCooldown(fry);
        }
        
        // Clean up old cooldown entries periodically
        if (Math.random() < 0.01) { // 1% chance per frame
            this.cleanup();
        }
    }
    
    /**
     * Hook into the egg laying system to start cooldown when eggs are laid
     * @param {Object} fry - The fry that laid eggs
     */
    onEggsLaid(fry) {
        this.startFeedingCooldown(fry);
    }
}

// Create global instance
const fryFeedingCooldownSystem = new FryFeedingCooldownSystem();

// Export for global access
if (typeof window !== 'undefined') {
    window.FryFeedingCooldownSystem = fryFeedingCooldownSystem;
} 