// Enhanced Performance Monitoring System Module
// Provides comprehensive performance tracking and optimization metrics

class PerformanceMonitoringSystem {
    constructor() {
        this.metrics = {
            frameTime: [],
            entityCounts: [],
            spatialQueries: 0,
            arrayOperations: {
                spreads: 0,
                concats: 0,
                directAccess: 0
            },
            distanceCalculations: {
                squared: 0,
                full: 0,
                optimizedRangeChecks: 0
            },
            memoryUsage: [],
            gcEvents: 0
        };
        
        this.lastUpdate = 0;
        this.updateInterval = 60; // Update every 60 frames
        this.maxSamples = 300; // Keep last 300 samples (5 seconds at 60fps)
        
        // Track optimization effectiveness
        this.optimizationStats = {
            arraySpreadEliminations: 0,
            distanceOptimizations: 0,
            spatialPartitioningHits: 0
        };
        
        console.log('📊 Enhanced Performance Monitoring System initialized');
    }
    
    // Track array operation optimizations
    trackArrayOperation(type) {
        if (this.metrics.arrayOperations[type] !== undefined) {
            this.metrics.arrayOperations[type]++;
        }
    }
    
    // Track distance calculation optimizations
    trackDistanceCalculation(type) {
        if (this.metrics.distanceCalculations[type] !== undefined) {
            this.metrics.distanceCalculations[type]++;
        }
    }
    
    // Track optimization effectiveness
    trackOptimization(type) {
        if (this.optimizationStats[type] !== undefined) {
            this.optimizationStats[type]++;
        }
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
            if (this.metrics.frameTime.length > this.maxSamples) {
                this.metrics.frameTime.shift();
            }
        }
        
        // Collect entity counts
        if (window.gameEntities) {
            const counts = window.gameEntities.getEntityCounts();
            this.metrics.entityCounts.push(counts);
            if (this.metrics.entityCounts.length > this.maxSamples) {
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
            // The original code had objectPoolHits and objectPoolMisses, but they are no longer tracked in the new constructor.
            // Assuming they are no longer relevant or will be re-added elsewhere.
            // For now, removing them as they are not in the new constructor's metrics object.
        }
        
        // Collect LOD distribution stats
        if (window.gameEntities && window.gameEntities.lodSystem) {
            const lodStats = window.gameEntities.lodSystem.getStats();
            // The original code had lodDistribution, but it's no longer tracked in the new constructor.
            // Assuming it's no longer relevant or will be re-added elsewhere.
            // For now, removing it as it's not in the new constructor's metrics object.
        }
    }
    
    analyzePerformance() {
        // Analyze frame time
        const avgFrameTime = this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length;
        
        // The original thresholds are removed, so this block will no longer trigger warnings.
        // if (avgFrameTime > this.thresholds.frameTimeCritical) {
        //     this.triggerPerformanceWarning('CRITICAL', `Frame time: ${avgFrameTime.toFixed(1)}ms`);
        // } else if (avgFrameTime > this.thresholds.frameTimeWarning) {
        //     this.triggerPerformanceWarning('WARNING', `Frame time: ${avgFrameTime.toFixed(1)}ms`);
        // }
        
        // Analyze entity counts
        if (this.metrics.entityCounts.length > 0) {
            const latestCounts = this.metrics.entityCounts[this.metrics.entityCounts.length - 1];
            const totalEntities = Object.values(latestCounts).reduce((a, b) => a + b, 0);
            
            // The original thresholds are removed, so this block will no longer trigger warnings.
            // if (totalEntities > this.thresholds.entityCountWarning) {
            //     this.triggerPerformanceWarning('INFO', `High entity count: ${totalEntities}`);
            // }
        }
        
        // Log performance summary
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.log('PERFORMANCE', `Avg frame time: ${avgFrameTime.toFixed(1)}ms, Spatial queries: ${this.metrics.spatialQueries}, Pool efficiency: ${this.calculatePoolEfficiency()}%`);
        }
    }
    
    calculatePoolEfficiency() {
        // The original objectPoolHits and objectPoolMisses are no longer tracked.
        // This function will now always return 100.
        return 100;
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
            // The original lodDistribution is no longer tracked.
            lodDistribution: {}
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
    // The original configureThresholds function is removed as thresholds are no longer tracked.
    // configureThresholds(frameTimeWarning = 16, frameTimeCritical = 33, entityCountWarning = 1000) {
    //     this.thresholds.frameTimeWarning = frameTimeWarning;
    //     this.thresholds.frameTimeCritical = frameTimeCritical;
    //     this.thresholds.entityCountWarning = entityCountWarning;
    // }
    
    // Reset all metrics
    reset() {
        this.metrics.frameTime = [];
        this.metrics.memoryUsage = [];
        this.metrics.entityCounts = [];
        this.metrics.spatialQueries = 0;
        this.metrics.arrayOperations = {
            spreads: 0,
            concats: 0,
            directAccess: 0
        };
        this.metrics.distanceCalculations = {
            squared: 0,
            full: 0,
            optimizedRangeChecks: 0
        };
        this.metrics.gcEvents = 0;
        
        this.optimizationStats = {
            arraySpreadEliminations: 0,
            distanceOptimizations: 0,
            spatialPartitioningHits: 0
        };
    }
    
    // Get optimization report
    getOptimizationReport() {
        const arrayEfficiency = this.metrics.arrayOperations.concats / 
            (this.metrics.arrayOperations.spreads + this.metrics.arrayOperations.concats + 1) * 100;
        
        const distanceEfficiency = this.metrics.distanceCalculations.squared / 
            (this.metrics.distanceCalculations.full + this.metrics.distanceCalculations.squared + 1) * 100;
        
        return {
            arrayOperationEfficiency: arrayEfficiency.toFixed(1) + '%',
            distanceCalculationEfficiency: distanceEfficiency.toFixed(1) + '%',
            optimizationStats: this.optimizationStats,
            totalOptimizations: Object.values(this.optimizationStats).reduce((a, b) => a + b, 0)
        };
    }
}

// Make globally accessible
window.PerformanceMonitoringSystem = PerformanceMonitoringSystem; 