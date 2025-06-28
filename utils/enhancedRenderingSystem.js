// Enhanced Rendering System Module
// Provides LOD-based rendering optimization for better performance

class EnhancedRenderingSystem {
    constructor() {
        this.lodSystem = null;
        this.performanceStats = {
            fullRenders: 0,
            simplifiedRenders: 0,
            minimalRenders: 0,
            lastReset: 0
        };
    }
    
    // Initialize LOD system
    initializeLOD() {
        if (window.LODSystem) {
            this.lodSystem = new window.LODSystem();
            console.log('🎨 Enhanced rendering system with LOD initialized');
        }
    }
    
    // Render entity with LOD support
    renderEntity(entity, renderType = 'boid') {
        const camera = window.camera;
        
        if (!this.lodSystem || !camera) {
            // Fallback to full rendering
            this.renderFull(entity, renderType);
            return;
        }
        
        // Update performance stats
        this.lodSystem.updatePerformanceStats(entity, camera);
        
        const renderDetail = this.lodSystem.getRenderDetail(entity, camera);
        
        switch (renderDetail) {
            case 'full':
                this.renderFull(entity, renderType);
                this.performanceStats.fullRenders++;
                break;
            case 'simplified':
                this.renderSimplified(entity, renderType);
                this.performanceStats.simplifiedRenders++;
                break;
            case 'minimal':
                this.renderMinimal(entity, renderType);
                this.performanceStats.minimalRenders++;
                break;
        }
    }
    
    renderFull(entity, renderType) {
        const ctx = window.ctx;
        const sprites = window.sprites;
        
        switch (renderType) {
            case 'boid':
                this.renderBoidFull(entity, ctx, sprites);
                break;
            case 'krill':
                this.renderKrillFull(entity, ctx, sprites);
                break;
            case 'predator':
                this.renderPredatorFull(entity, ctx, sprites);
                break;
            default:
                this.renderGenericFull(entity, ctx, sprites);
        }
    }
    
    renderSimplified(entity, renderType) {
        const ctx = window.ctx;
        
        switch (renderType) {
            case 'boid':
                this.renderBoidSimplified(entity, ctx);
                break;
            case 'krill':
                this.renderKrillSimplified(entity, ctx);
                break;
            case 'predator':
                this.renderPredatorSimplified(entity, ctx);
                break;
            default:
                this.renderGenericSimplified(entity, ctx);
        }
    }
    
    renderMinimal(entity, renderType) {
        const ctx = window.ctx;
        
        switch (renderType) {
            case 'boid':
                this.renderBoidMinimal(entity, ctx);
                break;
            case 'krill':
                this.renderKrillMinimal(entity, ctx);
                break;
            case 'predator':
                this.renderPredatorMinimal(entity, ctx);
                break;
            default:
                this.renderGenericMinimal(entity, ctx);
        }
    }
    
    // Full rendering methods
    renderBoidFull(entity, ctx, sprites) {
        // Use existing rendering logic
        if (entity.renderingSystem && entity.renderingSystem.draw) {
            entity.renderingSystem.draw(entity);
        } else {
            // Fallback to basic rendering
            this.renderBoidSimplified(entity, ctx);
        }
    }
    
    renderKrillFull(entity, ctx, sprites) {
        // Use existing krill rendering
        if (window.krillRenderingSystem) {
            if (entity instanceof window.Krill) {
                window.krillRenderingSystem.drawRegularKrill(entity);
            } else if (entity instanceof window.PaleKrill) {
                window.krillRenderingSystem.drawPaleKrill(entity);
            } else if (entity instanceof window.MomKrill) {
                window.krillRenderingSystem.drawMomKrill(entity);
            }
        } else {
            this.renderKrillSimplified(entity, ctx);
        }
    }
    
    renderPredatorFull(entity, ctx, sprites) {
        // Use existing predator rendering
        if (entity.draw) {
            entity.draw();
        } else {
            this.renderPredatorSimplified(entity, ctx);
        }
    }
    
    renderGenericFull(entity, ctx, sprites) {
        // Generic full rendering
        if (entity.draw) {
            entity.draw();
        } else {
            this.renderGenericSimplified(entity, ctx);
        }
    }
    
