// Poop class for waste cycle system
class Poop {
    constructor(x, y, type = 'regular') {
        this.x = x;
        this.y = y;
        this.velocity = { x: 0, y: 0.3 }; // Slow downward drift
        this.type = type; // 'regular', 'tuna', 'squid', or 'abyssal'
        this.size = type === 'squid' ? 20 : (type === 'tuna' ? 16 : 9); // Squid poop is largest, fry poop 25% smaller
        this.feedValue = type === 'squid' ? 3 : (type === 'tuna' ? 2 : 1); // Squid poop has most nutrition
        
        // Abyssal poop (from fish food) starts as poop3 (deep water state)
        if (type === 'abyssal') {
            this.state = 3; // Start as deep water poop (poop3)
            this.size = 10; // Smaller than regular poop
            this.feedValue = 1; // Standard nutrition value
        } else {
            this.state = 1; // 1 = fresh, 2 = aged, 3 = deep water
        }
        
        this.stateTimer = 0;
        this.maxAge = 5000; // 5 seconds for state 1
        this.isActive = true;
        this.opacity = 1.0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.rotation = 0;
        
        // Add slight random drift
        this.velocity.x = (Math.random() - 0.5) * 0.1;
    }
    
    update() {
        if (!this.isActive) return;
        
        this.stateTimer += 16; // Approximate frame time
        
        // State 1 -> State 2 after 5 seconds
        if (this.state === 1 && this.stateTimer >= this.maxAge) {
            this.state = 2;
            this.stateTimer = 0;
        }
        
        // Check if we're in deep water (bottom 40% of world)
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const deepWaterThreshold = WORLD_HEIGHT * 0.6;
        if (this.y > deepWaterThreshold && this.state === 2) {
            this.state = 3;
        }
        
        // Movement
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.rotation += this.rotationSpeed;
        
        // Slight deceleration over time
        this.velocity.x *= 0.998;
        this.velocity.y *= 0.999;
        
        // Bounds checking - remove if too far down or out of bounds
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        if (this.y > WORLD_HEIGHT + 100 || this.x < -100 || this.x > WORLD_WIDTH + 100) {
            this.isActive = false;
        }
        
        // Fade out very old poop
        if (this.stateTimer > 30000) { // 30 seconds total life
            this.opacity -= 0.01;
            if (this.opacity <= 0) {
                this.isActive = false;
            }
        }
    }
    
    draw() {
        // Use the modular poop rendering system
        if (window.PoopRenderingSystem) {
            window.PoopRenderingSystem.draw(this);
        } else {
            // Fallback to original drawing method if system not available
            this.drawFallback();
        }
    }
    
    drawFallback() {
        if (!this.isActive) return;
        
        // Safe check for Utils and inRenderDistance
        if (window.Utils && window.Utils.inRenderDistance && !window.Utils.inRenderDistance(this)) return;
        
        // Poop should not have deep water shader effects - always use base opacity
        let depthOpacity = this.opacity; // No depth shader for poop
        
        // Safe check for ctx and sprites
        if (!window.ctx && !ctx) return;
        if (!window.sprites && !sprites) return;
        
        const context = window.ctx || ctx;
        const spriteObj = window.sprites || sprites;
        
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        
        let spriteKey;
        switch(this.state) {
            case 1: spriteKey = 'poop'; break;
            case 2: spriteKey = 'poop2'; break;
            case 3: spriteKey = 'poop3'; break;
        }
        
        // Draw normally without any depth effects
        context.globalAlpha = depthOpacity;
        context.drawImage(spriteObj[spriteKey], -this.size/2, -this.size/2, this.size, this.size);
        
        context.restore();
    }
    
    isDead() {
        return !this.isActive;
    }
    
    checkEaten(entity) {
        if (!this.isActive) return false;
        
        // Check if any entity is close enough to eat the poop
        for (let i = 0; i < entity.length; i++) {
            const e = entity[i];
            // Safe distance calculation
            const distance = window.Utils ? window.Utils.distance(this.x, this.y, e.x, e.y) : 
                            Math.sqrt((this.x - e.x) * (this.x - e.x) + (this.y - e.y) * (this.y - e.y));
            
            if (distance < this.size/2 + e.size/2) {
                this.isActive = false;
                return true;
            }
        }
        
        return false;
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Poop = Poop;
} 