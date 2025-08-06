// Tuna Rendering System - All drawing and visual effects for tuna
// Handles sprite rendering, debug overlays, detection ranges, and visual effects

class TunaRenderingSystem {
    constructor() {
        // Safety check for config
        this.config = window.TUNA_CONFIG || {};
        console.log('🎨 TunaRenderingSystem loaded successfully');
    }

    /**
     * Calculate adjusted Y position to make tuna appear 50% deeper
     * @param {number} actualY - The actual Y position of the tuna
     * @returns {number} Adjusted Y position for depth calculations
     */
    getAdjustedDepthY(actualY) {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        // Make tuna appear 50% deeper by multiplying depth by 1.5
        // But ensure it doesn't exceed world boundaries
        return Math.min(actualY * 1.5, WORLD_HEIGHT);
    }

    /**
     * Initialize rendering system for a tuna
     * @param {Object} tuna - The tuna entity
     */
    initializeRenderingSystem(tuna) {
        try {
            tuna.angle = 0;
            tuna.currentSpeedBoost = 1.0;
            console.log('🎨 TunaRenderingSystem initialized for tuna');
        } catch (error) {
            console.error('❌ Error initializing TunaRenderingSystem:', error);
        }
    }

    /**
     * Main draw method for tuna
     * @param {Object} tuna - The tuna entity
     */
    draw(tuna) {
        // Calculate angle based on velocity direction
        tuna.angle = Math.atan2(tuna.velocity.y, Math.abs(tuna.velocity.x));
        const sprites = window.sprites;
        
        // Validate base sprite before drawing
        const baseSprite = sprites && sprites[tuna.tunaType];
        if (baseSprite && baseSprite instanceof HTMLImageElement && baseSprite.complete && baseSprite.naturalWidth > 0) {
            // Draw base tuna sprite first
            this.drawSprite(tuna, baseSprite, tuna.size, 1, tuna.angle);
            
            // Draw tuna fins overlay sprite on top with reduced shader tint
            const finsSprite = sprites.tunaFins;
            if (finsSprite && finsSprite instanceof HTMLImageElement && finsSprite.complete && finsSprite.naturalWidth > 0) {
                this.drawTunaOverlay(tuna, finsSprite, tuna.size, 1, tuna.angle);
            }
        } else {
            console.warn('🚨 Invalid base sprite for tuna:', {
                tunaType: tuna.tunaType,
                baseSprite: baseSprite,
                type: typeof baseSprite,
                isImage: baseSprite instanceof HTMLImageElement,
                complete: baseSprite?.complete,
                naturalWidth: baseSprite?.naturalWidth
            });
        }
        
        // Debug: Draw AI state if available and debug mode is enabled
        if (window.debugManager && window.debugManager.isDebugOn('tuna')) {
            this.drawDebugInfo(tuna);
        }
    }

    /**
     * Draw base sprite with depth effects
     * @param {Object} tuna - The tuna entity
     * @param {Image} sprite - The sprite to draw
     * @param {number} size - Size of the sprite
     * @param {number} opacity - Opacity multiplier
     * @param {number} angle - Rotation angle
     */
    drawSprite(tuna, sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(tuna)) return;
        
        // Validate sprite before drawing
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in TunaRenderingSystem drawSprite:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                tunaType: tuna.tunaType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Use adjusted depth Y to make tuna appear 50% deeper
        const adjustedDepthY = this.getAdjustedDepthY(tuna.y);
        const depthOpacity = window.Utils.getDepthOpacity(adjustedDepthY, opacity);
        const tintStrength = window.Utils.getDepthTint(adjustedDepthY);
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(tuna.x, tuna.y);
        
