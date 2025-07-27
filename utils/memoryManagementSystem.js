// Memory Management System Module
// Provides comprehensive memory leak prevention and garbage collection optimization

class MemoryManagementSystem {
    constructor() {
        this.entityReferences = new WeakMap();
        this.eventListeners = new Map();
        this.memoryStats = {
            entitiesTracked: 0,
            entitiesReleased: 0,
            listenersActive: 0,
            lastGCCleanup: 0,
            memoryLeakWarnings: 0
        };
        
        // Garbage collection timing
        this.lastGCTrigger = 0;
        this.gcInterval = 10000; // Trigger GC every 10 seconds
        
        console.log('🧹 Memory Management System initialized');
    }
    
    // Track entity lifecycle
    trackEntity(entity, entityType) {
        this.entityReferences.set(entity, {
            type: entityType,
            createdAt: Date.now(),
            references: new Set()
        });
        this.memoryStats.entitiesTracked++;
    }
    
    // Release entity and cleanup all references
    releaseEntity(entity) {
        if (this.entityReferences.has(entity)) {
            const entityData = this.entityReferences.get(entity);
            
            // Cleanup spatial partitioning references
            if (window.gameEntities && window.gameEntities.spatialPartitioning) {
                window.gameEntities.spatialPartitioning.removeEntity(entity);
            }
            
            // Cleanup any tracked references
            entityData.references.forEach(ref => {
                if (ref && typeof ref.cleanup === 'function') {
                    ref.cleanup();
                }
            });
            
            // Remove from entity references
            this.entityReferences.delete(entity);
            this.memoryStats.entitiesReleased++;
        }
    }
    
    // Add tracked reference to entity
    addEntityReference(entity, reference) {
        if (this.entityReferences.has(entity)) {
            this.entityReferences.get(entity).references.add(reference);
        }
    }
    
    // Cleanup event listeners
    cleanupEventListener(element, eventType, handler) {
        const key = `${element}_${eventType}`;
        if (this.eventListeners.has(key)) {
            const listeners = this.eventListeners.get(key);
            listeners.delete(handler);
            if (listeners.size === 0) {
                this.eventListeners.delete(key);
            }
        }
    }
    
    // Track event listeners to prevent leaks
    trackEventListener(element, eventType, handler) {
        const key = `${element}_${eventType}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, new Set());
        }
        this.eventListeners.get(key).add(handler);
        this.memoryStats.listenersActive++;
    }
    
    // Comprehensive memory cleanup
    performGarbageCollection() {
        const currentTime = Date.now();
        
        // Only run GC cleanup at intervals
        if (currentTime - this.lastGCTrigger < this.gcInterval) {
            return;
        }
        
        this.lastGCTrigger = currentTime;
        
        // Force cleanup of object pools
        if (window.enhancedObjectPools) {
            window.enhancedObjectPools.cleanup();
        }
        
        if (window.ObjectPools) {
            window.ObjectPools.cleanup();
        }
        
        // Clear spatial partitioning of dead entities
        this.cleanupSpatialPartitioning();
        
        // Clear any orphaned references
        this.cleanupOrphanedReferences();
        
        // Suggest garbage collection (browser may ignore)
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
        
        this.memoryStats.lastGCCleanup = currentTime;
        
        // Log cleanup results
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('MEMORY', `GC cleanup: ${this.memoryStats.entitiesReleased}/${this.memoryStats.entitiesTracked} entities released, ${this.memoryStats.listenersActive} listeners active`);
        }
    }
    
    // Clean up spatial partitioning system
    cleanupSpatialPartitioning() {
        if (!window.gameEntities || !window.gameEntities.spatialPartitioning) return;
        
        const spatialSystem = window.gameEntities.spatialPartitioning;
        let cleanedEntities = 0;
        
        // Check each grid cell for dead entities
        spatialSystem.grid.forEach((entities, cellKey) => {
            const aliveEntities = entities.filter(entity => {
                // Check if entity is still alive and valid
                if (!entity || !entity.isAlive || entity.health <= 0) {
                    spatialSystem.entityToCell.delete(entity);
                    spatialSystem.entityTypes.delete(entity);
                    cleanedEntities++;
                    return false;
                }
                return true;
            });
            
            if (aliveEntities.length === 0) {
                spatialSystem.grid.delete(cellKey);
            } else if (aliveEntities.length !== entities.length) {
                spatialSystem.grid.set(cellKey, aliveEntities);
            }
        });
        
        if (cleanedEntities > 0 && window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('MEMORY', `Cleaned ${cleanedEntities} dead entities from spatial partitioning`);
        }
    }
    
    // Clean up orphaned references
    cleanupOrphanedReferences() {
        // This would be expanded based on specific reference patterns found
        // For now, just ensure basic cleanup
        
        // Clean up any dangling animation frames
        if (window.requestAnimationFrameId) {
            // This assumes proper frame ID tracking exists
        }
        
        // Clean up any cached data that might hold references
        if (window.gameState) {
            // Clear any temporary cached data
            delete window.gameState.tempCache;
        }
    }
    
    // Get memory usage statistics
    getMemoryStats() {
        const stats = {
            ...this.memoryStats,
            spatialPartitioningSize: 0,
            objectPoolSizes: {},
            heapUsed: 0
        };
        
        // Get spatial partitioning stats
        if (window.gameEntities && window.gameEntities.spatialPartitioning) {
            stats.spatialPartitioningSize = window.gameEntities.spatialPartitioning.grid.size;
        }
        
        // Get object pool stats
        if (window.enhancedObjectPools) {
            const poolStats = window.enhancedObjectPools.getStats();
            stats.objectPoolSizes = {
                vectors: poolStats.totalVectors,
                forces: poolStats.totalForces,
                arrays: poolStats.totalArrays
            };
        }
        
        // Try to get heap usage if available
        if (performance.memory) {
            stats.heapUsed = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024); // MB
            stats.heapLimit = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024); // MB
        }
        
        return stats;
    }
    
    // Detect potential memory leaks
    detectMemoryLeaks() {
        const stats = this.getMemoryStats();
        let warnings = [];
        
        // Check if entities are accumulating without being released
        const releaseRatio = stats.entitiesReleased / Math.max(1, stats.entitiesTracked);
        if (releaseRatio < 0.1 && stats.entitiesTracked > 100) {
            warnings.push('Low entity release ratio - potential memory leak');
            this.memoryStats.memoryLeakWarnings++;
        }
        
        // Check if object pools are growing too large
        if (stats.objectPoolSizes.vectors > 2000 || 
            stats.objectPoolSizes.forces > 1000 || 
            stats.objectPoolSizes.arrays > 200) {
            warnings.push('Object pools growing too large');
        }
        
        // Check spatial partitioning size
        if (stats.spatialPartitioningSize > 1000) {
            warnings.push('Spatial partitioning grid too large');
        }
        
        // Log warnings
        warnings.forEach(warning => {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('MEMORY', `⚠️ ${warning}`, 'warning');
            }
        });
        
        return warnings;
    }
    
    // Reset memory statistics
    reset() {
        this.memoryStats = {
            entitiesTracked: 0,
            entitiesReleased: 0,
            listenersActive: 0,
            lastGCCleanup: 0,
            memoryLeakWarnings: 0
        };
        this.eventListeners.clear();
    }
}

// Make globally accessible
window.MemoryManagementSystem = MemoryManagementSystem; 