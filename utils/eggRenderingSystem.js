// Egg Rendering System - Centralized rendering for all egg types
// Optimized rendering with shared floating data

class EggRenderingSystem {
    constructor() {
        this.config = {
            SPRITE_KEYS: {
                fishEgg: 'fishEgg',
                fertilizedEgg: 'fertilizedEgg'
            },
            FALLBACK_COLORS: {
                fishEgg: 'rgba(255, 255, 200, 0.8)',
                fertilizedEgg: 'rgba(255, 255, 150, 0.9)'
            }
        };
        
        console.log('🥚 EggRenderingSystem initialized');
    }
    
    /**
     * Draw a fish egg entity
     * @param {Object} egg - The fish egg entity to draw
     */
    drawFishEgg(egg) {
        if (egg.eaten) return;
        
        const sprites = window.sprites || {};
        const fishEggSprite = sprites.fishEgg;
        
        // Check if in render distance
        if (window.Utils && !window.Utils.inRenderDistance(egg)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Calculate depth-based opacity
        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(egg.y, 0.9) : 0.9;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(egg.y) : 0;
        
        ctx.save();
        
        // Apply depth effects
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Add gentle floating animation
        const floatY = window.EggFloatingSystem ? 
            window.EggFloatingSystem.getFloatingY(egg) : 
            egg.y + Math.sin(egg.floatOffset) * 2;
        
        if (fishEggSprite && fishEggSprite instanceof HTMLImageElement && fishEggSprite.complete) {
            // Draw the fish egg sprite with validation
            try {
                ctx.drawImage(fishEggSprite, egg.x - egg.size/2, floatY - egg.size/2, egg.size, egg.size);
            } catch (error) {
                console.warn('🥚 EggRenderingSystem fishEgg drawImage error:', error);
                this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fishEgg);
            }
        } else {
            // Fallback: draw a simple egg shape
            this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fishEgg);
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.debugManager && window.debugManager.isGlobalDebugOn()) {
            this.drawDebugInfo(egg);
        }
    }
    
    /**
     * Draw a fertilized egg entity
     * @param {Object} egg - The fertilized egg entity to draw
     */
    drawFertilizedEgg(egg) {
        if (egg.eaten) return;
        
        const sprites = window.sprites || {};
        const fertilizedEggSprite = sprites.fertilizedEgg;
        
        // Check if in render distance
        if (window.Utils && !window.Utils.inRenderDistance(egg)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Calculate depth-based opacity
        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(egg.y, 0.9) : 0.9;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(egg.y) : 0;
        
        ctx.save();
        
        // Apply depth effects
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Add gentle floating animation
        const floatY = window.EggFloatingSystem ? 
            window.EggFloatingSystem.getFloatingY(egg) : 
            egg.y + Math.sin(egg.floatOffset) * 2;
        
        if (fertilizedEggSprite && fertilizedEggSprite instanceof HTMLImageElement && fertilizedEggSprite.complete) {
            // Draw the fertilized egg sprite with validation
            try {
                ctx.drawImage(fertilizedEggSprite, egg.x - egg.size/2, floatY - egg.size/2, egg.size, egg.size);
            } catch (error) {
                console.warn('🥚 EggRenderingSystem fertilizedEgg drawImage error:', error);
                this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fertilizedEgg);
            }
        } else {
            // Fallback: draw a simple egg shape
            this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fertilizedEgg);
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.debugManager && window.debugManager.isGlobalDebugOn()) {
            this.drawDebugInfo(egg);
        }
    }
    
    /**
     * Draw fallback egg shape when sprite is not available
     * @param {Object} egg - The egg entity
     * @param {number} floatY - The floating Y position
     * @param {string} color - The egg color
     */
    drawFallbackEgg(egg, floatY, color) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw a simple egg shape
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(200, 200, 150, 0.6)';
        ctx.lineWidth = 1;
        
        // Draw oval egg shape
        ctx.beginPath();
        ctx.ellipse(egg.x, floatY, egg.size/2, egg.size/1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Batch render multiple fish eggs for better performance
     * @param {Array} fishEggs - Array of fish egg entities to render
     */
    batchRenderFishEggs(fishEggs) {
        if (!fishEggs || fishEggs.length === 0) return;
        
        const ctx = window.ctx;
        const sprites = window.sprites || {};
        const fishEggSprite = sprites.fishEgg;
        
        if (!ctx) return;
        
        ctx.save();
        
        for (let egg of fishEggs) {
            if (egg.eaten) continue;
            if (window.Utils && !window.Utils.inRenderDistance(egg)) continue;
            
            // Calculate depth-based opacity
            const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(egg.y, 0.9) : 0.9;
            const tintStrength = window.Utils ? window.Utils.getDepthTint(egg.y) : 0;
            
            ctx.save();
            ctx.globalAlpha = depthOpacity;
            if (tintStrength > 0) {
                ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
            }
            
            // Add gentle floating animation
            const floatY = window.EggFloatingSystem ? 
                window.EggFloatingSystem.getFloatingY(egg) : 
                egg.y + Math.sin(egg.floatOffset) * 2;
            
            if (fishEggSprite && fishEggSprite instanceof HTMLImageElement && fishEggSprite.complete) {
                try {
                    ctx.drawImage(fishEggSprite, egg.x - egg.size/2, floatY - egg.size/2, egg.size, egg.size);
                } catch (error) {
                    console.warn('🥚 EggRenderingSystem batch fishEgg drawImage error:', error);
                    this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fishEgg);
                }
            } else {
                this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fishEgg);
            }
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    /**
     * Batch render multiple fertilized eggs for better performance
     * @param {Array} fertilizedEggs - Array of fertilized egg entities to render
     */
    batchRenderFertilizedEggs(fertilizedEggs) {
        if (!fertilizedEggs || fertilizedEggs.length === 0) return;
        
        const ctx = window.ctx;
        const sprites = window.sprites || {};
        const fertilizedEggSprite = sprites.fertilizedEgg;
        
        if (!ctx) return;
        
        ctx.save();
        
        for (let egg of fertilizedEggs) {
            if (egg.eaten) continue;
            if (window.Utils && !window.Utils.inRenderDistance(egg)) continue;
            
            // Calculate depth-based opacity
            const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(egg.y, 0.9) : 0.9;
            const tintStrength = window.Utils ? window.Utils.getDepthTint(egg.y) : 0;
            
            ctx.save();
            ctx.globalAlpha = depthOpacity;
            if (tintStrength > 0) {
                ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
            }
            
            // Add gentle floating animation
            const floatY = window.EggFloatingSystem ? 
                window.EggFloatingSystem.getFloatingY(egg) : 
                egg.y + Math.sin(egg.floatOffset) * 2;
            
            if (fertilizedEggSprite && fertilizedEggSprite instanceof HTMLImageElement && fertilizedEggSprite.complete) {
                try {
                    ctx.drawImage(fertilizedEggSprite, egg.x - egg.size/2, floatY - egg.size/2, egg.size, egg.size);
                } catch (error) {
                    console.warn('🥚 EggRenderingSystem batch fertilizedEgg drawImage error:', error);
                    this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fertilizedEgg);
                }
            } else {
                this.drawFallbackEgg(egg, floatY, this.config.FALLBACK_COLORS.fertilizedEgg);
            }
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw debug information for an egg
     * @param {Object} egg - The egg entity
     */
    drawDebugInfo(egg) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.fillStyle = 'yellow';
        ctx.font = '12px Arial';
        ctx.fillText(`Egg (${egg.x.toFixed(0)}, ${egg.y.toFixed(0)})`, egg.x + 10, egg.y - 10);
        ctx.restore();
    }
    
    /**
     * Get rendering statistics for debugging
     * @param {Array} fishEggs - Array of fish egg entities
     * @param {Array} fertilizedEggs - Array of fertilized egg entities
     * @returns {Object} Rendering statistics
     */
    getRenderStats(fishEggs, fertilizedEggs) {
        const stats = {
            fishEggs: { total: 0, active: 0, rendered: 0 },
            fertilizedEggs: { total: 0, active: 0, rendered: 0 }
        };
        
        if (fishEggs) {
            stats.fishEggs.total = fishEggs.length;
            for (let egg of fishEggs) {
                if (!egg.eaten) {
                    stats.fishEggs.active++;
                    if (window.Utils && window.Utils.inRenderDistance(egg)) {
                        stats.fishEggs.rendered++;
                    }
                }
            }
        }
        
        if (fertilizedEggs) {
            stats.fertilizedEggs.total = fertilizedEggs.length;
            for (let egg of fertilizedEggs) {
                if (!egg.eaten) {
                    stats.fertilizedEggs.active++;
                    if (window.Utils && window.Utils.inRenderDistance(egg)) {
                        stats.fertilizedEggs.rendered++;
                    }
                }
            }
        }
        
        return stats;
    }
    
    /**
     * Draw all fish eggs using the rendering system
     * @param {Array} fishEggs - Array of fish eggs to draw
     */
    drawAllFishEggs(fishEggs) {
        if (!fishEggs || fishEggs.length === 0) return;
        
        // Log rendering stats
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('RENDERING', `Drawing ${fishEggs.length} fish eggs with EggRenderingSystem`);
        }
        
        for (let egg of fishEggs) {
            if (!egg.eaten) {
                this.drawFishEgg(egg);
            }
        }
    }
    
    /**
     * Draw all fertilized eggs using the rendering system
     * @param {Array} fertilizedEggs - Array of fertilized eggs to draw
     */
    drawAllFertilizedEggs(fertilizedEggs) {
        if (!fertilizedEggs || fertilizedEggs.length === 0) return;
        
        // Log rendering stats
        if (window.ConsoleDebugSystem && window.ConsoleDebugSystem.isEnabled()) {
            window.ConsoleDebugSystem.log('RENDERING', `Drawing ${fertilizedEggs.length} fertilized eggs with EggRenderingSystem`);
        }
        
        for (let egg of fertilizedEggs) {
            if (!egg.eaten) {
                this.drawFertilizedEgg(egg);
            }
        }
    }
}

// Create and export global instance
const eggRenderingSystem = new EggRenderingSystem();
if (typeof window !== 'undefined') {
    window.EggRenderingSystem = eggRenderingSystem;
} 