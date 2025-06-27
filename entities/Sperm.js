// Fish Sperm class - Sperm released during spawning events
class Sperm extends (window.Entity || Entity) {
    constructor(x, y) {
        super(x, y);
        
        // Sperm specific properties
        this.size = 8; // Smaller than fish eggs
        this.eaten = false;
        this.spawnTime = Date.now();
        this.lifespan = 15000; // 15 seconds lifespan (shorter than eggs)
        this.nutritionValue = 1; // Lower nutrition than fish eggs
        
        // Initialize velocity for sinking motion (like poop)
        this.velocity = {
            x: (Math.random() - 0.5) * 0.5, // Small horizontal drift
            y: 0.5 + Math.random() * 1.0 // Downward sinking motion (0.5 to 1.5 pixels per frame)
        };
        
        // Swimming animation
        this.swimOffset = Math.random() * Math.PI * 2;
        this.swimSpeed = 0.03 + Math.random() * 0.02;
        
        console.log('🐟 Fish Sperm created at', x, y);
    }
    
    update() {
        // Sinking motion (minimal horizontal movement)
        this.swimOffset += this.swimSpeed;
        
        // Apply velocity (mainly downward)
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Check if sperm has expired
        if (Date.now() - this.spawnTime > this.lifespan) {
            this.eaten = true; // Mark for removal
        }
        
        // Keep sperm within world bounds
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
        const fishSpermSprite = sprites.fishSperm; // Use fish sperm sprite
        
        if (!fishSpermSprite) {
            // Fallback: draw a simple sperm shape
            this.drawFallbackSperm();
            return;
        }
        
        // Check if in render distance
        if (window.Utils && !window.Utils.inRenderDistance(this)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        // No depth shader for sperm - they should remain visible as they sink
        const opacity = 0.8; // Fixed opacity, no depth-based fading
        
        ctx.save();
        
        // Apply simple opacity without depth effects
        ctx.globalAlpha = opacity;
        
        // Draw the sperm sprite (no horizontal swimming animation)
        ctx.drawImage(fishSpermSprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawFallbackSperm() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw a simple sperm shape (smaller than egg)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 1;
        
        // Draw small circular sperm (no horizontal swimming animation)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw sperm label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPERM', this.x, this.y - this.size/2 - 5);
        
        // Draw nutrition value
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '7px Arial';
        ctx.fillText(`N:${this.nutritionValue}`, this.x, this.y + this.size/2 + 10);
        
        // Draw lifespan progress
        const lifespanProgress = (Date.now() - this.spawnTime) / this.lifespan;
        const timeLeft = Math.max(0, (this.lifespan - (Date.now() - this.spawnTime)) / 1000);
        ctx.fillText(`${timeLeft.toFixed(1)}s`, this.x, this.y + this.size/2 + 18);
        
        ctx.restore();
    }
    
    // Check if sperm is eaten by an entity
    checkEaten(entity) {
        if (this.eaten) return false;
        
        const distance = Math.sqrt((this.x - entity.x) ** 2 + (this.y - entity.y) ** 2);
        const eatRadius = (entity.size || 20) / 2 + this.size / 2;
        
        if (distance < eatRadius) {
            this.eaten = true;
            
            // Create eating bubbles
            if (window.ObjectPools) {
                for (let i = 0; i < 2; i++) {
                    window.ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 8,
                        this.y + (Math.random() - 0.5) * 8
                    );
                }
            }
            
            if (window.gameState?.fryDebug) {
                console.log(`🐟 Fish sperm eaten by ${entity.fishType || 'entity'}`);
            }
            
            return true;
        }
        
        return false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.Sperm = Sperm;
} 