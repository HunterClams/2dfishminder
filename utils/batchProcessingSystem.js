// Batch Processing System Module
// Provides efficient batch-based entity updates to reduce processing overhead

class BatchProcessingSystem {
    constructor(batchSize = 20) {
        this.batchSize = batchSize;
        this.batchTypes = new Map();
        this.performanceStats = {
            batchesProcessed: 0,
            entitiesProcessed: 0,
            lastReset: 0
        };
    }
    
    // Register entity type for batch processing
    registerBatchType(entityType, updateFunction) {
        this.batchTypes.set(entityType, {
            entities: [],
            updateFunction: updateFunction,
            currentBatch: 0,
            totalBatches: 0
        });
    }
    
    // Add entities to batch processing
    addEntities(entityType, entities) {
        if (this.batchTypes.has(entityType)) {
            const batchData = this.batchTypes.get(entityType);
            batchData.entities = entities;
            batchData.totalBatches = Math.ceil(entities.length / this.batchSize);
        }
    }
    
    // Process all batches
    processBatches() {
        for (const [entityType, batchData] of this.batchTypes) {
            this.processBatchType(entityType, batchData);
        }
        
        // Update performance stats
        this.updatePerformanceStats();
    }
    
    processBatchType(entityType, batchData) {
        const { entities, updateFunction, currentBatch } = batchData;
        const startIndex = currentBatch * this.batchSize;
        const endIndex = Math.min(startIndex + this.batchSize, entities.length);
        
        // Process current batch
        for (let i = startIndex; i < endIndex; i++) {
            if (entities[i]) {
                updateFunction(entities[i], i);
                this.performanceStats.entitiesProcessed++;
            }
        }
        
        // Move to next batch
        batchData.currentBatch++;
        if (batchData.currentBatch >= batchData.totalBatches) {
            batchData.currentBatch = 0; // Reset for next frame
        }
        
        this.performanceStats.batchesProcessed++;
    }
    
    // Get entities for current batch
    getCurrentBatch(entityType) {
        const batchData = this.batchTypes.get(entityType);
        if (!batchData) return [];
        
        const startIndex = batchData.currentBatch * this.batchSize;
        const endIndex = Math.min(startIndex + this.batchSize, batchData.entities.length);
        return batchData.entities.slice(startIndex, endIndex);
    }
    
    // Get batch progress for entity type
    getBatchProgress(entityType) {
        const batchData = this.batchTypes.get(entityType);
        if (!batchData) return { current: 0, total: 0, percentage: 0 };
        
        const percentage = batchData.totalBatches > 0 ? 
            (batchData.currentBatch / batchData.totalBatches * 100).toFixed(1) : 0;
        
        return {
            current: batchData.currentBatch,
            total: batchData.totalBatches,
            percentage: percentage
        };
    }
    
    updatePerformanceStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('BATCH', `Processed ${this.performanceStats.batchesProcessed} batches, ${this.performanceStats.entitiesProcessed} entities`);
            }
            this.performanceStats.batchesProcessed = 0;
            this.performanceStats.entitiesProcessed = 0;
        }
    }
    
    // Get performance statistics
    getStats() {
        const batchTypes = Array.from(this.batchTypes.keys());
        const batchProgress = {};
        
        for (const entityType of batchTypes) {
            batchProgress[entityType] = this.getBatchProgress(entityType);
        }
        
        return {
            batchTypes: batchTypes,
            batchProgress: batchProgress,
            totalBatchesProcessed: this.performanceStats.batchesProcessed,
            totalEntitiesProcessed: this.performanceStats.entitiesProcessed
        };
    }
    
    // Reset all batch counters
    reset() {
        for (const [entityType, batchData] of this.batchTypes) {
            batchData.currentBatch = 0;
        }
        this.performanceStats.batchesProcessed = 0;
        this.performanceStats.entitiesProcessed = 0;
    }
}

// Make globally accessible
window.BatchProcessingSystem = BatchProcessingSystem; 