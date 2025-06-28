// Spatial Partitioning System Module
// Provides efficient O(1) entity lookups using grid-based spatial partitioning

class SpatialPartitioningSystem {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.entityToCell = new Map();
        this.entityTypes = new Map(); // Track entity types for filtering
        this.performanceStats = {
            queries: 0,
            updates: 0,
            lastReset: 0
        };
    }
    
    updateEntity(entity, entityType = 'unknown') {
        this.performanceStats.updates++;
        
        const oldCell = this.entityToCell.get(entity);
        const newCell = this.getCellKey(entity.x, entity.y);
        
        if (oldCell !== newCell) {
            // Remove from old cell
            if (oldCell && this.grid.has(oldCell)) {
                const cell = this.grid.get(oldCell);
                const index = cell.indexOf(entity);
                if (index !== -1) cell.splice(index, 1);
            }
            
            // Add to new cell
            if (!this.grid.has(newCell)) {
                this.grid.set(newCell, []);
            }
            this.grid.get(newCell).push(entity);
            this.entityToCell.set(entity, newCell);
            this.entityTypes.set(entity, entityType);
        }
    }
    
    getNearbyEntities(entity, radius, entityTypes = null) {
        this.performanceStats.queries++;
        
        const nearby = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const centerCell = this.getCellKey(entity.x, entity.y);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                const cellKey = this.getCellKey(
                    entity.x + dx * this.cellSize,
                    entity.y + dy * this.cellSize
                );
                
                if (this.grid.has(cellKey)) {
                    const cellEntities = this.grid.get(cellKey);
                    for (const cellEntity of cellEntities) {
                        if (cellEntity !== entity) {
                            if (entityTypes === null || entityTypes.includes(this.entityTypes.get(cellEntity))) {
                                nearby.push(cellEntity);
                            }
                        }
                    }
                }
            }
        }
        
        return nearby;
    }
    
    getCellKey(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }
    
    removeEntity(entity) {
        const cell = this.entityToCell.get(entity);
        if (cell && this.grid.has(cell)) {
            const cellEntities = this.grid.get(cell);
            const index = cellEntities.indexOf(entity);
            if (index !== -1) cellEntities.splice(index, 1);
        }
        this.entityToCell.delete(entity);
        this.entityTypes.delete(entity);
    }
    
    // Performance monitoring
    getStats() {
        let totalEntities = 0;
        let maxCellSize = 0;
        let emptyCells = 0;
        
        for (const [cellKey, entities] of this.grid) {
            totalEntities += entities.length;
            maxCellSize = Math.max(maxCellSize, entities.length);
            if (entities.length === 0) emptyCells++;
        }
        
        return {
            totalEntities,
            maxCellSize,
            emptyCells,
            totalCells: this.grid.size,
            averageCellSize: totalEntities / Math.max(1, this.grid.size),
            queries: this.performanceStats.queries,
            updates: this.performanceStats.updates
        };
    }
    
    // Log performance stats periodically
    logPerformanceStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const stats = this.getStats();
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('SPATIAL', `Grid: ${stats.totalEntities} entities, ${stats.totalCells} cells, max cell: ${stats.maxCellSize}, queries: ${stats.queries}, updates: ${stats.updates}`);
            }
            
            // Reset performance counters
            this.performanceStats.queries = 0;
            this.performanceStats.updates = 0;
        }
    }
    
    // Clear all data (for cleanup)
    clear() {
        this.grid.clear();
        this.entityToCell.clear();
        this.entityTypes.clear();
        this.performanceStats.queries = 0;
        this.performanceStats.updates = 0;
    }
}

// Make globally accessible
window.SpatialPartitioningSystem = SpatialPartitioningSystem; 