// Debug View System - Comprehensive debug visualization for all systems
class DebugViewSystem {
    constructor() {
        this.isEnabled = false;
        this.config = {
            SHOW_AI_STATES: true,
            SHOW_DETECTION_RANGES: true,
            SHOW_PATHFINDING: true,
            SHOW_PHYSICS: true,
            SHOW_SPAWNING: true,
            SHOW_POOPING: true,
            SHOW_FEEDING: true,
            SHOW_LIFECYCLE: true,
            SHOW_PERFORMANCE: true,
            SHOW_ENTITY_INFO: true,
            SHOW_SYSTEM_STATUS: true,
            TEXT_COLOR: '#00ff00',
            LINE_COLOR: '#ff0000',
            CIRCLE_COLOR: '#ffff00',
            RECT_COLOR: '#00ffff',
            FONT_SIZE: 12,
            LINE_WIDTH: 2
        };
        
        this.bindKeyEvents();
        console.log('🔍 Debug View System initialized - Press F3 to toggle');
    }
    
    /**
     * Bind keyboard events for debug toggle
     */
    bindKeyEvents() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'F3') {
                event.preventDefault();
                this.toggle();
            }
        });
    }
    
    /**
     * Toggle debug view on/off
     */
    toggle() {
        this.isEnabled = !this.isEnabled;
        console.log(`🔍 Debug View ${this.isEnabled ? 'ENABLED' : 'DISABLED'}`);
        
        // Update all system debug states
        this.updateSystemDebugStates();
    }
    
    /**
     * Update debug states for all systems
     */
    updateSystemDebugStates() {
        // Update tuna pooping system debug
        if (window.gameEntities && window.gameEntities.tunaPoopingSystem) {
            window.gameEntities.tunaPoopingSystem.config.DEBUG = this.isEnabled;
        }
        
        // Update tuna AI debug
        if (window.gameState) {
            window.gameState.tunaDebug = this.isEnabled;
        }
        
        // Update other system debug states as needed
        if (window.FishSpawningSystem) {
            // Fish spawning system debug
        }
        
        if (window.FryEggLayingSystem) {
            // Fry egg laying system debug
        }
        
        console.log(`🔍 Updated debug states for all systems: ${this.isEnabled}`);
    }
    
    /**
     * Draw debug information for all entities and systems
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} gameEntities - Game entities system
     * @param {Object} camera - Camera system
     */
    draw(ctx, gameEntities, camera) {
        if (!this.isEnabled || !ctx || !gameEntities) return;
        
        ctx.save();
        
        // Set debug rendering styles
        ctx.strokeStyle = this.config.LINE_COLOR;
        ctx.fillStyle = this.config.TEXT_COLOR;
        ctx.lineWidth = this.config.LINE_WIDTH;
        ctx.font = `${this.config.FONT_SIZE}px Arial`;
        ctx.textAlign = 'left';
        
        // Draw debug info for each entity type
        this.drawFishDebug(ctx, gameEntities.fish, camera);
        this.drawPredatorDebug(ctx, gameEntities.predators, camera);
        this.drawKrillDebug(ctx, gameEntities.krill, gameEntities.paleKrill, gameEntities.momKrill, camera);
        this.drawSquidDebug(ctx, gameEntities.squid, camera);
        this.drawSystemDebug(ctx, gameEntities, camera);
        this.drawPerformanceDebug(ctx, camera);
        
        ctx.restore();
    }
    
    /**
     * Draw debug information for fish (fry)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} fish - Fish array
     * @param {Object} camera - Camera system
     */
    drawFishDebug(ctx, fish, camera) {
        if (!this.config.SHOW_AI_STATES || !fish) return;
        
        for (let f of fish) {
            const screenX = f.x - camera.x;
            const screenY = f.y - camera.y;
            
            // Draw AI state
            if (f.aiState) {
                ctx.fillStyle = this.getStateColor(f.aiState);
                ctx.fillText(`${f.fishType} - ${f.aiState}`, screenX + 15, screenY - 15);
            }
            
            // Draw detection ranges
            if (this.config.SHOW_DETECTION_RANGES && f.detectionRange) {
                ctx.strokeStyle = '#00ff00';
                ctx.beginPath();
                ctx.arc(screenX, screenY, f.detectionRange, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Draw spawning state
            if (f.spawningState && f.spawningState.isSpawning) {
                ctx.strokeStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 50, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillText('SPAWNING', screenX - 20, screenY - 30);
            }
        }
    }
    
    /**
     * Draw debug information for predators (tuna)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} predators - Predators array
     * @param {Object} camera - Camera system
     */
    drawPredatorDebug(ctx, predators, camera) {
        if (!this.config.SHOW_AI_STATES || !predators) return;
        
        for (let p of predators) {
            const screenX = p.x - camera.x;
            const screenY = p.y - camera.y;
            
            // Draw AI state and energy
            if (p.aiState) {
                ctx.fillStyle = this.getStateColor(p.aiState);
                ctx.fillText(`${p.tunaType} - ${p.aiState} (E:${Math.round(p.energy)})`, screenX + 15, screenY - 15);
            }
            
            // Draw hunting radius
            if (this.config.SHOW_DETECTION_RANGES && window.TUNA_CONFIG) {
                ctx.strokeStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(screenX, screenY, window.TUNA_CONFIG.huntRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Draw attack radius
            if (this.config.SHOW_DETECTION_RANGES && window.TUNA_CONFIG) {
                ctx.strokeStyle = '#ff6600';
                ctx.beginPath();
                ctx.arc(screenX, screenY, window.TUNA_CONFIG.attackRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            // Draw pooping state
            if (this.config.SHOW_POOPING && p.poopingProperties && p.poopingProperties.isPooping) {
                ctx.strokeStyle = '#8b4513';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 40, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillText(`POOPING ${p.poopingProperties.poopCount}/${p.poopingProperties.totalPoops}`, screenX - 30, screenY - 40);
            }
            
            // Draw target line
            if (p.aiTarget && this.config.SHOW_PATHFINDING) {
                ctx.strokeStyle = '#ffff00';
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(p.aiTarget.x - camera.x, p.aiTarget.y - camera.y);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Draw debug information for krill
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} krill - Regular krill array
     * @param {Array} paleKrill - Pale krill array
     * @param {Array} momKrill - Mom krill array
     * @param {Object} camera - Camera system
     */
    drawKrillDebug(ctx, krill, paleKrill, momKrill, camera) {
        if (!this.config.SHOW_LIFECYCLE) return;
        
        const allKrill = [...(krill || []), ...(paleKrill || []), ...(momKrill || [])];
        
        for (let k of allKrill) {
            const screenX = k.x - camera.x;
            const screenY = k.y - camera.y;
            
            // Draw lifecycle info
            if (k.lifecycleStage) {
                ctx.fillStyle = this.getKrillStageColor(k.lifecycleStage);
                ctx.fillText(`${k.lifecycleStage} (${Math.round(k.lifecycleTimer || 0)})`, screenX + 10, screenY - 10);
            }
            
            // Draw transformation state
            if (k.isTransforming) {
                ctx.strokeStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 30, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillText('TRANSFORMING', screenX - 25, screenY - 25);
            }
        }
    }
    
    /**
     * Draw debug information for squid
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Array} squid - Squid array
     * @param {Object} camera - Camera system
     */
    drawSquidDebug(ctx, squid, camera) {
        if (!this.config.SHOW_AI_STATES || !squid) return;
        
        for (let s of squid) {
            const screenX = s.x - camera.x;
            const screenY = s.y - camera.y;
            
            // Draw AI state
            if (s.aiState) {
                ctx.fillStyle = this.getStateColor(s.aiState);
                ctx.fillText(`Squid - ${s.aiState}`, screenX + 20, screenY - 15);
            }
            
            // Draw jet propulsion state
            if (s.jetSystem && s.jetSystem.isJetting) {
                ctx.strokeStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 60, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillText('JETTING', screenX - 15, screenY - 35);
            }
        }
    }
    
    /**
     * Draw system-level debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} gameEntities - Game entities system
     * @param {Object} camera - Camera system
     */
    drawSystemDebug(ctx, gameEntities, camera) {
        if (!this.config.SHOW_SYSTEM_STATUS) return;
        
        const startY = 20;
        let yOffset = 0;
        
        // Draw entity counts
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Fish: ${gameEntities.fish?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Tuna: ${gameEntities.predators?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Krill: ${(gameEntities.krill?.length || 0) + (gameEntities.paleKrill?.length || 0) + (gameEntities.momKrill?.length || 0)}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Squid: ${gameEntities.squid?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Food: ${gameEntities.fishFood?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Eggs: ${gameEntities.fishEggs?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Sperm: ${gameEntities.sperm?.length || 0}`, 10, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Poop: ${gameEntities.poop?.length || 0}`, 10, startY + yOffset);
    }
    
    /**
     * Draw performance debug information
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} camera - Camera system
     */
    drawPerformanceDebug(ctx, camera) {
        if (!this.config.SHOW_PERFORMANCE) return;
        
        const canvas = ctx.canvas;
        const rightX = canvas.width - 200;
        const startY = 20;
        let yOffset = 0;
        
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`Camera: (${Math.round(camera.x)}, ${Math.round(camera.y)})`, rightX, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`Zoom: ${camera.zoom.toFixed(2)}x`, rightX, startY + yOffset);
        yOffset += 15;
        ctx.fillText(`FPS: ${Math.round(1000 / (Date.now() - (this.lastFrameTime || Date.now())))}`, rightX, startY + yOffset);
        
        this.lastFrameTime = Date.now();
    }
    
    /**
     * Get color for AI state
     * @param {string} state - AI state
     * @returns {string} Color string
     */
    getStateColor(state) {
        const colors = {
            'PATROLLING': '#00ff00',
            'HUNTING': '#ffff00',
            'ATTACKING': '#ff0000',
            'FEEDING': '#ff6600',
            'RESTING': '#0066ff',
            'FLEEING': '#ff00ff',
            'SPAWNING': '#ff00ff'
        };
        return colors[state] || '#ffffff';
    }
    
    /**
     * Get color for krill lifecycle stage
     * @param {string} stage - Lifecycle stage
     * @returns {string} Color string
     */
    getKrillStageColor(stage) {
        const colors = {
            'larva': '#ffff00',
            'juvenile': '#00ff00',
            'adult': '#0066ff',
            'pale': '#cccccc',
            'mom': '#ff66cc'
        };
        return colors[stage] || '#ffffff';
    }
    
    /**
     * Check if debug view is enabled
     * @returns {boolean} True if debug view is enabled
     */
    isDebugEnabled() {
        return this.isEnabled;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.DebugViewSystem = DebugViewSystem;
} 