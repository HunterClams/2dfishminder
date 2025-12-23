// Fish Food Movement Optimization System
// Uses shared movement data and batch processing for efficient fish food updates

class FishFoodMovementSystem {
    constructor() {
        // Shared movement data (same for all fish food)
        this.sharedData = {
            sinkSpeed: 0.8, // Constant sink speed
            frameTime: 16, // Approximate frame time
            worldHeight: window.WORLD_HEIGHT || 8000,
            worldWidth: window.WORLD_WIDTH || 12000,
            abyssalDepth: 0, // Calculated from constants
            maxDepth: 0, // Calculated from world height
            depthFadeEnd: 0.8 // 80% depth for abyssal transformation
        };
        
        // Update shared data from constants
        this.updateSharedData();
        
        // Batch processing configuration
        this.batchSize = 50;
        
        // Performance tracking
        this.stats = {
            activeCount: 0,
            processedCount: 0,
            batchOperations: 0,
            transformations: 0,
            totalCreated: 0,
            lastReset: Date.now()
        };
        
        // Make globally accessible
        if (typeof window !== 'undefined') {
            window.FishFoodMovementSystem = this;
        }
    }
    
    /**
     * Update shared data from global constants
     */
    updateSharedData() {
        this.sharedData.worldHeight = window.WORLD_HEIGHT || 8000;
        this.sharedData.worldWidth = window.WORLD_WIDTH || 12000;
        
        const CONSTANTS = window.CONSTANTS || { DEPTH_FADE_END: 0.8 };
        this.sharedData.depthFadeEnd = CONSTANTS.DEPTH_FADE_END || 0.8;
        this.sharedData.abyssalDepth = this.sharedData.worldHeight * this.sharedData.depthFadeEnd;
        this.sharedData.maxDepth = this.sharedData.worldHeight + 10;
    }
    
    /**
     * Update a single fish food entity
     * @param {Object} food - Fish food entity
     * @returns {boolean} True if transformed to poop, false otherwise
     */
    updateFishFood(food) {
        if (food.eaten || food.transformedToPoop) return false;
        
        // Update position using shared sink speed
        food.y += this.sharedData.sinkSpeed;
        
        // Check if we've reached abyssal depth (80% of world height)
        if (food.y >= this.sharedData.abyssalDepth) {
            // Transform into poop3 when reaching abyssal depth
            if (window.gameEntities && window.Poop) {
                window.gameEntities.poop.push(new window.Poop(food.x, food.y, 'abyssal'));
                this.stats.transformations++;
            }
            food.eaten = true;
            food.transformedToPoop = true;
            return true;
        }
        
        // Check if out of bounds
        if (food.y > this.sharedData.maxDepth) {
            food.eaten = true;
        }
        
        return false;
    }
    
    /**
     * Batch update all fish food entities
     * @param {Array} fishFoodArray - Array of fish food entities
     */
    updateAllFishFood(fishFoodArray) {
        if (!fishFoodArray || fishFoodArray.length === 0) {
            this.stats.activeCount = 0;
            this.stats.processedCount = 0;
            return;
        }
        
        // Update shared data in case constants changed
        this.updateSharedData();
        
        // Filter active food
        const activeFood = fishFoodArray.filter(food => !food.eaten && !food.transformedToPoop);
        this.stats.activeCount = activeFood.length;
        this.stats.processedCount = 0;
        this.stats.batchOperations = 0;
        this.stats.transformations = 0;
        
        // Process in batches for better performance
        for (let i = 0; i < activeFood.length; i += this.batchSize) {
            const batch = activeFood.slice(i, Math.min(i + this.batchSize, activeFood.length));
            
            for (let j = 0; j < batch.length; j++) {
                const food = batch[j];
                this.updateFishFood(food);
                this.stats.processedCount++;
            }
            
            this.stats.batchOperations++;
        }
    }
    
    /**
     * Track when new fish food is created
     */
    trackCreation() {
        this.stats.totalCreated++;
    }
    
    /**
     * Get performance statistics
     * @returns {Object} Performance stats
     */
    getStats() {
        return {
            ...this.stats,
            sinkSpeed: this.sharedData.sinkSpeed,
            abyssalDepth: this.sharedData.abyssalDepth,
            batchSize: this.batchSize
        };
    }
    
    /**
     * Reset performance statistics
     */
    resetStats() {
        this.stats = {
            activeCount: 0,
            processedCount: 0,
            batchOperations: 0,
            transformations: 0,
            totalCreated: this.stats.totalCreated, // Keep total created count
            lastReset: Date.now()
        };
    }
}

// Initialize system
if (typeof window !== 'undefined') {
    window.FishFoodMovementSystem = new FishFoodMovementSystem();
}

