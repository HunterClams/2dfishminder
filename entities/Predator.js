// Predator class for large hunting fish (tuna) - Now using modular systems
class Predator extends (window.Entity || Entity) {
    constructor(tunaType = 'tuna') {
        // Call parent constructor with mid-water spawning
        super(null, null, 'mid');
        
        // Use global constants safely
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        
        this.tunaType = tunaType;
        this.maxSpeed = 3;
        this.maxForce = 0.12; // Doubled from 0.06 for 2x sharper turning
        this.size = 50; // Both tuna types have same size for identical behavior
        this.huntCooldown = 0;
        this.aggression = 0.7 + Math.random() * 0.3;
        
        // Initialize modular systems
        this.initializeModularSystems();
        
        // Start in mid-to-deep waters
        this.y = WORLD_HEIGHT * 0.4 + Math.random() * WORLD_HEIGHT * 0.4;
        this.preferredDepth = WORLD_HEIGHT * 0.6;
        this.depthTolerance = WORLD_HEIGHT * 0.3;
        
        // Initialize sprite angle
        this.angle = 0;
    }

    /**
     * Initialize all modular systems
     */
    initializeModularSystems() {
        try {
            console.log('🐟 Initializing modular systems for tuna...');
            
            // Initialize AI system
            if (window.TunaAI) {
                console.log('🐟 Initializing TunaAI...');
                window.TunaAI.initializeTuna(this);
            } else {
                console.warn('⚠️ TunaAI not available');
            }
            
            // Initialize rendering system
            if (window.TunaRenderingSystem) {
                console.log('🐟 Initializing TunaRenderingSystem...');
                this.renderingSystem = new window.TunaRenderingSystem();
                this.renderingSystem.initializeRenderingSystem(this);
            } else {
                console.warn('⚠️ TunaRenderingSystem not available');
            }
            
            // Initialize physics system
            if (window.TunaPhysicsSystem) {
                console.log('🐟 Initializing TunaPhysicsSystem...');
                this.physicsSystem = new window.TunaPhysicsSystem();
                this.physicsSystem.initializePhysicsSystem(this);
            } else {
                console.warn('⚠️ TunaPhysicsSystem not available');
            }
            
            // Initialize legacy system
            if (window.TunaLegacySystem) {
                console.log('🐟 Initializing TunaLegacySystem...');
                this.legacySystem = new window.TunaLegacySystem();
                this.legacySystem.initializeLegacySystem(this);
            } else {
                console.warn('⚠️ TunaLegacySystem not available');
            }
            
            // Initialize threat system
            if (window.TunaThreatSystem) {
                console.log('🐟 Initializing TunaThreatSystem...');
                this.threatSystem = new window.TunaThreatSystem();
                this.threatSystem.initializeThreatSystem(this);
            } else {
                console.warn('⚠️ TunaThreatSystem not available');
            }
            
            console.log('🐟 Modular systems initialization complete');
        } catch (error) {
            console.error('❌ Error initializing modular systems:', error);
        }
    }

    // Apply force to acceleration (delegated to physics system)
    applyForce(force) {
        if (this.physicsSystem) {
            this.physicsSystem.applyForce(this, force);
        } else {
            // Fallback if physics system not available
            if (!this.acceleration) {
                this.acceleration = { x: 0, y: 0 };
            }
            this.acceleration.x += force.x;
            this.acceleration.y += force.y;
        }
    }

    // Handle world edges (delegated to physics system)
    edges() {
        if (this.physicsSystem) {
            this.physicsSystem.handleEdges(this);
        } else {
            // Fallback if physics system not available
            const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
            const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
            if (window.Utils && window.Utils.handleEdges) {
                window.Utils.handleEdges(this, 50, 0.9, WORLD_WIDTH, WORLD_HEIGHT);
            }
        }
    }

    // Legacy hunt method - now delegated to legacy system
    hunt(prey, krill = []) {
        if (this.legacySystem) {
            this.legacySystem.legacyHunt(this, prey, krill);
        }
    }

    // Legacy food checking - now delegated to legacy system
    checkForFood(prey, krill = []) {
        if (this.legacySystem) {
            this.legacySystem.legacyCheckForFood(this, prey, krill);
        }
    }

    // Main update method - now uses modular systems
    update(prey, krill, squid = []) {
        // Use AI system if available
        if (window.TunaAI && window.gameEntities) {
            // Let AI system handle all behavior
            window.TunaAI.updateAI(this, window.gameEntities);
            
            // Check for giant squid threats using threat system
            if (this.threatSystem) {
                this.threatSystem.checkForThreats(this, squid);
            } else {
                // Fallback threat checking
                this.checkForThreats(squid);
            }
            
            // Fallback eating system - check for nearby prey if AI isn't eating
            if (this.aiState === 'attacking' && this.huntCooldown <= 0) {
                if (this.legacySystem) {
                    this.legacySystem.fallbackEating(this);
                }
            }
        } else {
            // Fallback to legacy system
            if (this.legacySystem) {
                this.legacySystem.legacyUpdate(this, prey, krill, squid);
            }
        }
        
        // Update physics using physics system
        if (this.physicsSystem) {
            this.physicsSystem.updatePhysics(this);
            this.physicsSystem.updateEnergy(this);
        } else {
            // Fallback physics update with repulsion
            this.applyFallbackRepulsion();
            this.move();
            this.edges();
            if (this.huntCooldown > 0) {
                this.huntCooldown--;
            }
        }
    }

