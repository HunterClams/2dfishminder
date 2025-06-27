// Fertilized Egg class - Eggs that have been fertilized by sperm
class FertilizedEgg extends (window.Entity || Entity) {
    constructor(x, y) {
        super(x, y);
        
        // Fertilized egg specific properties
        this.size = 10; // Slightly larger than regular eggs
        this.eaten = false;
        this.spawnTime = Date.now();
        this.lifespan = 60000; // 60 seconds lifespan (longer than regular eggs)
        this.nutritionValue = 5; // Higher nutrition than regular fish eggs
        this.fertilized = true; // Mark as fertilized
        
        // Initialize velocity for gentle floating
        this.velocity = {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3
        };
        
        // Gentle floating animation
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.015 + Math.random() * 0.01;
        
        // Development timer for hatching
        this.developmentTimer = 0;
        this.hatchingTime = 15000; // 15 seconds to hatch
        
        // Hatching system compatibility
        this.hatchTimer = 0; // Timer for hatching system
        this.hatched = false; // Flag to prevent double hatching
        
        console.log('🥚 FertilizedEgg created at', x, y);
    }
    
    update() {
        // Gentle floating movement
        this.floatOffset += this.floatSpeed;
        this.y += Math.sin(this.floatOffset) * 0.15;
        
        // Apply gentle drift
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        
        // Update development timer
        this.developmentTimer += 16; // Approximate frame time
        
        // Update hatching timer for truefry hatching system
        this.hatchTimer += 16; // Approximate frame time
        
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
        const fertilizedEggSprite = sprites.fertilizedEgg;
        
        if (!fertilizedEggSprite) {
            // Fallback: draw a simple fertilized egg shape
            this.drawFallbackFertilizedEgg();
            return;
        }
        
        // Check if in render distance
        if (window.Utils && !window.Utils.inRenderDistance(this)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Calculate depth-based opacity
        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(this.y, 0.95) : 0.95;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(this.y) : 0;
        
        ctx.save();
        
        // Apply depth effects
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Add gentle floating animation
        const floatY = this.y + Math.sin(this.floatOffset) * 2;
        
        // Draw the fertilized egg sprite
        ctx.drawImage(fertilizedEggSprite, this.x - this.size/2, floatY - this.size/2, this.size, this.size);
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawFallbackFertilizedEgg() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw a fertilized egg shape (different from regular eggs)
        ctx.fillStyle = 'rgba(255, 255, 220, 0.9)';
        ctx.strokeStyle = 'rgba(180, 180, 100, 0.7)';
        ctx.lineWidth = 2;
        
        const floatY = this.y + Math.sin(this.floatOffset) * 2;
        
        // Draw oval fertilized egg shape with development indicator
        ctx.beginPath();
        ctx.ellipse(this.x, floatY, this.size/2, this.size/1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw development indicator (small dot)
        const developmentProgress = this.developmentTimer / this.hatchingTime;
        if (developmentProgress > 0.3) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, floatY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Draw fertilized egg label
        ctx.fillStyle = 'rgba(255, 255, 220, 0.9)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FERTILIZED', this.x, this.y - this.size/2 - 10);
        
        // Draw nutrition value
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.fillText(`N:${this.nutritionValue}`, this.x, this.y + this.size/2 + 15);
        
        // Draw development progress
        const developmentProgress = this.developmentTimer / this.hatchingTime;
        const timeToHatch = Math.max(0, (this.hatchingTime - this.developmentTimer) / 1000);
        ctx.fillText(`${timeToHatch.toFixed(1)}s to hatch`, this.x, this.y + this.size/2 + 25);
        
        // Draw development bar
        if (developmentProgress > 0) {
            const barWidth = 20;
            const barHeight = 3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth/2, this.y + this.size/2 + 30, barWidth, barHeight);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(this.x - barWidth/2, this.y + this.size/2 + 30, barWidth * developmentProgress, barHeight);
        }
        
        ctx.restore();
    }
    
    // Check if fertilized egg is eaten by an entity
    checkEaten(entity) {
        if (this.eaten) return false;
        
        const distance = Math.sqrt((this.x - entity.x) ** 2 + (this.y - entity.y) ** 2);
        const eatRadius = (entity.size || 20) / 2 + this.size / 2;
        
        if (distance < eatRadius) {
            this.eaten = true;
            
            // Create eating bubbles
            if (window.ObjectPools) {
                for (let i = 0; i < 4; i++) {
                    window.ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 12,
                        this.y + (Math.random() - 0.5) * 12
                    );
                }
            }
            
            if (window.gameState?.fryDebug) {
                console.log(`🥚 Fertilized egg eaten by ${entity.fishType || 'entity'}`);
            }
            
            return true;
        }
        
        return false;
    }
    
    // Check if egg is ready to hatch
    isReadyToHatch() {
        return this.developmentTimer >= this.hatchingTime && !this.eaten;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FertilizedEgg = FertilizedEgg;
} 