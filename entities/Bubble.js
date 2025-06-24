// Bubble class for ambient ocean bubbles
class Bubble {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = Math.random() * WORLD_HEIGHT;
        this.speed = Math.random() * 0.5 + 0.3;
        this.sprite = Utils.getRandomBubbleSprite();
        this.size = Math.random() * 15 + 8;
    }
    
    update() {
        this.y -= this.speed;
        if (this.y < -20) {
            this.reset();
            this.y = WORLD_HEIGHT + 20;
        }
    }
    
    draw() {
        if (!Utils.inRenderDistance(this)) return;
        
        const depthOpacity = Utils.getDepthOpacity(this.y, 0.6);
        const tintStrength = Utils.getDepthTint(this.y);
        
        ctx.save();
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(this.sprite, 0, 0, this.size, this.size);
            
            // Apply tint using source-atop
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, this.x - this.size/2, this.y - this.size/2);
        } else {
            // No tint needed, draw normally
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

// EatingBubble class for feeding effects
class EatingBubble {
    constructor(x, y) {
        this.reset(x, y);
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2 - 1
        };
        this.life = 0;
        this.maxLife = Math.random() * 30 + 30;
        this.sprite = Utils.getRandomBubbleSprite();
        this.size = Math.random() * 8 + 4;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.rotation = 0;
        this.opacity = 1;
    }
    
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.velocity.y -= 0.05; // Buoyancy
        this.velocity.x *= 0.98; // Air resistance
        this.velocity.y *= 0.98;
        
        this.rotation += this.rotationSpeed;
        this.life++;
        
        // Fade out over time
        const lifeRatio = this.life / this.maxLife;
        this.opacity = Math.max(0, 1 - lifeRatio);
    }
    
    draw() {
        if (!Utils.inRenderDistance(this) || this.opacity <= 0) return;
        
        const depthOpacity = Utils.getDepthOpacity(this.y, this.opacity * 0.8);
        const tintStrength = Utils.getDepthTint(this.y);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(this.sprite, 0, 0, this.size, this.size);
            
            // Apply tint using source-atop
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            // No tint needed, draw normally
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(this.sprite, -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }
    
    isDead() {
        return this.life >= this.maxLife || this.opacity <= 0;
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Bubble = Bubble;
    window.EatingBubble = EatingBubble;
} 