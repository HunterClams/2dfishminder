// Distance Optimization System Module
// Provides optimized distance calculations to eliminate unnecessary sqrt operations

class DistanceOptimizationSystem {
    constructor() {
        // Pre-compute commonly used squared radii for performance
        this.precomputedRadii = {
            PERCEPTION_RADIUS_SQUARED: 50 * 50,
            SEPARATION_RADIUS_SQUARED: 30 * 30,
            FEAR_RADIUS_SQUARED: 80 * 80,
            FOOD_ATTRACTION_RADIUS_SQUARED: 60 * 60,
            EATING_RADIUS_SQUARED: 15 * 15,
            SPAWNING_RADIUS_SQUARED: 25 * 25,
            FERTILIZATION_RADIUS_SQUARED: 10 * 10
        };
        
        this.optimizationStats = {
            sqrtEliminationsTotal: 0,
            distanceComparisonsOptimized: 0,
            lastReset: 0
        };
        
        console.log('🚀 Distance Optimization System initialized');
    }
    
    // Fast distance squared calculation (no sqrt)
    distanceSquared(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return dx * dx + dy * dy;
    }
    
    // Check if entities are within perception range (optimized - no sqrt)
    isWithinPerceptionRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.PERCEPTION_RADIUS_SQUARED;
    }
    
    // Check if entities are within separation range (optimized - no sqrt)
    isWithinSeparationRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.SEPARATION_RADIUS_SQUARED;
    }
    
    // Check if entities are within fear range (optimized - no sqrt)
    isWithinFearRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.FEAR_RADIUS_SQUARED;
    }
    
    // Check if entities are within eating range (optimized - no sqrt)
    isWithinEatingRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.EATING_RADIUS_SQUARED;
    }
    
    // Check if entities are within food attraction range (optimized - no sqrt)
    isWithinFoodAttractionRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.FOOD_ATTRACTION_RADIUS_SQUARED;
    }
    
    // Check if entities are within spawning range (optimized - no sqrt)
    isWithinSpawningRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.SPAWNING_RADIUS_SQUARED;
    }
    
    // Check if entities are within fertilization range (optimized - no sqrt)
    isWithinFertilizationRange(entity1, entity2) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < this.precomputedRadii.FERTILIZATION_RADIUS_SQUARED;
    }
    
    // Check if entities are within custom range (optimized - no sqrt)
    isWithinRange(entity1, entity2, range) {
        this.optimizationStats.distanceComparisonsOptimized++;
        return this.distanceSquared(entity1, entity2) < (range * range);
    }
    
    // Find closest entity without sqrt (returns entity and squared distance)
    findClosestEntityOptimized(sourceEntity, entities, maxRange = null) {
        let closestEntity = null;
        let closestDistanceSquared = maxRange ? (maxRange * maxRange) : Infinity;
        
        for (const entity of entities) {
            if (entity === sourceEntity) continue;
            
            const distSquared = this.distanceSquared(sourceEntity, entity);
            if (distSquared < closestDistanceSquared) {
                closestEntity = entity;
                closestDistanceSquared = distSquared;
            }
        }
        
        this.optimizationStats.sqrtEliminationsTotal++;
        return { entity: closestEntity, distanceSquared: closestDistanceSquared };
    }
    
    // Filter entities within range without sqrt
    filterEntitiesInRange(sourceEntity, entities, range) {
        const rangeSquared = range * range;
        const result = [];
        
        for (const entity of entities) {
            if (entity === sourceEntity) continue;
            
            if (this.distanceSquared(sourceEntity, entity) < rangeSquared) {
                result.push(entity);
            }
        }
        
        this.optimizationStats.sqrtEliminationsTotal++;
        return result;
    }
    
    // Get distance only when absolutely necessary (with caching)
    getActualDistance(entity1, entity2) {
        // Only calculate sqrt when actually needed
        return Math.sqrt(this.distanceSquared(entity1, entity2));
    }
    
    // Optimized vector magnitude calculation (only when normalization is needed)
    getMagnitude(vector) {
        return Math.hypot(vector.x, vector.y);
    }
    
    // Normalize vector efficiently (only when direction is needed)
    normalizeVector(vector) {
        const mag = this.getMagnitude(vector);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }
    
    // Update pre-computed radii if game constants change
    updatePrecomputedRadii(constants) {
        if (constants.PERCEPTION_RADIUS) {
            this.precomputedRadii.PERCEPTION_RADIUS_SQUARED = constants.PERCEPTION_RADIUS * constants.PERCEPTION_RADIUS;
        }
        if (constants.SEPARATION_RADIUS) {
            this.precomputedRadii.SEPARATION_RADIUS_SQUARED = constants.SEPARATION_RADIUS * constants.SEPARATION_RADIUS;
        }
        if (constants.FEAR_RADIUS) {
            this.precomputedRadii.FEAR_RADIUS_SQUARED = constants.FEAR_RADIUS * constants.FEAR_RADIUS;
        }
        if (constants.FOOD_ATTRACTION_RADIUS) {
            this.precomputedRadii.FOOD_ATTRACTION_RADIUS_SQUARED = constants.FOOD_ATTRACTION_RADIUS * constants.FOOD_ATTRACTION_RADIUS;
        }
    }
    
    // Get optimization statistics
    getOptimizationStats() {
        return {
            ...this.optimizationStats,
            estimatedSqrtSavings: this.optimizationStats.sqrtEliminationsTotal + this.optimizationStats.distanceComparisonsOptimized,
            precomputedRadii: Object.keys(this.precomputedRadii).length
        };
    }
    
    // Log performance improvements
    logOptimizationStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const stats = this.getOptimizationStats();
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('DISTANCE', `Optimizations: ${stats.estimatedSqrtSavings} sqrt operations eliminated, ${stats.distanceComparisonsOptimized} distance checks optimized`);
            }
            
            // Reset counters
            this.optimizationStats.sqrtEliminationsTotal = 0;
            this.optimizationStats.distanceComparisonsOptimized = 0;
        }
    }
    
    // Reset optimization statistics
    reset() {
        this.optimizationStats = {
            sqrtEliminationsTotal: 0,
            distanceComparisonsOptimized: 0,
            lastReset: Date.now()
        };
    }
}

// Make globally accessible
window.DistanceOptimizationSystem = DistanceOptimizationSystem; 