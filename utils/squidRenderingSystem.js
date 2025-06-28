// GiantSquid Rendering System - Drawing and visual effects
// Handles sprite rendering, bioluminescence, prey display, and debug info

class SquidRenderingSystem {
    constructor() {
        this.config = window.SQUID_CONFIG;
        this.states = window.SQUID_STATES;
    }

    /**
     * Draw the squid with all visual effects
     * @param {Object} squid - The squid entity
     * @param {Object} jetSystem - The jet propulsion system
     */
    draw(squid, jetSystem) {
        if (!window.Utils || !window.Utils.inRenderDistance(squid)) return;

        const ctx = window.ctx;
        if (!ctx) return;

        // Choose sprite based on movement state
        let sprite, abyssalSprite;
        const isBlinking = squid.bioluminescenceSystem ? squid.bioluminescenceSystem.isBlinking(squid) : false;
        
        // Use global sprites safely
        const sprites = window.sprites || {};
        
        if (jetSystem.isMantleContracted(squid) || jetSystem.isJetting(squid)) {
            sprite = sprites.giantSquid2; // Contracted mantle during jetting
            // Alternate between normal and blinking bioluminescent sprites
            abyssalSprite = isBlinking ? sprites.abyssalSquid2Blink : sprites.abyssalSquid2;
        } else {
            sprite = sprites.giantSquid1; // Relaxed mantle
            // Alternate between normal and blinking bioluminescent sprites
            abyssalSprite = isBlinking ? sprites.abyssalSquid1Blink : sprites.abyssalSquid1;
        }
        
        // Debug logging for sprite selection
        if (window.gameState && window.gameState.squidDebug && squid.stateTimer % 60 === 0) {
            console.log(`🦑 Squid sprite selection:`, {
                baseSprite: sprite ? 'loaded' : 'missing',
                abyssalSprite: abyssalSprite ? 'loaded' : 'missing',
                isBlinking: isBlinking,
                mantleContracted: jetSystem.isMantleContracted(squid),
                isJetting: jetSystem.isJetting(squid),
                availableSprites: Object.keys(sprites).filter(key => key.includes('abyssal')),
                baseSpriteDimensions: sprite ? `${sprite.naturalWidth}x${sprite.naturalHeight}` : 'N/A',
                abyssalSpriteDimensions: abyssalSprite ? `${abyssalSprite.naturalWidth}x${abyssalSprite.naturalHeight}` : 'N/A'
            });
        }
        
        // Calculate angle based on movement direction
        let angle = 0;
        if (squid.currentSpeed > 0.5) {
            angle = Math.atan2(squid.velocity.y, squid.velocity.x) * 0.3;
        }
        
        // Apply full water shader effect
        const baseOpacity = window.Utils.getDepthOpacity(squid.y, 1.0);
        const reducedOpacity = baseOpacity * squid.depthOpacityMultiplier + (1 - squid.depthOpacityMultiplier);
        
        // Draw base squid sprite
        squid.drawSprite(sprite, squid.size, reducedOpacity, angle);
        
        // Draw bioluminescent effects using the new system
        if (squid.bioluminescenceSystem) {
            squid.bioluminescenceSystem.drawBioluminescence(squid, abyssalSprite, reducedOpacity, angle);
        } else {
            // Fallback to old system if bioluminescence system not available
            this.drawBioluminescence(squid, abyssalSprite, reducedOpacity, angle);
        }
        
        // Draw grabbed prey if consuming
        this.drawGrabbedPrey(squid, reducedOpacity, angle);
        
        // Draw debug information
        if (window.debugManager && window.debugManager.isDebugOn('squid')) {
            this.drawDebugInfo(squid);
        }
    }

    /**
     * Draw the base squid sprite
     * @param {Object} squid - The squid entity
     * @param {Image} sprite - The sprite image
     * @param {number} size - Sprite size
     * @param {number} opacity - Opacity value
     * @param {number} angle - Rotation angle
     */
    drawSprite(squid, sprite, size, opacity, angle) {
        const ctx = window.ctx;
        if (!ctx || !sprite) return;

        // Validate sprite before drawing
        if (!(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in SquidRenderingSystem drawSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                squidState: squid.state
            });
            return; // Skip drawing if sprite is invalid
        }

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(squid.x, squid.y);
        ctx.rotate(angle);
        