    // Check for giant squid threats (fallback method)
    checkForThreats(squid = []) {
        if (!squid.length) return;
        
        for (let s of squid) {
            const distance = window.Utils.distance(this, s);
            if (distance < 200) { // Flee radius
                // Transition to fleeing state if AI is available
                if (window.TunaAI && this.aiState !== window.TunaAI.states.FLEEING) {
                    window.TunaAI.transitionToState(this, window.TunaAI.states.FLEEING);
                }
                break;
            }
        }
    }
    
    // Fallback repulsion system for when modular systems aren't available
    applyFallbackRepulsion() {
        if (!window.gameEntities || !window.gameEntities.predators) return;
        
        const repulsionRadius = 80;
        const maxRepulsionRadius = 40;
        const maxRepulsionForce = 0.6; // Slightly weaker for fallback
        
        let totalRepulsionX = 0;
        let totalRepulsionY = 0;
        let repulsionCount = 0;
        
        // Check all other predators for repulsion
        for (let otherPredator of window.gameEntities.predators) {
            if (otherPredator === this) continue; // Skip self
            
            const distance = window.Utils.distance(this, otherPredator);
            
            // Only apply repulsion if predators are close enough
            if (distance < repulsionRadius && distance > 0) {
                // Calculate repulsion strength (stronger when closer)
                let repulsionStrength = 0;
                if (distance <= maxRepulsionRadius) {
                    repulsionStrength = maxRepulsionForce;
                } else {
                    repulsionStrength = maxRepulsionForce * (1 - (distance - maxRepulsionRadius) / (repulsionRadius - maxRepulsionRadius));
                }
                
                // Calculate repulsion direction (away from other predator)
                const angle = Math.atan2(this.y - otherPredator.y, this.x - otherPredator.x);
                const repulsionX = Math.cos(angle) * repulsionStrength;
                const repulsionY = Math.sin(angle) * repulsionStrength;
                
                totalRepulsionX += repulsionX;
                totalRepulsionY += repulsionY;
                repulsionCount++;
            }
        }
        
        // Apply average repulsion force if any repulsion was calculated
        if (repulsionCount > 0) {
            const avgRepulsionX = totalRepulsionX / repulsionCount;
            const avgRepulsionY = totalRepulsionY / repulsionCount;
            
            // Apply the repulsion force directly to acceleration
            if (!this.acceleration) {
                this.acceleration = { x: 0, y: 0 };
            }
            this.acceleration.x += avgRepulsionX;
            this.acceleration.y += avgRepulsionY;
        }
    }

    // Enhanced draw method - now delegated to rendering system
    draw() {
        if (this.renderingSystem) {
            this.renderingSystem.draw(this);
        } else {
            // Fallback drawing
            this.angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x));
            const sprites = window.sprites;
            
            // Validate sprite before drawing
            const sprite = sprites && sprites[this.tunaType];
            if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
                console.warn('🚨 Invalid sprite for predator:', {
                    tunaType: this.tunaType,
                    sprite: sprite,
                    type: typeof sprite,
                    isImage: sprite instanceof HTMLImageElement,
                    complete: sprite?.complete,
                    naturalWidth: sprite?.naturalWidth
                });
                return; // Skip drawing if sprite is invalid
            }
            
            this.drawSprite(sprite, this.size, 1, this.angle);
            
            // Validate fins sprite before drawing overlay
            const finsSprite = sprites.tunaFins;
            if (finsSprite && finsSprite instanceof HTMLImageElement && finsSprite.complete && finsSprite.naturalWidth > 0) {
                this.drawTunaOverlay(finsSprite, this.size, 1, this.angle);
            }
        }
    }
    
    // Fallback draw methods (kept for compatibility)
    drawSprite(sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(this)) return;
        
        // Validate sprite before drawing
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in Predator drawSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                tunaType: this.tunaType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Make tuna appear 50% deeper by adjusting depth calculation
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const adjustedDepthY = Math.min(this.y * 1.5, WORLD_HEIGHT);
        const depthOpacity = window.Utils.getDepthOpacity(adjustedDepthY, opacity);
        const tintStrength = window.Utils.getDepthTint(adjustedDepthY);
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in Predator temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: this.tunaType
                });
                ctx.restore();
                return;
            }
            
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            ctx.globalAlpha = depthOpacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in Predator main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: this.tunaType
                });
            }
        }
        
        ctx.restore();
    }
    
    drawTunaOverlay(sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(this)) return;
        
        // Validate sprite before drawing
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in Predator drawTunaOverlay:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                tunaType: this.tunaType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Make tuna appear 50% deeper by adjusting depth calculation
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const adjustedDepthY = Math.min(this.y * 1.5, WORLD_HEIGHT);
        const depthOpacity = window.Utils.getDepthOpacity(adjustedDepthY, opacity);
        let tintStrength = window.Utils.getDepthTint(adjustedDepthY);
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in Predator overlay temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: this.tunaType
                });
                ctx.restore();
                return;
            }
            
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            ctx.globalAlpha = depthOpacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in Predator overlay main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: this.tunaType
                });
            }
        }
        
        ctx.restore();
    }
    
    // Get current AI state for debugging
    getAIState() {
        if (this.renderingSystem) {
            return this.renderingSystem.getAIState(this);
        } else {
            return {
                state: this.aiState || 'none',
                target: this.aiTarget ? 'yes' : 'no',
                alertness: this.alertness ? Math.round(this.alertness * 100) : 0,
                huntSuccess: this.huntSuccess || 0,
                speedBoost: this.currentSpeedBoost ? Math.round((this.currentSpeedBoost - 1.0) * 100) : 0
            };
        }
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Predator = Predator;
} 