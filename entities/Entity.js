// Base Entity class for all game entities
class Entity {
    constructor(x, y, spawnDepthZone = null) {
        // Use global constants
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        this.x = x || Math.random() * WORLD_WIDTH;
        this.y = y || (spawnDepthZone ? this.calculateDepth(spawnDepthZone) : Math.random() * WORLD_HEIGHT);
        this.velocity = { x: 0, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = 2;
        this.maxForce = 0.05;
        this.size = 20;
        this.angle = 0;
        this.health = 100;
        this.energy = 100;
        this.currentSprite = null;
        this.animationTimer = 0;
        this.spawnDepthZone = spawnDepthZone;
        this.isAlive = true;
    }

    calculateDepth(zone) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        switch (zone) {
            case 'surface': return Math.random() * WORLD_HEIGHT * 0.2;
            case 'shallow': return WORLD_HEIGHT * 0.2 + Math.random() * WORLD_HEIGHT * 0.2;
            case 'mid': return WORLD_HEIGHT * 0.4 + Math.random() * WORLD_HEIGHT * 0.3;
            case 'deep': return WORLD_HEIGHT * 0.7 + Math.random() * WORLD_HEIGHT * 0.2;
            case 'abyssal': return WORLD_HEIGHT * 0.9 + Math.random() * WORLD_HEIGHT * 0.1;
            default: return Math.random() * WORLD_HEIGHT;
        }
    }

    move() {
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    drawSprite(sprite, size, opacity = 1, angle = 0) {
        if (!sprite) return;
        
        // Safe check for Utils and inRenderDistance
        if (window.Utils && window.Utils.inRenderDistance && !window.Utils.inRenderDistance(this)) return;

        const depthOpacity = window.Utils ? window.Utils.getDepthOpacity(this.y, opacity) : opacity;
        const tintStrength = window.Utils ? window.Utils.getDepthTint(this.y) : 0;
        
        // Safe check for ctx
        if (!window.ctx && !ctx) return;
        const context = window.ctx || ctx;
        
        context.save();
        context.translate(this.x, this.y);
        context.rotate(angle);
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprite, 0, 0, size, size);
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            context.globalAlpha = depthOpacity;
            context.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally
            context.globalAlpha = depthOpacity;
            context.drawImage(sprite, -size/2, -size/2, size, size);
        }
        
        context.restore();
    }

    applyForce(force) {
        this.acceleration.x += force.x;
        this.acceleration.y += force.y;
    }

    update() {
        // Base update - override in subclasses
        this.move();
    }

    draw() {
        // Base draw - override in subclasses
        if (this.currentSprite) {
            this.drawSprite(this.currentSprite, this.size, 1, this.angle);
        }
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Entity = Entity;
} 