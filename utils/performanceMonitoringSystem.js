// Performance Monitoring System Module
// Provides real-time performance tracking and optimization feedback

class PerformanceMonitoringSystem {
    constructor() {
        this.metrics = {
            frameTime: [],
            memoryUsage: [],
            entityCounts: [],
            spatialQueries: 0,
            objectPoolHits: 0,
            objectPoolMisses: 0,
            batchEfficiency: 0,
            lodDistribution: { high: 0, medium: 0, low: 0 }
        };
        
        this.thresholds = {
            frameTimeWarning: 16, // ms
            frameTimeCritical: 33, // ms
            memoryWarning: 50 * 1024 * 1024, // 50MB
            entityCountWarning: 1000
        };
        
        this.lastUpdate = 0;
        this.updateInterval = 60; // Update every second
        this.historySize = 120; // Keep 2 minutes of history
    }
    
    update(currentTime) {
        if (window.gameState && window.gameState.frameCount - this.lastUpdate > this.updateInterval) {
            this.collectMetrics();
            this.analyzePerformance();
            this.lastUpdate = window.gameState.frameCount;
        }
    }
    
    collectMetrics() {
        // Collect frame time metrics
        if (window.gameState) {
            const frameTime = 1000 / 60; // Approximate frame time
            this.metrics.frameTime.push(frameTime);
            if (this.metrics.frameTime.length > this.historySize) {
                this.metrics.frameTime.shift();
            }
        }
        
        // Collect entity counts
        if (window.gameEntities) {
            const counts = window.gameEntities.getEntityCounts();
            this.metrics.entityCounts.push(counts);
            if (this.metrics.entityCounts.length > this.historySize) {
                this.metrics.entityCounts.shift();
            }
        }
        
        // Collect spatial partitioning stats
        if (window.gameEntities && window.gameEntities.spatialPartitioning) {
            const stats = window.gameEntities.spatialPartitioning.getStats();
            this.metrics.spatialQueries = stats.queries;
        }
        
        // Collect object pooling stats
        if (window.enhancedObjectPools) {
            const stats = window.enhancedObjectPools.getStats();
            this.metrics.objectPoolHits = parseInt(stats.vectorEfficiency);
            this.metrics.objectPoolMisses = 100 - this.metrics.objectPoolHits;
        }
        
        // Collect LOD distribution stats
        if (window.gameEntities && window.gameEntities.lodSystem) {
            const lodStats = window.gameEntities.lodSystem.getStats();
            this.metrics.lodDistribution = {
                high: parseInt(lodStats.highLOD),
                medium: parseInt(lodStats.mediumLOD),
                low: parseInt(lodStats.lowLOD)
            };
        }
    }
    
    analyzePerformance() {
        // Analyze frame time
        const avgFrameTime = this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length;
        
        if (avgFrameTime > this.thresholds.frameTimeCritical) {
            this.triggerPerformanceWarning('CRITICAL', `Frame time: ${avgFrameTime.toFixed(1)}ms`);
        } else if (avgFrameTime > this.thresholds.frameTimeWarning) {
            this.triggerPerformanceWarning('WARNING', `Frame time: ${avgFrameTime.toFixed(1)}ms`);
        }
        
        // Analyze entity counts
        if (this.metrics.entityCounts.length > 0) {
            const latestCounts = this.metrics.entityCounts[this.metrics.entityCounts.length - 1];
            const totalEntities = Object.values(latestCounts).reduce((a, b) => a + b, 0);
            
            if (totalEntities > this.thresholds.entityCountWarning) {
                this.triggerPerformanceWarning('INFO', `High entity count: ${totalEntities}`);
            }
        }
        
        // Log performance summary
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('PERFORMANCE', `Avg frame time: ${avgFrameTime.toFixed(1)}ms, Spatial queries: ${this.metrics.spatialQueries}, Pool efficiency: ${this.calculatePoolEfficiency()}%`);
        }
    }
    
    calculatePoolEfficiency() {
        const total = this.metrics.objectPoolHits + this.metrics.objectPoolMisses;
        if (total === 0) return 100;
        return (this.metrics.objectPoolHits / total * 100).toFixed(1);
    }
    
    triggerPerformanceWarning(level, message) {
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('PERFORMANCE', `${level}: ${message}`, level.toLowerCase());
        }
    }
    
    getPerformanceReport() {
        const avgFrameTime = this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length;
        const poolEfficiency = this.calculatePoolEfficiency();
        
        return {
            averageFrameTime: avgFrameTime.toFixed(1) + 'ms',
            poolEfficiency: poolEfficiency + '%',
            spatialQueries: this.metrics.spatialQueries,
            totalEntities: this.metrics.entityCounts.length > 0 ? 
                Object.values(this.metrics.entityCounts[this.metrics.entityCounts.length - 1]).reduce((a, b) => a + b, 0) : 0,
            lodDistribution: this.metrics.lodDistribution
        };
    }
    
    // Get detailed performance breakdown
    getDetailedReport() {
        const report = this.getPerformanceReport();
        
        // Add entity breakdown
        if (this.metrics.entityCounts.length > 0) {
            const latestCounts = this.metrics.entityCounts[this.metrics.entityCounts.length - 1];
            report.entityBreakdown = latestCounts;
        }
        
        // Add frame time statistics
        if (this.metrics.frameTime.length > 0) {
            const frameTimes = this.metrics.frameTime;
            report.frameTimeStats = {
                min: Math.min(...frameTimes).toFixed(1) + 'ms',
                max: Math.max(...frameTimes).toFixed(1) + 'ms',
                average: report.averageFrameTime,
                samples: frameTimes.length
            };
        }
        
        return report;
    }
    
    // Configure thresholds
    configureThresholds(frameTimeWarning = 16, frameTimeCritical = 33, entityCountWarning = 1000) {
        this.thresholds.frameTimeWarning = frameTimeWarning;
        this.thresholds.frameTimeCritical = frameTimeCritical;
        this.thresholds.entityCountWarning = entityCountWarning;
    }
    
    // Reset all metrics
    reset() {
        this.metrics.frameTime = [];
        this.metrics.memoryUsage = [];
        this.metrics.entityCounts = [];
        this.metrics.spatialQueries = 0;
        this.metrics.objectPoolHits = 0;
        this.metrics.objectPoolMisses = 0;
        this.metrics.batchEfficiency = 0;
        this.metrics.lodDistribution = { high: 0, medium: 0, low: 0 };
    }
}

// Make globally accessible
window.PerformanceMonitoringSystem = PerformanceMonitoringSystem; 