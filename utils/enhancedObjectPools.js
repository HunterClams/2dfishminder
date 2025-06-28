// Enhanced Object Pooling System Module
// Provides efficient object reuse to reduce garbage collection

class EnhancedObjectPools {
    constructor() {
        this.vectors = [];
        this.steeringForces = [];
        this.entityArrays = [];
        this.performanceStats = {
            vectorHits: 0,
            vectorMisses: 0,
            forceHits: 0,
            forceMisses: 0,
            arrayHits: 0,
            arrayMisses: 0,
            lastReset: 0
        };
    }
    
    // Enhanced vector pooling
    getVector(x = 0, y = 0) {
        let vector = this.vectors.find(v => v.isDead());
        if (!vector) {
            this.performanceStats.vectorMisses++;
            vector = { 
                x: 0, 
                y: 0, 
                isDead: () => false,
                reset: function(x, y) {
                    this.x = x || 0;
                    this.y = y || 0;
                    this.isDead = () => false;
                }
            };
            this.vectors.push(vector);
        } else {
            this.performanceStats.vectorHits++;
            vector.reset(x, y);
        }
        return vector;
    }
    
    releaseVector(vector) {
        vector.isDead = () => true;
    }
    
    // Enhanced steering force pooling
    getSteeringForce() {
        let force = this.steeringForces.find(f => f.isDead());
        if (!force) {
            this.performanceStats.forceMisses++;
            force = { 
                x: 0, 
                y: 0, 
                isDead: () => false,
                reset: function() {
                    this.x = 0;
                    this.y = 0;
                    this.isDead = () => false;
                }
            };
            this.steeringForces.push(force);
        } else {
            this.performanceStats.forceHits++;
            force.reset();
        }
        return force;
    }
    
    releaseSteeringForce(force) {
        force.isDead = () => true;
    }
    
    // Entity array pooling for temporary collections
    getEntityArray() {
        let array = this.entityArrays.find(arr => arr.isDead());
        if (!array) {
            this.performanceStats.arrayMisses++;
            array = {
                entities: [],
                isDead: () => false,
                reset: function() {
                    this.entities.length = 0;
                    this.isDead = () => false;
                },
                push: function(entity) {
                    this.entities.push(entity);
                },
                filter: function(predicate) {
                    return this.entities.filter(predicate);
                },
                forEach: function(callback) {
                    this.entities.forEach(callback);
                },
                get length() {
                    return this.entities.length;
                }
            };
            this.entityArrays.push(array);
        } else {
            this.performanceStats.arrayHits++;
            array.reset();
        }
        return array;
    }
    
    releaseEntityArray(array) {
        array.isDead = () => true;
    }
    
    // Enhanced cleanup with performance monitoring
    cleanup() {
        const beforeCleanup = {
            vectors: this.vectors.length,
            steeringForces: this.steeringForces.length,
            entityArrays: this.entityArrays.length
        };
        
        // Keep pool sizes manageable
        if (this.vectors.length > 1000) {
            this.vectors = this.vectors.filter(v => !v.isDead()).slice(0, 500);
        }
        
        if (this.steeringForces.length > 500) {
            this.steeringForces = this.steeringForces.filter(f => !f.isDead()).slice(0, 250);
        }
        
        if (this.entityArrays.length > 100) {
            this.entityArrays = this.entityArrays.filter(arr => !arr.isDead()).slice(0, 50);
        }
        
        const afterCleanup = {
            vectors: this.vectors.length,
            steeringForces: this.steeringForces.length,
            entityArrays: this.entityArrays.length
        };
        
        // Log cleanup results
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('POOLING', `Cleanup: vectors ${beforeCleanup.vectors}→${afterCleanup.vectors}, forces ${beforeCleanup.steeringForces}→${afterCleanup.steeringForces}, arrays ${beforeCleanup.entityArrays}→${afterCleanup.entityArrays}`);
        }
    }
    
    // Get performance statistics
    getStats() {
        const vectorEfficiency = this.calculateEfficiency(this.performanceStats.vectorHits, this.performanceStats.vectorMisses);
        const forceEfficiency = this.calculateEfficiency(this.performanceStats.forceHits, this.performanceStats.forceMisses);
        const arrayEfficiency = this.calculateEfficiency(this.performanceStats.arrayHits, this.performanceStats.arrayMisses);
        
        return {
            vectorEfficiency: vectorEfficiency + '%',
            forceEfficiency: forceEfficiency + '%',
            arrayEfficiency: arrayEfficiency + '%',
            totalVectors: this.vectors.length,
            totalForces: this.steeringForces.length,
            totalArrays: this.entityArrays.length
        };
    }
    
    calculateEfficiency(hits, misses) {
        const total = hits + misses;
        if (total === 0) return 100;
        return (hits / total * 100).toFixed(1);
    }
    
    // Log performance stats periodically
    logPerformanceStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const stats = this.getStats();
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('POOLING', `Efficiency: vectors ${stats.vectorEfficiency}, forces ${stats.forceEfficiency}, arrays ${stats.arrayEfficiency}`);
            }
            
            // Reset performance counters
            this.performanceStats.vectorHits = 0;
            this.performanceStats.vectorMisses = 0;
            this.performanceStats.forceHits = 0;
            this.performanceStats.forceMisses = 0;
            this.performanceStats.arrayHits = 0;
            this.performanceStats.arrayMisses = 0;
        }
    }
}

// Make globally accessible
window.EnhancedObjectPools = EnhancedObjectPools; 