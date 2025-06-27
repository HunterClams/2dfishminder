// Egg Floating System - Shared floating logic for all fish eggs
// Optimized to use shared floating data for better performance

class EggFloatingSystem {
    constructor() {
        this.config = {
            BASE_FLOAT_SPEED: 0.02,
            RANDOM_FLOAT_VARIANCE: 0.01,
            BASE_FLOAT_AMPLITUDE: 2,
            RANDOM_AMPLITUDE_VARIANCE: 1,
            BASE_DRIFT_SPEED: 0.3,
            RANDOM_DRIFT_VARIANCE: 0.2
        };
        
        // Shared floating data pool - generate once, use for all eggs
        this.floatingDataPool = [];
        this.poolSize = 50; // Generate 50 sets of floating data
        this.currentPoolIndex = 0;
        
        this.generateFloatingDataPool();
        
        console.log('🌊 EggFloatingSystem initialized with optimized floating data pool');
    }
    
    /**
     * Generate a pool of floating data to be shared across all eggs
     */
    generateFloatingDataPool() {
        for (let i = 0; i < this.poolSize; i++) {
            const floatingData = {
                floatOffset: Math.random() * Math.PI * 2,
                floatSpeed: this.config.BASE_FLOAT_SPEED + 
                    (Math.random() - 0.5) * this.config.RANDOM_FLOAT_VARIANCE,
                floatAmplitude: this.config.BASE_FLOAT_AMPLITUDE + 
                    (Math.random() - 0.5) * this.config.RANDOM_AMPLITUDE_VARIANCE,
                velocity: {
                    x: (Math.random() - 0.5) * (this.config.BASE_DRIFT_SPEED + 
                        (Math.random() - 0.5) * this.config.RANDOM_DRIFT_VARIANCE),
                    y: (Math.random() - 0.5) * (this.config.BASE_DRIFT_SPEED + 
                        (Math.random() - 0.5) * this.config.RANDOM_DRIFT_VARIANCE)
                }
            };
            this.floatingDataPool.push(floatingData);
        }
    }
    
    /**
     * Get next floating data from the pool (round-robin)
     * @returns {Object} Floating data object
     */
    getNextFloatingData() {
        const data = this.floatingDataPool[this.currentPoolIndex];
        this.currentPoolIndex = (this.currentPoolIndex + 1) % this.poolSize;
        return data;
    }
    
    /**
     * Initialize floating properties for an egg using shared data
     * @param {Object} egg - The egg entity (FishEgg or FertilizedEgg)
     */
    initializeFloating(egg) {
        // Get shared floating data from pool
        const floatingData = this.getNextFloatingData();
        
        // Apply shared floating animation properties
        egg.floatOffset = floatingData.floatOffset;
        egg.floatSpeed = floatingData.floatSpeed;
        egg.floatAmplitude = floatingData.floatAmplitude;
        
        // Apply shared drift velocity
        egg.velocity = {
            x: floatingData.velocity.x,
            y: floatingData.velocity.y
        };
    }
    
    /**
     * Update floating animation for an egg
     * @param {Object} egg - The egg entity
     */
    updateFloating(egg) {
        // Update floating offset
        egg.floatOffset += egg.floatSpeed;
        
        // Calculate floating Y position
        egg.floatY = egg.y + Math.sin(egg.floatOffset) * egg.floatAmplitude;
        
        // Apply gentle drift
        egg.x += egg.velocity.x;
        egg.y += egg.velocity.y;
        
        // Keep egg within world bounds
        this.keepInBounds(egg);
    }
    
    /**
     * Keep egg within world boundaries
     * @param {Object} egg - The egg entity
     */
    keepInBounds(egg) {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        if (egg.x < 0) egg.x = 0;
        if (egg.x > WORLD_WIDTH) egg.x = WORLD_WIDTH;
        if (egg.y < 0) egg.y = 0;
        if (egg.y > WORLD_HEIGHT) egg.y = WORLD_HEIGHT;
    }
    
    /**
     * Get the current floating Y position for drawing
     * @param {Object} egg - The egg entity
     * @returns {number} The floating Y position
     */
    getFloatingY(egg) {
        return egg.floatY || egg.y;
    }
    
    /**
     * Get system statistics for debugging
     * @returns {Object} System statistics
     */
    getStats() {
        return {
            poolSize: this.poolSize,
            currentIndex: this.currentPoolIndex,
            dataGenerated: this.floatingDataPool.length
        };
    }
}

// Create and export global instance
const eggFloatingSystem = new EggFloatingSystem();
if (typeof window !== 'undefined') {
    window.EggFloatingSystem = eggFloatingSystem;
} 