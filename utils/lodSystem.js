// Level of Detail (LOD) System Module
// Provides distance-based rendering optimization for better performance

class LODSystem {
    constructor() {
        this.lodLevels = {
            HIGH: { 
                distance: 0, 
                updateFrequency: 1, 
                renderDetail: 'full',
                name: 'HIGH'
            },
            MEDIUM: { 
                distance: 500, 
                updateFrequency: 2, 
                renderDetail: 'simplified',
                name: 'MEDIUM'
            },
            LOW: { 
                distance: 1000, 
                updateFrequency: 4, 
                renderDetail: 'minimal',
                name: 'LOW'
            }
        };
        
        this.performanceStats = {
            highLOD: 0,
            mediumLOD: 0,
            lowLOD: 0,
            lastReset: 0
        };
    }
    
    getLODLevel(entity, camera) {
        const distance = Math.sqrt(
            Math.pow(entity.x - camera.x, 2) + 
            Math.pow(entity.y - camera.y, 2)
        );
        
        if (distance < this.lodLevels.MEDIUM.distance) {
            return this.lodLevels.HIGH;
        } else if (distance < this.lodLevels.LOW.distance) {
            return this.lodLevels.MEDIUM;
        } else {
            return this.lodLevels.LOW;
        }
    }
    
    shouldUpdate(entity, camera, frameCount) {
        const lodLevel = this.getLODLevel(entity, camera);
        return frameCount % lodLevel.updateFrequency === 0;
    }
    
    getRenderDetail(entity, camera) {
        return this.getLODLevel(entity, camera).renderDetail;
    }
    
    updatePerformanceStats(entity, camera) {
        const lodLevel = this.getLODLevel(entity, camera);
        this.performanceStats[lodLevel.name.toLowerCase() + 'LOD']++;
    }
    
    logPerformanceStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const total = this.performanceStats.highLOD + this.performanceStats.mediumLOD + this.performanceStats.lowLOD;
            if (total > 0) {
                const highPercent = (this.performanceStats.highLOD / total * 100).toFixed(1);
                const mediumPercent = (this.performanceStats.mediumLOD / total * 100).toFixed(1);
                const lowPercent = (this.performanceStats.lowLOD / total * 100).toFixed(1);
                
                if (window.ConsoleDebugSystem) {
                    window.ConsoleDebugSystem.log('LOD', `LOD distribution: HIGH ${highPercent}%, MEDIUM ${mediumPercent}%, LOW ${lowPercent}%`);
                }
            }
            
            // Reset stats
            this.performanceStats.highLOD = 0;
            this.performanceStats.mediumLOD = 0;
            this.performanceStats.lowLOD = 0;
        }
    }
    
    // Get performance statistics
    getStats() {
        const total = this.performanceStats.highLOD + this.performanceStats.mediumLOD + this.performanceStats.lowLOD;
        
        if (total === 0) {
            return {
                highLOD: '0%',
                mediumLOD: '0%',
                lowLOD: '0%',
                totalEntities: 0
            };
        }
        
        const highPercent = (this.performanceStats.highLOD / total * 100).toFixed(1);
        const mediumPercent = (this.performanceStats.mediumLOD / total * 100).toFixed(1);
        const lowPercent = (this.performanceStats.lowLOD / total * 100).toFixed(1);
        
        return {
            highLOD: highPercent + '%',
            mediumLOD: mediumPercent + '%',
            lowLOD: lowPercent + '%',
            totalEntities: total
        };
    }
    
    // Configure LOD levels
    configureLODLevels(highDistance = 0, mediumDistance = 500, lowDistance = 1000) {
        this.lodLevels.HIGH.distance = highDistance;
        this.lodLevels.MEDIUM.distance = mediumDistance;
        this.lodLevels.LOW.distance = lowDistance;
    }
    
    // Configure update frequencies
    configureUpdateFrequencies(highFreq = 1, mediumFreq = 2, lowFreq = 4) {
        this.lodLevels.HIGH.updateFrequency = highFreq;
        this.lodLevels.MEDIUM.updateFrequency = mediumFreq;
        this.lodLevels.LOW.updateFrequency = lowFreq;
    }
    
    // Reset performance stats
    reset() {
        this.performanceStats.highLOD = 0;
        this.performanceStats.mediumLOD = 0;
        this.performanceStats.lowLOD = 0;
    }
}

// Make globally accessible
window.LODSystem = LODSystem; 