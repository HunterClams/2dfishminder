// Poop Movement Optimization System
// Uses shared movement patterns for poop2 and poop3 to improve performance
// Only optimizes state 2 (aged) and state 3 (deep water) poop

class PoopMovementSystem {
    constructor() {
        // Pre-calculate 1000 movement patterns for poop2 and poop3
        this.movementPatterns = [];
        this.generateMovementPatterns(1000);
        
        // Batch processing configuration
        this.batchSize = 50;
        
        // Performance tracking
        this.stats = {
            processedCount: 0,
            batchOperations: 0,
            poop2Optimized: 0,
            poop3Optimized: 0,
            lastReset: Date.now()
        };
        
        // Make globally accessible
        if (typeof window !== 'undefined') {
            window.PoopMovementSystem = this;
        }
    }
    
    /**
     * Generate pre-calculated movement patterns
     * @param {number} count - Number of patterns to generate
     */
    generateMovementPatterns(count) {
        this.movementPatterns = [];
        for (let i = 0; i < count; i++) {
            // Create patterns similar to individual poop movement
            // Base velocity: 0.3 downward, random horizontal drift
            const baseVelocityY = 0.3;
            const randomDriftX = (Math.random() - 0.5) * 0.1;
            
            // Store pattern index and velocity multipliers
            this.movementPatterns.push({
                driftX: randomDriftX,
                baseVelY: baseVelocityY,
                decelX: 0.998, // Velocity decay
                decelY: 0.999
            });
        }
    }
    
    /**
     * Get a movement pattern by index (with wrapping)
     * @param {number} index - Pattern index
     * @returns {Object} Movement pattern
     */
    getPattern(index) {
        return this.movementPatterns[index % this.movementPatterns.length];
    }
    
    /**
     * Update a single poop entity (optimized for poop2 and poop3)
     * @param {Object} poop - Poop entity
     * @param {number} patternIndex - Index of pattern to use
     */
    updatePoop(poop, patternIndex) {
        if (!poop.isActive) return;
        
        // Note: stateTimer is updated in GameEntities.js before batch processing
        // State transitions (individual per poop)
        if (poop.state === 2) {
            // Check if we're in deep water (bottom 40% of world)
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const deepWaterThreshold = WORLD_HEIGHT * 0.6;
            if (poop.y > deepWaterThreshold) {
                poop.state = 3;
            }
        }
        
        // Apply movement
        poop.x += poop.velocity.x;
        poop.y += poop.velocity.y;
        poop.rotation += poop.rotationSpeed;
        
        // Apply deceleration (using pattern values for consistency)
        const pattern = this.getPattern(patternIndex);
        poop.velocity.x *= pattern.decelX;
        poop.velocity.y *= pattern.decelY;
        
        // Bounds checking - remove if too far down or out of bounds
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (poop.y > WORLD_HEIGHT + 100 || poop.x < -100 || poop.x > WORLD_WIDTH + 100) {
            poop.isActive = false;
        }
        
        // Fade out very old poop
        if (poop.stateTimer > 30000) { // 30 seconds total life
            poop.opacity -= 0.01;
            if (poop.opacity <= 0) {
                poop.isActive = false;
            }
        }
    }
    
    /**
     * Batch update multiple poop entities
     * Only optimizes poop2 (state 2) and poop3 (state 3)
     * @param {Array} poopArray - Array of poop entities
     * @returns {Array} Array of unprocessed poop1 entities
     */
    batchUpdate(poopArray) {
        if (!poopArray || poopArray.length === 0) return [];
        
        this.stats.processedCount = 0;
        this.stats.poop2Optimized = 0;
        this.stats.poop3Optimized = 0;
        this.stats.batchOperations = 0;
        
        // Separate poop by state for efficient processing
        const poop1 = [];
        const poop2 = [];
        const poop3 = [];
        
        for (let i = 0; i < poopArray.length; i++) {
            const poop = poopArray[i];
            if (!poop.isActive) continue;
            
            if (poop.state === 1) {
                poop1.push(poop);
            } else if (poop.state === 2) {
                poop2.push(poop);
            } else if (poop.state === 3) {
                poop3.push(poop);
            }
        }
        
        // Process poop2 in batches
        if (poop2.length > 0) {
            for (let i = 0; i < poop2.length; i += this.batchSize) {
                const batch = poop2.slice(i, Math.min(i + this.batchSize, poop2.length));
                for (let j = 0; j < batch.length; j++) {
                    const poop = batch[j];
                    const patternIndex = (i + j) % this.movementPatterns.length;
                    this.updatePoop(poop, patternIndex);
                    this.stats.poop2Optimized++;
                    this.stats.processedCount++;
                }
                this.stats.batchOperations++;
            }
        }
        
        // Process poop3 in batches
        if (poop3.length > 0) {
            for (let i = 0; i < poop3.length; i += this.batchSize) {
                const batch = poop3.slice(i, Math.min(i + this.batchSize, poop3.length));
                for (let j = 0; j < batch.length; j++) {
                    const poop = batch[j];
                    const patternIndex = (poop2.length + i + j) % this.movementPatterns.length;
                    this.updatePoop(poop, patternIndex);
                    this.stats.poop3Optimized++;
                    this.stats.processedCount++;
                }
                this.stats.batchOperations++;
            }
        }
        
        // Return unprocessed poop1 for individual update (not optimized)
        return poop1;
    }
    
    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getStats() {
        return {
            ...this.stats,
            patternCount: this.movementPatterns.length,
            totalOptimized: this.stats.poop2Optimized + this.stats.poop3Optimized
        };
    }
    
    /**
     * Reset performance statistics
     */
    resetStats() {
        this.stats = {
            processedCount: 0,
            batchOperations: 0,
            poop2Optimized: 0,
            poop3Optimized: 0,
            lastReset: Date.now()
        };
    }
}

// Initialize system
if (typeof window !== 'undefined') {
    window.PoopMovementSystem = new PoopMovementSystem();
}