    // Simplified rendering methods
    renderBoidSimplified(entity, ctx) {
        // Simplified fish rendering - basic shape with direction
        ctx.fillStyle = this.getFishColor(entity.fishType);
        ctx.beginPath();
        ctx.ellipse(entity.x, entity.y, entity.size / 2, entity.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Add simple direction indicator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(entity.x, entity.y);
        ctx.lineTo(entity.x + entity.velocity.x * 5, entity.y + entity.velocity.y * 5);
        ctx.stroke();
    }
    
    renderKrillSimplified(entity, ctx) {
        // Simplified krill rendering
        ctx.fillStyle = '#FFD700'; // Gold color for krill
        ctx.beginPath();
        ctx.ellipse(entity.x, entity.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderPredatorSimplified(entity, ctx) {
        // Simplified predator rendering
        ctx.fillStyle = '#FF4500'; // Orange-red for predators
        ctx.beginPath();
        ctx.ellipse(entity.x, entity.y, entity.size / 2, entity.size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderGenericSimplified(entity, ctx) {
        // Generic simplified rendering
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(entity.x, entity.y, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Minimal rendering methods
    renderBoidMinimal(entity, ctx) {
        // Minimal fish rendering - just a colored dot
        ctx.fillStyle = this.getFishColor(entity.fishType);
        ctx.fillRect(entity.x - 2, entity.y - 2, 4, 4);
    }
    
    renderKrillMinimal(entity, ctx) {
        // Minimal krill rendering
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(entity.x - 1, entity.y - 1, 2, 2);
    }
    
    renderPredatorMinimal(entity, ctx) {
        // Minimal predator rendering
        ctx.fillStyle = '#FF4500';
        ctx.fillRect(entity.x - 2, entity.y - 2, 4, 4);
    }
    
    renderGenericMinimal(entity, ctx) {
        // Generic minimal rendering
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(entity.x - 1, entity.y - 1, 2, 2);
    }
    
    // Utility methods
    getFishColor(fishType) {
        // Simple color mapping for LOD rendering
        const colors = {
            'smallFry2': '#87CEEB', // Sky blue
            'smallFry3': '#98FB98', // Pale green
            'smallFry4': '#F0E68C', // Khaki
            'truefry1': '#FFB6C1', // Light pink
            'truefry2': '#DDA0DD', // Plum
            'krill': '#FFD700',     // Gold
            'paleKrill': '#F5F5DC', // Beige
            'momKrill': '#FFA500'   // Orange
        };
        return colors[fishType] || '#FFFFFF';
    }
    
    // Get performance statistics
    getStats() {
        const total = this.performanceStats.fullRenders + this.performanceStats.simplifiedRenders + this.performanceStats.minimalRenders;
        
        if (total === 0) {
            return {
                fullRenders: '0%',
                simplifiedRenders: '0%',
                minimalRenders: '0%',
                totalRenders: 0
            };
        }
        
        const fullPercent = (this.performanceStats.fullRenders / total * 100).toFixed(1);
        const simplifiedPercent = (this.performanceStats.simplifiedRenders / total * 100).toFixed(1);
        const minimalPercent = (this.performanceStats.minimalRenders / total * 100).toFixed(1);
        
        return {
            fullRenders: fullPercent + '%',
            simplifiedRenders: simplifiedPercent + '%',
            minimalRenders: minimalPercent + '%',
            totalRenders: total
        };
    }
    
    // Log performance stats periodically
    logPerformanceStats() {
        if (window.gameState && window.gameState.frameCount % 600 === 0) {
            const stats = this.getStats();
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.log('RENDERING', `LOD rendering: FULL ${stats.fullRenders}, SIMPLIFIED ${stats.simplifiedRenders}, MINIMAL ${stats.minimalRenders}`);
            }
            
            // Reset performance counters
            this.performanceStats.fullRenders = 0;
            this.performanceStats.simplifiedRenders = 0;
            this.performanceStats.minimalRenders = 0;
        }
    }
    
    // Reset performance stats
    reset() {
        this.performanceStats.fullRenders = 0;
        this.performanceStats.simplifiedRenders = 0;
        this.performanceStats.minimalRenders = 0;
    }
}

// Make globally accessible
window.EnhancedRenderingSystem = EnhancedRenderingSystem; 