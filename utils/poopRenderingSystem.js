// Poop Rendering System - Centralized rendering for all poop types
// Optimized rendering without depth shader effects

class PoopRenderingSystem {
    constructor() {
        this.config = {
            SPRITE_KEYS: {
                1: 'poop',    // Fresh poop
                2: 'poop2',   // Aged poop
                3: 'poop3'    // Deep water poop
            }
        };
        
        console.log('💩 PoopRenderingSystem initialized');
    }
    
    /**
     * Draw a poop entity with full depth shader effects
     * @param {Object} poop - The poop entity to draw
     */
    draw(poop) {
        if (!poop.isActive) return;
        
        // Safe check for Utils and inRenderDistance
        if (window.Utils && window.Utils.inRenderDistance && !window.Utils.inRenderDistance(poop)) return;
        
        // Apply full depth shader effects to poop
        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(poop.y, poop.opacity) : poop.opacity;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(poop.y) : 0;
        
        // Safe check for ctx and sprites
        if (!window.ctx && !ctx) return;
        if (!window.sprites && !sprites) return;
        
        const context = window.ctx || ctx;
        const spriteObj = window.sprites || sprites;
        
        // Get sprite key based on poop state
        const spriteKey = this.config.SPRITE_KEYS[poop.state] || 'poop';
        
        context.save();
        context.translate(poop.x, poop.y);
        context.rotate(poop.rotation);
        
        // Apply full depth shader effects
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = poop.size;
            tempCanvas.height = poop.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(spriteObj[spriteKey], 0, 0, poop.size, poop.size);
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, poop.size, poop.size);
            
            // Draw the tinted sprite to main canvas
            context.globalAlpha = depthOpacity;
            context.drawImage(tempCanvas, -poop.size/2, -poop.size/2);
        } else {
            // No tint needed, draw normally with depth opacity
            context.globalAlpha = depthOpacity;
            context.drawImage(spriteObj[spriteKey], -poop.size/2, -poop.size/2, poop.size, poop.size);
        }
        
        context.restore();
    }
    
    /**
     * Batch render multiple poop entities for better performance
     * @param {Array} poopArray - Array of poop entities to render
     */
    batchRender(poopArray) {
        if (!poopArray || poopArray.length === 0) return;
        
        const context = window.ctx || ctx;
        const spriteObj = window.sprites || sprites;
        
        if (!context || !spriteObj) return;
        
        // Group poop by state for more efficient rendering
        const poopByState = {
            1: [],
            2: [],
            3: []
        };
        
        // Sort poop by state
        for (let poop of poopArray) {
            if (poop.isActive && window.Utils && window.Utils.inRenderDistance(poop)) {
                poopByState[poop.state] = poopByState[poop.state] || [];
                poopByState[poop.state].push(poop);
            }
        }
        
        // Render each state group
        for (let state in poopByState) {
            const poopGroup = poopByState[state];
            if (poopGroup.length === 0) continue;
            
            const spriteKey = this.config.SPRITE_KEYS[state];
            if (!spriteKey || !spriteObj[spriteKey]) continue;
            
            context.save();
            
            for (let poop of poopGroup) {
                // Apply full depth shader effects to each poop
                const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(poop.y, poop.opacity) : poop.opacity;
                const tintStrength = window.Utils ? window.Utils.getDepthTint(poop.y) : 0;
                
                context.save();
                context.translate(poop.x, poop.y);
                context.rotate(poop.rotation);
                
                if (tintStrength > 0) {
                    // Create temporary canvas for proper transparency handling
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = poop.size;
                    tempCanvas.height = poop.size;
                    
                    // Draw sprite on temp canvas
                    tempCtx.drawImage(spriteObj[spriteKey], 0, 0, poop.size, poop.size);
                    
                    // Apply tint using source-atop (only affects non-transparent pixels)
                    tempCtx.globalCompositeOperation = 'source-atop';
                    tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
                    tempCtx.fillRect(0, 0, poop.size, poop.size);
                    
                    // Draw the tinted sprite to main canvas
                    context.globalAlpha = depthOpacity;
                    context.drawImage(tempCanvas, -poop.size/2, -poop.size/2);
                } else {
                    // No tint needed, draw normally with depth opacity
                    context.globalAlpha = depthOpacity;
                    context.drawImage(spriteObj[spriteKey], -poop.size/2, -poop.size/2, poop.size, poop.size);
                }
                
                context.restore();
            }
            
            context.restore();
        }
    }
    
    /**
     * Get rendering statistics for debugging
     * @param {Array} poopArray - Array of poop entities
     * @returns {Object} Rendering statistics
     */
    getRenderStats(poopArray) {
        if (!poopArray) return { total: 0, active: 0, rendered: 0 };
        
        let total = poopArray.length;
        let active = 0;
        let rendered = 0;
        
        for (let poop of poopArray) {
            if (poop.isActive) {
                active++;
                if (window.Utils && window.Utils.inRenderDistance(poop)) {
                    rendered++;
                }
            }
        }
        
        return { total, active, rendered };
    }
}

// Create and export global instance
const poopRenderingSystem = new PoopRenderingSystem();
if (typeof window !== 'undefined') {
    window.PoopRenderingSystem = poopRenderingSystem;
} 