        // Flip sprite based on horizontal movement direction
        if (tuna.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TunaRenderingSystem temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: tuna.tunaType
                });
                ctx.restore();
                return;
            }
            
            // Apply tint using source-atop
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
                console.error('🚨 drawImage error in TunaRenderingSystem main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: tuna.tunaType
                });
            }
        }
        
        ctx.restore();
    }

    /**
     * Draw tuna overlay with reduced shader tint
     * @param {Object} tuna - The tuna entity
     * @param {Image} sprite - The overlay sprite
     * @param {number} size - Size of the sprite
     * @param {number} opacity - Opacity multiplier
     * @param {number} angle - Rotation angle
     */
    drawTunaOverlay(tuna, sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(tuna)) return;
        
        // Validate sprite before drawing
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite in TunaRenderingSystem drawTunaOverlay:', {
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth,
                tunaType: tuna.tunaType
            });
            return; // Skip drawing if sprite is invalid
        }
        
        // Use adjusted depth Y to make tuna appear 50% deeper
        const adjustedDepthY = this.getAdjustedDepthY(tuna.y);
        const depthOpacity = window.Utils.getDepthOpacity(adjustedDepthY, opacity);
        let tintStrength = window.Utils.getDepthTint(adjustedDepthY);
        
        // Reduce shader tint by 50% for overlay sprite
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(tuna.x, tuna.y);
        
        // Flip sprite based on horizontal movement direction
        if (tuna.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for tinting with reduced effect
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TunaRenderingSystem overlay temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: tuna.tunaType
                });
                ctx.restore();
                return;
            }
            
            // Apply reduced tint using source-atop
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted overlay sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw overlay normally with validation
            ctx.globalAlpha = depthOpacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TunaRenderingSystem overlay main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    tunaType: tuna.tunaType
                });
            }
        }
        
        ctx.restore();
    }

    /**
     * Draw debug information for AI state
     * @param {Object} tuna - The tuna entity
     */
    drawDebugInfo(tuna) {
        if (!window.Utils || !window.Utils.inRenderDistance(tuna)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State background
        const stateY = tuna.y - tuna.size/2 - 30;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tuna.x - 60, stateY - 20, 120, 25);
        
        // State text with color coding
        let stateColor = '#ffffff';
        let stateText = tuna.aiState || 'LEGACY';
        
        // Color code based on AI state
        switch (tuna.aiState) {
            case 'patrolling':
                stateColor = '#00ff00'; // Green
                break;
            case 'hunting':
                stateColor = '#ffaa00'; // Orange
                if (tuna.aiTarget) {
                    const dist = window.Utils.distance(tuna, tuna.aiTarget);
                    stateText += ` (${Math.round(dist)}px)`;
                }
                break;
            case 'attacking':
                stateColor = '#ff0000'; // Red
                break;
            case 'feeding':
                stateColor = '#00aaff'; // Light blue
                if (tuna.aiTimer && tuna.lastStateChange) {
                    const feedingDuration = 180; // 3 seconds
                    const timeSinceFeeding = tuna.aiTimer - tuna.lastStateChange;
                    const feedingProgress = Math.min(100, Math.round((timeSinceFeeding / feedingDuration) * 100));
                    stateText += ` (${feedingProgress}%)`;
                }
                break;
            case 'fleeing':
                stateColor = '#ff00ff'; // Magenta
                break;
            default:
                stateColor = '#888888'; // Gray for legacy/unknown
                break;
        }
        
        // Add speed boost info if available
        if (tuna.currentSpeedBoost && tuna.currentSpeedBoost > 1.0) {
            const speedPercent = Math.round((tuna.currentSpeedBoost - 1.0) * 100);
            stateText += ` +${speedPercent}%`;
        }
        
        ctx.fillStyle = stateColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(stateText, tuna.x, stateY - 2);
        
        // Draw energy bar
        const barWidth = tuna.size * 0.8;
        const barHeight = 6;
        const energyPercent = (tuna.energy || 50) / 100; // Default to 50% if no energy
        
        // Energy bar background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(tuna.x - barWidth/2, stateY - 45, barWidth, barHeight);
        
        // Energy bar fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(tuna.x - barWidth/2, stateY - 45, barWidth * energyPercent, barHeight);
        
        // Alertness indicator (if available)
        if (tuna.alertness !== undefined) {
            const alertY = stateY - 60;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(tuna.x - 40, alertY - 15, 80, 20);
            
            const alertPercent = Math.round(tuna.alertness * 100);
            ctx.fillStyle = '#ffff00'; // Yellow
            ctx.font = '10px Arial';
            ctx.fillText(`Alert: ${alertPercent}%`, tuna.x, alertY - 2);
        }
        
        // Draw detection/vision circles
        this.drawDetectionRanges(tuna);
        
        ctx.restore();
    }

    /**
     * Draw detection and attack range circles
     * @param {Object} tuna - The tuna entity
     */
    drawDetectionRanges(tuna) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Get detection ranges from TunaAI config or use defaults
        const huntRadius = (window.TunaAI && window.TunaAI.config.huntRadius) || 200;
        const attackRadius = (window.TunaAI && window.TunaAI.config.attackRadius) || 40;
        const fleeRadius = (window.TunaAI && window.TunaAI.config.fleeRadius) || 300;
        
        ctx.save();
        
        // Hunt/Detection range circle (light blue, faint)
        if (tuna.aiState === 'patrolling' || tuna.aiState === 'hunting') {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tuna.x, tuna.y, huntRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Attack range circle (red, when hunting or attacking)
        if (tuna.aiState === 'hunting' || tuna.aiState === 'attacking') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tuna.x, tuna.y, attackRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Flee range circle (magenta, when fleeing or if threats nearby)
        if (tuna.aiState === 'fleeing') {
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tuna.x, tuna.y, fleeRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Line to current target (yellow, when hunting/attacking)
        if ((tuna.aiState === 'hunting' || tuna.aiState === 'attacking') && tuna.aiTarget) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(tuna.x, tuna.y);
            ctx.lineTo(tuna.aiTarget.x, tuna.aiTarget.y);
            ctx.stroke();
            
            // Target indicator (small circle around target)
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tuna.aiTarget.x, tuna.aiTarget.y, 15, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Get current AI state for debugging
     * @param {Object} tuna - The tuna entity
     * @returns {Object} Debug state information
     */
    getAIState(tuna) {
        return {
            state: tuna.aiState || 'none',
            target: tuna.aiTarget ? 'yes' : 'no',
            energy: Math.round(tuna.energy),
            alertness: tuna.alertness ? Math.round(tuna.alertness * 100) : 0,
            huntSuccess: tuna.huntSuccess || 0,
            speedBoost: tuna.currentSpeedBoost ? Math.round((tuna.currentSpeedBoost - 1.0) * 100) : 0
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TunaRenderingSystem = TunaRenderingSystem;
} 