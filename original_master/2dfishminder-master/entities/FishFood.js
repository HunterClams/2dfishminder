// FishFood class for player-dropped food
class FishFood {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 12;
        this.sinkSpeed = 0.8;
        this.eatRadius = 10;
        this.eaten = false;
        this.opacity = 1;
        this.transformedToPoop = false; // Track if already transformed to avoid multiple transformations
    }

    update() {
        if (!this.eaten) {
            this.y += this.sinkSpeed;
            
            // Use global constants safely
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            const CONSTANTS = window.CONSTANTS || { DEPTH_FADE_END: 0.8 };
            
            // Check if we've reached abyssal depth (80% of world height)
            const abyssalDepth = WORLD_HEIGHT * CONSTANTS.DEPTH_FADE_END; // 80%
            if (this.y >= abyssalDepth && !this.transformedToPoop) {
                // Transform into poop3 when reaching abyssal depth
                if (window.gameSystem && window.Poop) {
                    window.gameSystem.addEntity('poop', new window.Poop(this.x, this.y, 'abyssal'));
                }
                this.eaten = true;
                this.transformedToPoop = true;
                return;
            }
            
            if (this.y > WORLD_HEIGHT + 10) {
                this.eaten = true;
            }
        }
    }

    draw() {
        if (!this.eaten) {
            // Safe check for Utils and inRenderDistance
            if (window.Utils && window.Utils.inRenderDistance && !window.Utils.inRenderDistance(this)) return;
            
            const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(this.y, this.opacity) : this.opacity;
            const tintStrength = window.Utils ? window.Utils.getDepthTint(this.y) : 0;
            
            // Safe check for ctx and sprites
            if (!window.ctx && !ctx) return;
            if (!window.sprites && !sprites) return;
            
            const context = window.ctx || ctx;
            const spriteObj = window.sprites || sprites;
            
            context.save();
            
            if (tintStrength > 0) {
                // Create temporary canvas for proper transparency handling
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = this.size;
                tempCanvas.height = this.size;
                
                // Draw sprite on temp canvas
                tempCtx.drawImage(spriteObj.fishFood, 0, 0, this.size, this.size);
                
                // Apply tint using source-atop
                tempCtx.globalCompositeOperation = 'source-atop';
                tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
                tempCtx.fillRect(0, 0, this.size, this.size);
                
                // Draw the tinted sprite to main canvas
                context.globalAlpha = depthOpacity;
                context.drawImage(tempCanvas, this.x - this.size/2, this.y - this.size/2);
            } else {
                // No tint needed, draw normally
                context.globalAlpha = depthOpacity;
                context.drawImage(spriteObj.fishFood, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            }
            
            context.restore();
        }
    }

    checkEaten(fish) {
        if (this.eaten) return false;
        
        for (let i = 0; i < fish.length; i++) {
            const f = fish[i];
            // Safe distance calculation
            const distance = window.Utils ? window.Utils.distance(this.x, this.y, f.x, f.y) : 
                            Math.sqrt((this.x - f.x) * (this.x - f.x) + (this.y - f.y) * (this.y - f.y));
            
            if (distance < this.eatRadius + f.size/2) {
                // Create eating bubble effect
                if (window.ObjectPools) {
                    const bubble = window.ObjectPools.getEatingBubble(f.x, f.y);
                }
                
                // Add poop when fish eats food
                if (window.gameSystem && window.Poop) {
                    window.gameSystem.addEntity('poop', new window.Poop(f.x, f.y));
                }
                
                this.eaten = true;
                return true;
            }
        }
        return false;
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.FishFood = FishFood;
} 