// Krill Rendering System - Handles visual representation of all krill types
// Regular Krill, Pale Krill, and Mom Krill with specialized rendering

class KrillRenderingSystem {
    constructor() {
        this.lifecycleSystem = window.krillLifecycleSystem;
        console.log('🎨 KrillRenderingSystem initialized');
        console.log('🎨 Lifecycle system available:', !!this.lifecycleSystem);
        console.log('🎨 Global sprites available:', !!window.sprites);
        if (window.sprites) {
            console.log('🎨 Available krill sprites:', Object.keys(window.sprites).filter(k => k.includes('krill')));
        }
    }

    // Draw regular krill
    drawRegularKrill(krill) {
        if (!window.Utils?.inRenderDistance(krill)) return;
        
        const sprites = window.sprites || {};
        const visualProps = this.lifecycleSystem?.getVisualProperties()?.regularKrill || {
            baseOpacity: 0.8,
            spriteFrames: ['krill1', 'krill2', 'krill3', 'krill2']
        };
        
        let depthOpacity = window.Utils.getDepthOpacity(krill.y, visualProps.baseOpacity);
        let tintStrength = window.Utils.getDepthTint(krill.y);
        
        // Get current sprite frame
        const currentSpriteKey = krill.spriteFrames[Math.floor(krill.animationFrame)];
        
        // Debug: Log sprite access attempt
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Attempting to render krill:`, {
                spriteKey: currentSpriteKey,
                spriteExists: !!sprites[currentSpriteKey],
                spriteComplete: sprites[currentSpriteKey]?.complete,
                availableKrillSprites: Object.keys(sprites).filter(k => k.includes('krill')),
                krillSpriteFrames: krill.spriteFrames,
                animationFrame: krill.animationFrame,
                position: { x: krill.x, y: krill.y }
            });
        }
        
        if (!sprites[currentSpriteKey]) {
            if (window.gameState?.krillDebug) {
                console.warn(`🦐 RegularKrill sprite not found: ${currentSpriteKey}`);
                console.log(`🦐 Available sprites:`, Object.keys(sprites).filter(k => k.includes('krill')));
                console.log(`🦐 Krill spriteFrames:`, krill.spriteFrames);
                console.log(`🦐 All available sprites:`, Object.keys(sprites));
            }
            return;
        }
        
        // Debug: Log successful sprite access
        if (window.gameState?.krillDebug) {
            console.log(`✅ Krill sprite found and rendering: ${currentSpriteKey}`);
        }
        
        this.drawKrillSprite(krill, sprites[currentSpriteKey], depthOpacity, tintStrength);
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawRegularKrillDebug(krill);
        }
    }

    // Draw pale krill
    drawPaleKrill(paleKrill) {
        if (!window.Utils?.inRenderDistance(paleKrill)) return;
        
        const sprites = window.sprites || {};
        const visualProps = this.lifecycleSystem?.getVisualProperties()?.paleKrill || {
            baseOpacity: 0.7,
            spriteFrames: ['paleKrill1', 'paleKrill2', 'paleKrill3', 'paleKrill2']
        };
        
        let depthOpacity = window.Utils.getDepthOpacity(paleKrill.y, visualProps.baseOpacity);
        let tintStrength = window.Utils.getDepthTint(paleKrill.y);
        
        // Get current sprite frame
        const currentSpriteKey = paleKrill.spriteFrames[Math.floor(paleKrill.animationFrame)];
        if (!sprites[currentSpriteKey]) {
            if (window.gameState?.krillDebug) {
                console.warn(`🦐 PaleKrill sprite not found: ${currentSpriteKey}`);
            }
            return;
        }
        
        this.drawKrillSprite(paleKrill, sprites[currentSpriteKey], depthOpacity, tintStrength);
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawPaleKrillDebug(paleKrill);
        }
    }

    // Draw mom krill
    drawMomKrill(momKrill) {
        if (!window.Utils?.inRenderDistance(momKrill)) return;
        
        const sprites = window.sprites || {};
        const visualProps = this.lifecycleSystem?.getVisualProperties()?.momKrill || {
            baseOpacity: 0.9,
            spriteFrames: ['momKrill1', 'momKrill2', 'momKrill3', 'momKrill2']
        };
        
        let depthOpacity = window.Utils.getDepthOpacity(momKrill.y, visualProps.baseOpacity);
        let tintStrength = window.Utils.getDepthTint(momKrill.y);
        
        // Get current sprite frame
        const currentSpriteKey = momKrill.spriteFrames[Math.floor(momKrill.animationFrame)];
        if (!sprites[currentSpriteKey]) {
            if (window.gameState?.krillDebug) {
                console.warn(`🦐 MomKrill sprite not found: ${currentSpriteKey}`);
            }
            return;
        }
        
        this.drawKrillSprite(momKrill, sprites[currentSpriteKey], depthOpacity, tintStrength);
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawMomKrillDebug(momKrill);
        }
    }

    // Common krill sprite drawing method
    drawKrillSprite(krill, sprite, depthOpacity, tintStrength) {
        const ctx = window.ctx;
        if (!ctx) {
            if (window.gameState?.krillDebug) {
                console.warn(`🦐 No canvas context available for krill drawing`);
            }
            return;
        }
        
        if (window.gameState?.krillDebug) {
            console.log(`🎨 Drawing krill sprite:`, {
                sprite: sprite,
                spriteComplete: sprite.complete,
                spriteWidth: sprite.width,
                spriteHeight: sprite.height,
                depthOpacity: depthOpacity,
                tintStrength: tintStrength,
                position: { x: krill.x, y: krill.y },
                size: krill.size
            });
        }
        
        ctx.save();
        
        // Apply depth-based opacity and tint
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Apply velocity-based rotation
        const angle = Math.atan2(krill.velocity.y, krill.velocity.x);
        ctx.translate(krill.x, krill.y);
        ctx.rotate(angle);
        
        // Draw the sprite
        ctx.drawImage(sprite, -krill.size/2, -krill.size/2, krill.size, krill.size);
        
        ctx.restore();
        
        if (window.gameState?.krillDebug) {
            console.log(`✅ Krill sprite drawn successfully`);
        }
    }

    // Debug visualization for regular krill
    drawRegularKrillDebug(krill) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State color coding
        const stateColors = {
            'foraging': '#90EE90',    // Light Green
            'seeking': '#FFA500',     // Orange
            'fleeing': '#FF0000',     // Red
            'migrating': '#87CEEB',   // Sky Blue
            'resting': '#DDA0DD'      // Plum
        };
        
        const stateColor = stateColors[krill.behaviorState] || '#FFFFFF';
        
        // Draw behavior state text
        ctx.fillStyle = stateColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(krill.behaviorState.toUpperCase(), krill.x, krill.y - 25);
        
        // Draw nutrition and energy info
        ctx.font = '8px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(`N:${krill.nutritionLevel.toFixed(2)} E:${krill.energy.toFixed(2)}`, krill.x, krill.y + 20);
        
        // Draw food consumption counters
        ctx.fillStyle = 'rgba(139, 69, 19, 0.8)'; // Brown for poop
        ctx.fillText(`P:${krill.poopEaten} F:${krill.foodConsumed}`, krill.x, krill.y + 30);
        
        // Draw AI debug info if available
        if (krill.aiResult) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.fillText(`AI:${krill.aiResult.state}`, krill.x, krill.y + 40);
        }
        
        // Draw detection radius
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(krill.x, krill.y, krill.eatRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw swarm radius if in swarm
        if (krill.nearbyKrill && krill.nearbyKrill.length > 0) {
            const SWARM_RADIUS = window.KRILL_CONFIG?.SWARM_RADIUS || 120;
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(krill.x, krill.y, SWARM_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            
            // Draw connections to nearby krill
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
            ctx.lineWidth = 0.5;
            for (let nearbyKrill of krill.nearbyKrill.slice(0, 5)) { // Limit to 5 connections for performance
                ctx.beginPath();
                ctx.moveTo(krill.x, krill.y);
                ctx.lineTo(nearbyKrill.x, nearbyKrill.y);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }

    // Debug visualization for pale krill
    drawPaleKrillDebug(paleKrill) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Pale krill specific debug info
        const debugColors = this.lifecycleSystem?.getDebugColors() || { paleKrill: '#DDA0DD' };
        ctx.fillStyle = debugColors.paleKrill;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PALE KRILL', paleKrill.x, paleKrill.y - 35);
        
        // Draw maturation progress
        const maturationPercent = this.lifecycleSystem?.getMaturationProgress(paleKrill) || 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.fillText(`Maturation: ${(maturationPercent * 100).toFixed(1)}%`, paleKrill.x, paleKrill.y + 35);
        
        // Draw maturation bar
        const barWidth = 20;
        const barHeight = 3;
        const barY = paleKrill.y + 40;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(paleKrill.x - barWidth/2, barY, barWidth, barHeight);
        
        // Progress bar
        ctx.fillStyle = debugColors.paleKrill;
        ctx.fillRect(paleKrill.x - barWidth/2, barY, barWidth * maturationPercent, barHeight);
        
        // Call parent debug info
        this.drawRegularKrillDebug(paleKrill);
        
        ctx.restore();
    }

    // Debug visualization for mom krill
    drawMomKrillDebug(momKrill) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Mom krill specific debug info
        const debugColors = this.lifecycleSystem?.getDebugColors() || { momKrill: '#FF69B4' };
        ctx.fillStyle = debugColors.momKrill;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MOM KRILL', momKrill.x, momKrill.y - 35);
        
        // Draw offspring info
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '8px Arial';
        ctx.fillText(`Offspring: ${momKrill.offspringCount}/${momKrill.maxOffspring}`, momKrill.x, momKrill.y + 35);
        
        // Draw offspring timer
        const offspringPercent = this.lifecycleSystem?.getOffspringProgress(momKrill) || 0;
        ctx.fillText(`Timer: ${(offspringPercent * 100).toFixed(1)}%`, momKrill.x, momKrill.y + 45);
        
        // Draw offspring timer bar
        const barWidth = 20;
        const barHeight = 3;
        const barY = momKrill.y + 50;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(momKrill.x - barWidth/2, barY, barWidth, barHeight);
        
        // Progress bar
        ctx.fillStyle = debugColors.momKrill;
        ctx.fillRect(momKrill.x - barWidth/2, barY, barWidth * offspringPercent, barHeight);
        
        // Call parent debug info
        this.drawRegularKrillDebug(momKrill);
        
        ctx.restore();
    }
}

// Export for global access
window.krillRenderingSystem = new KrillRenderingSystem(); 