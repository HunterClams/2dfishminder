// Fish Egg class - Eggs dropped by fry when sharing food
class FishEgg extends (window.Entity || Entity) {
    constructor(x, y) {
        super(x, y);
        
        // Fish egg specific properties
        this.size = 4; // Changed to 4px to match fertilized egg size
        this.eaten = false;
        this.spawnTime = Date.now();
        this.lifespan = 30000; // 30 seconds lifespan
        this.nutritionValue = 2; // Higher nutrition than regular fish food
        
        // Initialize shared floating system
        if (window.EggFloatingSystem) {
            window.EggFloatingSystem.initializeFloating(this);
        }
    }
    
    update() {
        // Use shared floating system
        if (window.EggFloatingSystem) {
            window.EggFloatingSystem.updateFloating(this);
        }
        
        // Check if egg has expired
        if (Date.now() - this.spawnTime > this.lifespan) {
            this.eaten = true; // Mark for removal
        }
    }
    
    draw() {
        // Use the modular egg rendering system
        if (window.EggRenderingSystem) {
            window.EggRenderingSystem.drawFishEgg(this);
        } else {
            // Fallback to original drawing method if system not available
            this.drawFallback();
        }
    }
    
    drawFallback() {
        if (this.eaten) return;
        
        const sprites = window.sprites || {};
        const fishEggSprite = sprites.fishEgg;
        
        // Validate sprite before drawing
        if (!fishEggSprite || !(fishEggSprite instanceof HTMLImageElement) || !fishEggSprite.complete) {
            // Fallback: draw a simple egg shape
            this.drawFallbackEgg();
            return;
        }
        
        // Check if in render distance
        if (window.Utils && !window.Utils.inRenderDistance(this)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Calculate depth-based opacity
        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(this.y, 0.9) : 0.9;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(this.y) : 0;
        
        ctx.save();
        
        // Apply depth effects
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Add gentle floating animation
        const floatY = window.EggFloatingSystem ? 
            window.EggFloatingSystem.getFloatingY(this) : 
            this.y + Math.sin(this.floatOffset) * 2;
        
        // Draw the fish egg sprite with validation
        try {
            ctx.drawImage(fishEggSprite, this.x - this.size/2, floatY - this.size/2, this.size, this.size);
        } catch (error) {
            console.warn('🥚 FishEgg drawImage error:', error);
            this.drawFallbackEgg();
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.debugManager && window.debugManager.isGlobalDebugOn()) {
            this.drawDebugInfo();
        }
    }
    
    drawFallbackEgg() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw a simple egg shape
        ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
        ctx.strokeStyle = 'rgba(200, 200, 150, 0.6)';
        ctx.lineWidth = 1;
        
        const floatY = window.EggFloatingSystem ? 
            window.EggFloatingSystem.getFloatingY(this) : 
            this.y + Math.sin(this.floatOffset) * 2;
        
        // Draw oval egg shape
        ctx.beginPath();
        ctx.ellipse(this.x, floatY, this.size/2, this.size/1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw egg label
        ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FISH EGG', this.x, this.y - this.size/2 - 10);
        
        // Draw nutrition value
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.fillText(`N:${this.nutritionValue}`, this.x, this.y + this.size/2 + 15);
        
        // Draw lifespan progress
        const lifespanProgress = (Date.now() - this.spawnTime) / this.lifespan;
        const timeLeft = Math.max(0, (this.lifespan - (Date.now() - this.spawnTime)) / 1000);
        ctx.fillText(`${timeLeft.toFixed(1)}s`, this.x, this.y + this.size/2 + 25);
        
        ctx.restore();
    }
    
    // Check if egg is eaten by an entity
    checkEaten(entity) {
        if (this.eaten) return false;
        
        const distance = Math.sqrt((this.x - entity.x) ** 2 + (this.y - entity.y) ** 2);
        const eatRadius = (entity.size || 20) / 2 + this.size / 2;
        
        if (distance < eatRadius) {
            this.eaten = true;
            
            // Create eating bubbles
            if (window.ObjectPools) {
                for (let i = 0; i < 3; i++) {
                    window.ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 10,
                        this.y + (Math.random() - 0.5) * 10
                    );
                }
            }
            
            if (window.gameState?.fryDebug) {
                console.log(`🥚 Fish egg eaten by ${entity.fishType || 'entity'}`);
            }
            
            return true;
        }
        
        return false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FishEgg = FishEgg;
} 