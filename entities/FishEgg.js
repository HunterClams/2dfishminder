// Fish Egg class - Eggs dropped by fry when sharing food
class FishEgg extends (window.Entity || Entity) {
    constructor(x, y) {
        super(x, y);
        
        // Fish egg specific properties
        this.size = 8; // Reduced from 16 to 8 pixels
        this.eaten = false;
        this.spawnTime = Date.now();
        this.lifespan = 30000; // 30 seconds lifespan
        this.nutritionValue = 2; // Higher nutrition than regular fish food
        
        // Initialize velocity for gentle floating
        this.velocity = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5
        };
        
        // Gentle floating animation
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.02 + Math.random() * 0.01;
        
        console.log('🥚 FishEgg created at', x, y);
    }
    
    update() {
        // Gentle floating movement
        this.floatOffset += this.floatSpeed;
        this.y += Math.sin(this.floatOffset) * 0.2;
        
        // Apply gentle drift
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Check if egg has expired
        if (Date.now() - this.spawnTime > this.lifespan) {
            this.eaten = true; // Mark for removal
        }
        
        // Keep egg within world bounds
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        if (this.x < 0) this.x = 0;
        if (this.x > WORLD_WIDTH) this.x = WORLD_WIDTH;
        if (this.y < 0) this.y = 0;
        if (this.y > WORLD_HEIGHT) this.y = WORLD_HEIGHT;
    }
    
    draw() {
        if (this.eaten) return;
        
        const sprites = window.sprites || {};
        const fishEggSprite = sprites.fishEgg;
        
        if (!fishEggSprite) {
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
        const floatY = this.y + Math.sin(this.floatOffset) * 2;
        
        // Draw the fish egg sprite
        ctx.drawImage(fishEggSprite, this.x - this.size/2, floatY - this.size/2, this.size, this.size);
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.fryDebug) {
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
        
        const floatY = this.y + Math.sin(this.floatOffset) * 2;
        
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