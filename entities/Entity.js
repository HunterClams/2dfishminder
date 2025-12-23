// Base Entity class with optimized rendering
class Entity {
    constructor(x, y, spawnDepthZone = null) {
        // Use global constants
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        this.x = x || Math.random() * WORLD_WIDTH;
        
        // Habitat-based spawning system
        if (spawnDepthZone && !y) {
            switch (spawnDepthZone) {
                case 'surface': // 0-20% depth (surface layer)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.2);
                    break;
                case 'shallow': // 0-40% depth (shallow water)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 'mid': // 20-60% depth (mid-water zone)
                    this.y = (WORLD_HEIGHT * 0.2) + Math.random() * (WORLD_HEIGHT * 0.4);
                    break;
                case 'deep': // 0-80% depth (avoid abyssal)
                    this.y = Math.random() * (WORLD_HEIGHT * 0.8);
                    break;
                case 'abyssal': // 80-100% depth (deep water)
                    this.y = (WORLD_HEIGHT * 0.8) + Math.random() * (WORLD_HEIGHT * 0.2);
                    break;
                default:
                    this.y = Math.random() * WORLD_HEIGHT;
            }
        } else {
            this.y = y || Math.random() * WORLD_HEIGHT;
        }
        
        this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
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
        
        // Sprite flipping state to prevent rapid flipping when moving straight down
        this.facingDirection = 1; // 1 for right (no flip), -1 for left (flipped)
        this.flipVelocityThreshold = 0.3; // Minimum horizontal velocity to trigger flip
    }

    move() {
        // Integrate acceleration into velocity
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        
        // Reset acceleration
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        
        // Update position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    // Properly optimized sprite drawing with correct transparency handling
    drawSprite(sprite, size, opacity = 1, angle = 0) {
        if (!Utils.inRenderDistance(this)) return;
        
        // Comprehensive sprite validation
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite detected in drawSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                entityType: this.constructor.name,
                fishType: this.fishType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Apply depth shader to ALL fry types (including small fry)
        const depthOpacity = Utils.getDepthOpacity(this.y, opacity);
        const tintStrength = Utils.getDepthTint(this.y);
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Update facing direction with threshold to prevent rapid flipping
        // Only flip when horizontal velocity is significant (prevents flipping when moving straight down)
        const absVelX = Math.abs(this.velocity.x);
        if (absVelX > this.flipVelocityThreshold) {
            // Horizontal movement is significant - update facing direction
            const desiredDirection = this.velocity.x < 0 ? -1 : 1;
            if (desiredDirection !== this.facingDirection) {
                this.facingDirection = desiredDirection;
            }
        }
        // If horizontal velocity is too small, keep current facing direction (prevents rapid flipping)
        
        // Apply flip based on facing direction
        if (this.facingDirection < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided (for directional movement)
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    entityType: this.constructor.name
                });
                ctx.restore();
                return;
            }
            
            // Apply tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally with validation
            ctx.globalAlpha = depthOpacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    entityType: this.constructor.name,
                    fishType: this.fishType
                });
            }
        }
        
        ctx.restore();
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
    
    // Base food consumption method
    consumeFood(food) {
        // Basic food consumption logic
        this.energy = Math.min(this.energy + 20, 100);
        this.hunger = Math.max(this.hunger - 0.3, 0);
        
        if (window.gameState?.fryDebug) {
            console.log(`🍽️ ${this.constructor.name} consumed food. Energy: ${this.energy}, Hunger: ${this.hunger}`);
        }
        
        return true;
    }
    
    // Base poop consumption method
    consumePoop(poop, poopArray, index) {
        // Basic poop consumption logic
        this.energy = Math.min(this.energy + 15, 100);
        this.hunger = Math.max(this.hunger - 0.2, 0);
        
        // Remove poop from array if index is valid
        if (index >= 0 && index < poopArray.length) {
            poopArray.splice(index, 1);
        }
        
        if (window.gameState?.fryDebug) {
            console.log(`💩 ${this.constructor.name} consumed poop. Energy: ${this.energy}, Hunger: ${this.hunger}`);
        }
        
        return true;
    }
}

// Export for global access
window.Entity = Entity; 