        try {
            ctx.drawImage(sprite, -size/2, -size/2, size, size);
        } catch (error) {
            console.error('🚨 drawImage error in SquidRenderingSystem:', error, {
                sprite: sprite,
                size: size,
                squidState: squid.state
            });
        }
        
        ctx.restore();
    }

    /**
     * Draw bioluminescent effects
     * @param {Object} squid - The squid entity
     * @param {Image} abyssalSprite - The bioluminescent sprite
     * @param {number} baseOpacity - Base opacity
     * @param {number} angle - Rotation angle
     */
    drawBioluminescence(squid, abyssalSprite, baseOpacity, angle) {
        if (!abyssalSprite) return;

        // Check if in deep waters (70%+ depth) and overlay bioluminescent sprites
        const depthFactor = window.Utils.getDepthFactor(squid.y);
        if (depthFactor >= this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD) {
            let bioIntensity;
            
            if (depthFactor >= this.config.ABYSSAL_DEPTH_THRESHOLD) {
                // Abyssal zone (80-100%): Full intensity bioluminescence
                const abyssalProgress = (depthFactor - this.config.ABYSSAL_DEPTH_THRESHOLD) / 0.2;
                bioIntensity = this.config.BIO_INTENSITY_MIN + (abyssalProgress * (this.config.BIO_INTENSITY_MAX - this.config.BIO_INTENSITY_MIN));
            } else {
                // Faint tier (70-80%): Progressive bioluminescence activation
                const faintProgress = (depthFactor - this.config.BIOLUMINESCENCE_DEPTH_THRESHOLD) / 0.1;
                bioIntensity = this.config.BIO_INTENSITY_MIN + (faintProgress * (this.config.BIO_INTENSITY_MAX - this.config.BIO_INTENSITY_MIN));
            }
            
            // Full brightness for abyssal sprites - no depth shader tint (like the old system)
            const spotReducedOpacity = 1.0; // Maximum opacity, no depth effects
            
            // Draw bioluminescent overlay with additive blending for glow effect
            const ctx = window.ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
            this.drawSprite(squid, abyssalSprite, squid.size, spotReducedOpacity, angle);
            ctx.restore();
        }
    }

    /**
     * Draw grabbed prey if consuming
     * @param {Object} squid - The squid entity
     * @param {number} baseOpacity - Base opacity
     * @param {number} angle - Rotation angle
     */
    drawGrabbedPrey(squid, baseOpacity, angle) {
        if (!squid.grabbedPrey || squid.state !== this.states.RETREATING) return;

        const sprites = window.sprites || {};
        
        // Get the appropriate sprite (normal or eaten)
        let preySpriteKey = squid.grabbedPrey.tunaType || 'smallFry2';
        if (squid.grabbedPrey.tunaType && window.TunaSpriteUtils) {
            preySpriteKey = window.TunaSpriteUtils.getCurrentSpriteKey(squid.grabbedPrey);
        }
        
        // Don't draw if no sprite should be shown (prevents flash)
        if (!preySpriteKey) {
            return;
        }
        
        const preySprite = sprites[preySpriteKey];
        if (!preySprite) {
            return;
        }
        
        // Validate prey sprite before drawing
        if (!(preySprite instanceof HTMLImageElement) || !preySprite.complete || preySprite.naturalWidth === 0) {
            console.warn('🚨 Invalid prey sprite in SquidRenderingSystem drawGrabbedPrey:', {
                preySpriteKey: preySpriteKey,
                preySprite: preySprite,
                type: typeof preySprite,
                isImage: preySprite instanceof HTMLImageElement,
                complete: preySprite?.complete,
                naturalWidth: preySprite?.naturalWidth,
                squidState: squid.state
            });
            return; // Skip drawing if sprite is invalid
        }
        
        const preyX = squid.x + Math.cos(squid.tentaclePulse) * this.config.PREY_OFFSET_X; 
        const preyY = squid.y + Math.sin(squid.tentaclePulse) * this.config.PREY_OFFSET_Y; 
        
        const ctx = window.ctx;
        ctx.save();
        
        // Calculate opacity with sprite replacement system
        let preyOpacity = baseOpacity * this.config.PREY_OPACITY_MULTIPLIER;
        if (squid.grabbedPrey.tunaType && window.TunaSpriteUtils) {
            preyOpacity = window.TunaSpriteUtils.calculateSpriteOpacity(squid.grabbedPrey, baseOpacity * this.config.PREY_OPACITY_MULTIPLIER);
        }
        
        // Don't draw if opacity is 0
        if (preyOpacity <= 0) {
            ctx.restore();
            return;
        }
        
        ctx.globalAlpha = preyOpacity;
        ctx.translate(preyX, preyY);
        ctx.rotate(angle * 0.5);
        
        try {
            ctx.drawImage(preySprite, -squid.grabbedPrey.size/2, -squid.grabbedPrey.size/2, 
                         squid.grabbedPrey.size, squid.grabbedPrey.size);
        } catch (error) {
            console.error('🚨 drawImage error in SquidRenderingSystem drawGrabbedPrey:', error, {
                preySprite: preySprite,
                preySpriteKey: preySpriteKey,
                preySize: squid.grabbedPrey.size,
                squidState: squid.state
            });
        }
        
        ctx.restore();
    }

    /**
     * Draw debug information
     * @param {Object} squid - The squid entity
     */
    drawDebugInfo(squid) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State indicator above squid
        const stateY = squid.y - squid.size/2 - 30;
        
        // State background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(squid.x - 60, stateY - 20, 120, 25);
        
        // State text with color coding
        let stateColor = '#ffffff';
        let stateText = squid.state.toUpperCase();
        
        switch (squid.state) {
            case this.states.PATROLLING:
                stateColor = '#00ff00'; // Green
                break;
            case this.states.HUNTING:
                stateColor = '#ffaa00'; // Orange
                if (squid.huntTarget) {
                    const dist = this.distance(squid, squid.huntTarget);
                    stateText += ` (${Math.round(dist)}px)`;
                }
                break;
            case this.states.ATTACKING:
                stateColor = '#ff0000'; // Red
                break;
            case this.states.RETREATING:
                stateColor = '#0088ff'; // Blue
                if (squid.grabbedPrey) {
                    const consumeProgress = Math.round((squid.stateTimer / this.config.CONSUMPTION_DURATION) * 100);
                    stateText += ` (${consumeProgress}%)`;
                }
                break;
        }
        
        ctx.fillStyle = stateColor;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(stateText, squid.x, stateY - 2);
        
        // Jet status indicator
        if (squid.jetDuration > 0 || squid.jetCooldown > 0) {
            const jetY = stateY - 45;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(squid.x - 50, jetY - 20, 100, 25);
            
            if (squid.jetDuration > 0) {
                ctx.fillStyle = '#ff6600'; // Orange for active jet
                ctx.fillText(`JET: ${squid.jetDuration}`, squid.x, jetY - 2);
            } else if (squid.jetCooldown > 0) {
                ctx.fillStyle = '#666666'; // Gray for cooldown
                ctx.fillText(`COOLDOWN: ${squid.jetCooldown}`, squid.x, jetY - 2);
            }
        }
        
        // Bioluminescence status indicator
        if (squid.bioluminescenceSystem) {
            const bioState = squid.bioluminescenceSystem.getBioluminescenceState(squid);
            if (bioState.isActive) {
                const bioY = stateY - 70;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(squid.x - 60, bioY - 20, 120, 25);
                
                const bioColor = bioState.isBlinking ? '#00ffff' : '#0088ff'; // Cyan when blinking, blue when steady
                ctx.fillStyle = bioColor;
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`BIO: ${bioState.depthPercent}% (${Math.round(bioState.intensity * 100)}%)`, squid.x, bioY - 2);
            }
        }
        
        // Vision range circle (faint)
        if (squid.state === this.states.HUNTING || squid.state === this.states.PATROLLING) {
            ctx.strokeStyle = 'rgba(150, 50, 200, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(squid.x, squid.y, squid.visionRange, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Attack range circle (when hunting)
        if (squid.state === this.states.HUNTING && squid.huntTarget) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(squid.x, squid.y, squid.attackRange, 0, Math.PI * 2);
            ctx.stroke();
            
            // Line to target
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(squid.x, squid.y);
            ctx.lineTo(squid.huntTarget.x, squid.huntTarget.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Calculate distance between two objects
     * @param {Object} obj1 - First object
     * @param {Object} obj2 - Second object
     * @returns {number} Distance between objects
     */
    distance(obj1, obj2) {
        return Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SquidRenderingSystem = SquidRenderingSystem;
} 