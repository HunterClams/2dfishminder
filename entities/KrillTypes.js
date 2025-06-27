// Specialized Krill Types - Now using modular systems
class PaleKrill extends KrillBase {
    constructor(x, y, velocity = null) {
        super();
        
        // Override spawn position if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        
        // Override velocity if provided
        if (velocity) {
            this.velocity = velocity;
        }
        
        // Initialize with lifecycle system if available
        if (window.krillLifecycleSystem) {
            window.krillLifecycleSystem.initializePaleKrill(this);
        } else {
            // Fallback initialization
            this.krillSize = 7;
            this.size = 7;
            this.maxSpeed = 1.5;
            this.maxForce = 0.02;
            this.spriteFrames = ['paleKrill1', 'paleKrill2', 'paleKrill3', 'paleKrill2'];
            this.maturationTimer = 0;
            this.maturationDuration = 15000; // 15 seconds
            this.canTransform = true;
            this.energy = 0.4 + Math.random() * 0.3;
            this.nutritionLevel = 0.3;
            this.hunger = Math.random() * 0.7;
        }
    }
    
    update(boids, predators, food, poop) {
        // Call parent update first
        super.update(boids, predators, food, poop);
        
        // Update maturation timer
        this.maturationTimer += 16; // Approximate frame time
        
        // Check for food-based transformation
        if (this.shouldTransform && this.transformTo === 'regularKrill') {
            // Food-based transformation takes priority
            return;
        }
        
        // Check for time-based maturation
        if (this.maturationTimer >= this.maturationDuration && this.canTransform) {
            this.shouldTransform = true;
            this.transformTo = 'regularKrill';
        }
    }
    
    // Override food consumption to handle pale krill transformation
    consumePoop(poop, poopArray, index) {
        super.consumePoop(poop, poopArray, index);
        
        // Pale krill becomes regular krill when eating
        if (this.canTransform) {
            this.shouldTransform = true;
            this.transformTo = 'regularKrill';
        }
    }
    
    consumeFishFood(food) {
        super.consumeFishFood(food);
        
        // Pale krill becomes regular krill when eating
        if (this.canTransform) {
            this.shouldTransform = true;
            this.transformTo = 'regularKrill';
        }
    }
    
    draw() {
        if (window.KrillRenderingSystem) {
            window.KrillRenderingSystem.drawPaleKrill(this);
        } else {
            // Fallback drawing
            if (!window.Utils?.inRenderDistance(this)) return;
            
            const sprites = window.sprites || {};
            const baseOpacity = 0.7;
            let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
            let tintStrength = window.Utils.getDepthTint(this.y);
            
            const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
            if (!sprites[currentSpriteKey]) return;
            
            const ctx = window.ctx;
            if (!ctx) return;
            
            ctx.save();
            ctx.globalAlpha = depthOpacity;
            if (tintStrength > 0) {
                ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
            }
            
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(window.sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
            ctx.restore();
            
            if (window.gameState?.krillDebug) {
                this.drawDebugInfo();
            }
        }
    }
    
    drawDebugInfo() {
        if (window.KrillRenderingSystem) {
            window.KrillRenderingSystem.drawPaleKrillDebug(this);
        } else {
            // Fallback debug drawing
            const ctx = window.ctx;
            if (!ctx) return;
            
            ctx.save();
            ctx.fillStyle = '#DDA0DD';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PALE KRILL', this.x, this.y - 35);
            
            const maturationPercent = this.maturationTimer / this.maturationDuration;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '8px Arial';
            ctx.fillText(`Maturation: ${(maturationPercent * 100).toFixed(1)}%`, this.x, this.y + 35);
            
            const barWidth = 20;
            const barHeight = 3;
            const barY = this.y + 40;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#DDA0DD';
            ctx.fillRect(this.x - barWidth/2, barY, barWidth * maturationPercent, barHeight);
            
            super.drawDebugInfo();
            ctx.restore();
        }
    }
}

class MomKrill extends KrillBase {
    constructor(x, y, velocity = null) {
        super();
        
        // Override spawn position if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        
        // Override velocity if provided
        if (velocity) {
            this.velocity = velocity;
        }
        
        // Initialize with lifecycle system if available
        if (window.krillLifecycleSystem) {
            window.krillLifecycleSystem.initializeMomKrill(this);
        } else {
            // Fallback initialization
            this.krillSize = 9;
            this.size = 9;
            this.maxSpeed = 1.6;
            this.maxForce = 0.03;
            this.spriteFrames = ['momKrill1', 'momKrill2', 'momKrill3', 'momKrill2'];
            this.offspringTimer = 0;
            this.offspringInterval = 10000; // 10 seconds between offspring
            this.offspringTimerMax = 10000;
            this.maxOffspring = 3;
            this.offspringCount = 0;
            this.batchesProduced = 0;
            this.maxBatches = 3;
            this.canTransform = false;
            this.energy = 0.9 + Math.random() * 0.1;
            this.nutritionLevel = 0.8;
            this.hunger = Math.random() * 0.3;
        }
    }
    
    update(boids, predators, food, poop) {
        // Call parent update first
        super.update(boids, predators, food, poop);
        
        // Offspring production is handled by GameEntities.updateMomKrillOffspring()
        // No need to call checkOffspring() here to avoid double-timer increments
    }
    
    // Check if mom krill should produce offspring
    checkOffspring() {
        if (window.krillLifecycleSystem) {
            return window.krillLifecycleSystem.checkMomOffspring(this);
        }
        return false;
    }
    
    draw() {
        if (window.KrillRenderingSystem) {
            window.KrillRenderingSystem.drawMomKrill(this);
        } else {
            // Fallback drawing
            if (!window.Utils?.inRenderDistance(this)) return;
            
            const sprites = window.sprites || {};
            const baseOpacity = 0.9;
            let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
            let tintStrength = window.Utils.getDepthTint(this.y);
            
            const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
            if (!sprites[currentSpriteKey]) return;
            
            const ctx = window.ctx;
            if (!ctx) return;
            
            ctx.save();
            ctx.globalAlpha = depthOpacity;
            if (tintStrength > 0) {
                ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
            }
            
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.drawImage(window.sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
            ctx.restore();
            
            if (window.gameState?.krillDebug) {
                this.drawDebugInfo();
            }
        }
    }
    
    drawDebugInfo() {
        if (window.KrillRenderingSystem) {
            window.KrillRenderingSystem.drawMomKrillDebug(this);
        } else {
            // Fallback debug drawing
            const ctx = window.ctx;
            if (!ctx) return;
            
            ctx.save();
            ctx.fillStyle = '#FF69B4';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('MOM KRILL', this.x, this.y - 35);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '8px Arial';
            ctx.fillText(`Offspring: ${this.offspringCount}/${this.maxOffspring}`, this.x, this.y + 35);
            
            const offspringPercent = this.offspringTimer / this.offspringInterval;
            ctx.fillText(`Timer: ${(offspringPercent * 100).toFixed(1)}%`, this.x, this.y + 45);
            
            const barWidth = 20;
            const barHeight = 3;
            const barY = this.y + 50;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#FF69B4';
            ctx.fillRect(this.x - barWidth/2, barY, barWidth * offspringPercent, barHeight);
            
            super.drawDebugInfo();
            ctx.restore();
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PaleKrill = PaleKrill;
    window.MomKrill = MomKrill;
} 