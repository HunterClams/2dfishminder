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
        
        // Check if this is a small fry that should not have depth shader
        const isSmallFry = this.fishType === 'smallFry2' || 
                          this.fishType === 'smallFry3' || 
                          this.fishType === 'smallFry4';
        
        // Apply depth shader only if not a small fry
        let depthOpacity, tintStrength;
        if (isSmallFry) {
            // Small fry get fixed opacity without depth effects
            depthOpacity = opacity;
            tintStrength = 0;
        } else {
            // Other entities get full depth shader effects
            depthOpacity = Utils.getDepthOpacity(this.y, opacity);
            tintStrength = Utils.getDepthTint(this.y);
        }
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip sprite based on horizontal movement direction
        if (this.velocity.x < 0) {
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
}

// Export for global access
window.Entity = Entity; 