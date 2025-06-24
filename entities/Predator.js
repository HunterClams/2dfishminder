// Predator class for large hunting fish (tuna) - Now using modular AI system
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
        this.energy = 100;
        this.huntCooldown = 0;
        this.aggression = 0.7 + Math.random() * 0.3;
        
        // Initialize AI system
        if (window.TunaAI) {
            window.TunaAI.initializeTuna(this);
        }
        
        // Ensure velocity is properly initialized (safety check)
        if (!this.velocity) {
            this.velocity = { x: Math.random() * 6 - 3, y: Math.random() * 6 - 3 };
        }
        
        // Ensure acceleration is initialized
        if (!this.acceleration) {
            this.acceleration = { x: 0, y: 0 };
        }
        
        // Start in mid-to-deep waters
        this.y = WORLD_HEIGHT * 0.4 + Math.random() * WORLD_HEIGHT * 0.4;
        this.preferredDepth = WORLD_HEIGHT * 0.6;
        this.depthTolerance = WORLD_HEIGHT * 0.3;
        
        // Initialize sprite angle
        this.angle = 0;
    }

    // Apply force to acceleration (inherited from Entity)
    applyForce(force) {
        if (!this.acceleration) {
            this.acceleration = { x: 0, y: 0 };
        }
        this.acceleration.x += force.x;
        this.acceleration.y += force.y;
    }

    // Handle world edges
    edges() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(this, 30, 0.9);
        }
    }

    // Legacy hunt method - now delegated to AI system
    hunt(prey, krill = []) {
        // This method is kept for backward compatibility but AI system handles hunting
        if (window.TunaAI && window.gameEntities) {
            // AI system will handle all hunting logic
            return;
        }
        
        // Fallback to old system if AI not available
        this.legacyHunt(prey, krill);
    }

    // Legacy hunting fallback
    legacyHunt(prey, krill = []) {
        const allPrey = [...prey, ...krill];
        let closest = null;
        let closestDist = Infinity;

        for (let p of allPrey) {
            if (window.Utils && !window.Utils.shouldIgnorePrey(this.tunaType, p.fishType)) {
                const d = window.Utils.distance(this, p);
                if (d < 150 && d < closestDist) {
                    closest = p;
                    closestDist = d;
                }
            }
        }

        if (closest) {
            // Predict where the prey will be
            const predictionTime = closestDist / this.maxSpeed;
            const futureX = closest.x + closest.velocity.x * predictionTime;
            const futureY = closest.y + closest.velocity.y * predictionTime;
            
            // Create target object for steering calculation
            const target = { x: futureX, y: futureY };
            const pursue = window.Utils.calculateSteering(this, target, this.maxSpeed, this.maxForce);
            this.applyForce({
                x: pursue.x * this.aggression * 2,
                y: pursue.y * this.aggression * 2
            });
        }
    }

    // Legacy food checking - now delegated to AI system
    checkForFood(prey, krill = []) {
        if (this.huntCooldown > 0) {
            this.huntCooldown--;
            return;
        }

        // AI system handles food checking, but keep this for compatibility
        if (window.TunaAI && window.gameEntities) {
            return; // AI handles this
        }
        
        // Fallback to legacy system
        this.legacyCheckForFood(prey, krill);
    }

    // Legacy food checking fallback
    legacyCheckForFood(prey, krill = []) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return;
        
        // Check all prey types
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' }
        ];
        
        for (let preyGroup of preyArrays) {
            for (let i = preyGroup.array.length - 1; i >= 0; i--) {
                const p = preyGroup.array[i];
                if (window.Utils && !window.Utils.shouldIgnorePrey(this.tunaType, p.fishType)) {
                    const d = window.Utils.distance(this, p);
                    if (d < 30) {
                        // Remove the prey from the correct array
                        preyGroup.array.splice(i, 1);
                        
                        // Add large poop when tuna eats
                        if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                            window.gameEntities.poop.push(new window.Poop(this.x, this.y, 'tuna'));
                        }
                        
                        // Create multiple eating bubbles
                        if (window.ObjectPools) {
                            for (let j = 0; j < 3; j++) {
                                window.ObjectPools.getEatingBubble(
                                    this.x + (Math.random() - 0.5) * 20,
                                    this.y + (Math.random() - 0.5) * 20
                                );
                            }
                        }
                        
                        this.energy = Math.min(100, this.energy + 25);
                        this.huntCooldown = 180; // 3 second cooldown
                        return; // Exit after eating one prey
                    }
                }
            }
        }
    }

    // Main update method - now uses AI system
    update(prey, krill, squid = []) {
        // Use AI system if available
        if (window.TunaAI && window.gameEntities) {
            // Let AI system handle all behavior
            window.TunaAI.updateAI(this, window.gameEntities);
            
            // Check for giant squid threats
            this.checkForThreats(squid);
            
            // Fallback eating system - check for nearby prey if AI isn't eating
            if (this.aiState === 'attacking' && this.huntCooldown <= 0) {
                this.fallbackEating();
            }
        } else {
            // Fallback to legacy system
            this.legacyUpdate(prey, krill, squid);
        }
        
        // Always handle cooldowns
        if (this.huntCooldown > 0) {
            this.huntCooldown--;
        }
        
        // Limit velocity (safety check)
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(this.velocity, this.maxSpeed);
        }
        
        // Move and handle edges
        this.move();
        this.edges();
        
        // Decrease energy over time
        this.energy = Math.max(0, this.energy - 0.02);
    }

    // Check for giant squid threats
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

    // Fallback eating system for when AI system misses prey
    fallbackEating() {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return;
        
        const eatRadius = 45; // Slightly larger than AI attack radius
        const eatRadiusSquared = eatRadius * eatRadius;
        
        // Check all prey types
        const preyArrays = [
            { array: gameEntities.fish, name: 'fish' },
            { array: gameEntities.krill, name: 'krill' },
            { array: gameEntities.paleKrill, name: 'paleKrill' },
            { array: gameEntities.momKrill, name: 'momKrill' }
        ];
        
        for (let preyGroup of preyArrays) {
            for (let i = preyGroup.array.length - 1; i >= 0; i--) {
                const p = preyGroup.array[i];
                if (window.Utils && !window.Utils.shouldIgnorePrey(this.tunaType, p.fishType)) {
                    const distSquared = window.Utils.distanceSquared(this, p);
                    if (distSquared < eatRadiusSquared) {
                        // Debug log fallback eating
                        if (window.gameState && window.gameState.tunaDebug) {
                            console.log(`🍽️ Fallback eating: Tuna ate ${preyGroup.name} at distance ${Math.sqrt(distSquared).toFixed(1)}`);
                        }
                        
                        // Remove the prey from the correct array
                        preyGroup.array.splice(i, 1);
                        
                        // Add large poop when tuna eats
                        if (window.gameEntities && window.gameEntities.poop && window.Poop) {
                            window.gameEntities.poop.push(new window.Poop(this.x, this.y, 'tuna'));
                        }
                        
                        // Create multiple eating bubbles
                        if (window.ObjectPools) {
                            for (let j = 0; j < 3; j++) {
                                window.ObjectPools.getEatingBubble(
                                    this.x + (Math.random() - 0.5) * 20,
                                    this.y + (Math.random() - 0.5) * 20
                                );
                            }
                        }
                        
                        // Restore energy and set cooldown
                        this.energy = Math.min(100, this.energy + 25);
                        this.huntCooldown = 180; // 3 second cooldown
                        
                        // Transition to feeding state
                        if (window.TunaAI) {
                            window.TunaAI.transitionToState(this, window.TunaAI.states.FEEDING);
                        }
                        
                        return; // Exit after eating one prey
                    }
                }
            }
        }
    }

    // Legacy update fallback
    legacyUpdate(prey, krill, squid) {
        this.hunt(prey, krill);
        this.checkForFood(prey, krill);
        
        // Wander behavior when not hunting
        if (!this.isHunting) {
            this.currentPatience = (this.currentPatience || 100) - 1;
            if (this.currentPatience <= 0) {
                // Random wander
                const wanderForce = {
                    x: (Math.random() - 0.5) * this.maxForce * 0.5,
                    y: (Math.random() - 0.5) * this.maxForce * 0.5
                };
                this.applyForce(wanderForce);
                this.currentPatience = 100;
            }
        }
        
        // Depth preference
        const depthDifference = this.y - this.preferredDepth;
        if (Math.abs(depthDifference) > this.depthTolerance) {
            const depthForce = -depthDifference * 0.0001;
            this.applyForce({ x: 0, y: depthForce * this.maxForce });
        }
    }

    // Enhanced draw method with better sprite handling
    draw() {
        // Calculate angle based on velocity direction
        // Use absolute value of velocity.x to avoid double-flipping
        this.angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x));
        const sprites = window.sprites;
        
        if (sprites && sprites[this.tunaType]) {
            // Draw base tuna sprite first
            this.drawSprite(sprites[this.tunaType], this.size, 1, this.angle);
            
            // Draw tuna fins overlay sprite on top with reduced shader tint
            if (sprites.tunaFins) {
                this.drawTunaOverlay(sprites.tunaFins, this.size, 1, this.angle);
            }
        }
        
        // Debug: Draw AI state if available and debug mode is enabled
        if (window.gameState && window.gameState.tunaDebug) {
            // Always try to draw debug info when debug is enabled
            this.drawDebugInfo();
        }
    }
    
    // Draw debug information for AI state
    drawDebugInfo() {
        if (!window.Utils || !window.Utils.inRenderDistance(this)) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State background
        const stateY = this.y - this.size/2 - 30;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x - 60, stateY - 20, 120, 25);
        
        // State text with color coding
        let stateColor = '#ffffff';
        let stateText = this.aiState || 'LEGACY';
        
        // Color code based on AI state
        switch (this.aiState) {
            case 'patrolling':
                stateColor = '#00ff00'; // Green
                break;
            case 'hunting':
                stateColor = '#ffaa00'; // Orange
                if (this.aiTarget) {
                    const dist = window.Utils.distance(this, this.aiTarget);
                    stateText += ` (${Math.round(dist)}px)`;
                }
                break;
            case 'attacking':
                stateColor = '#ff0000'; // Red
                break;
            case 'feeding':
                stateColor = '#00aaff'; // Light blue
                if (this.aiTimer && this.lastStateChange) {
                    const feedingDuration = 180; // 3 seconds
                    const timeSinceFeeding = this.aiTimer - this.lastStateChange;
                    const feedingProgress = Math.min(100, Math.round((timeSinceFeeding / feedingDuration) * 100));
                    stateText += ` (${feedingProgress}%)`;
                }
                break;
            case 'resting':
                stateColor = '#8888ff'; // Purple
                break;
            case 'fleeing':
                stateColor = '#ff00ff'; // Magenta
                break;
            default:
                stateColor = '#888888'; // Gray for legacy/unknown
                break;
        }
        
        // Add speed boost info if available
        if (this.currentSpeedBoost && this.currentSpeedBoost > 1.0) {
            const speedPercent = Math.round((this.currentSpeedBoost - 1.0) * 100);
            stateText += ` +${speedPercent}%`;
        }
        
        ctx.fillStyle = stateColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(stateText, this.x, stateY - 2);
        
        // Draw energy bar
        const barWidth = this.size * 0.8;
        const barHeight = 6;
        const energyPercent = (this.energy || 50) / 100; // Default to 50% if no energy
        
        // Energy bar background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
        ctx.fillRect(this.x - barWidth/2, stateY - 45, barWidth, barHeight);
        
        // Energy bar fill
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(this.x - barWidth/2, stateY - 45, barWidth * energyPercent, barHeight);
        
        // Alertness indicator (if available)
        if (this.alertness !== undefined) {
            const alertY = stateY - 60;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(this.x - 40, alertY - 15, 80, 20);
            
            const alertPercent = Math.round(this.alertness * 100);
            ctx.fillStyle = '#ffff00'; // Yellow
            ctx.font = '10px Arial';
            ctx.fillText(`Alert: ${alertPercent}%`, this.x, alertY - 2);
        }
        
        // Draw detection/vision circles
        this.drawDetectionRanges();
        
        ctx.restore();
    }
    
    // Draw detection and attack range circles
    drawDetectionRanges() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Get detection ranges from TunaAI config or use defaults
        const huntRadius = (window.TunaAI && window.TunaAI.config.huntRadius) || 200;
        const attackRadius = (window.TunaAI && window.TunaAI.config.attackRadius) || 40;
        const fleeRadius = (window.TunaAI && window.TunaAI.config.fleeRadius) || 300;
        
        ctx.save();
        
        // Hunt/Detection range circle (light blue, faint)
        if (this.aiState === 'patrolling' || this.aiState === 'hunting') {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, huntRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Attack range circle (red, when hunting or attacking)
        if (this.aiState === 'hunting' || this.aiState === 'attacking') {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, attackRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Flee range circle (magenta, when fleeing or if threats nearby)
        if (this.aiState === 'fleeing') {
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, fleeRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Line to current target (yellow, when hunting/attacking)
        if ((this.aiState === 'hunting' || this.aiState === 'attacking') && this.aiTarget) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.aiTarget.x, this.aiTarget.y);
            ctx.stroke();
            
            // Target indicator (small circle around target)
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.aiTarget.x, this.aiTarget.y, 15, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // Custom draw method for tuna overlay with reduced shader tint
    drawTunaOverlay(sprite, size, opacity = 1, angle = 0) {
        if (!window.Utils || !window.Utils.inRenderDistance(this)) return;
        
        const depthOpacity = window.Utils.getDepthOpacity(this.y, opacity);
        let tintStrength = window.Utils.getDepthTint(this.y);
        
        // Reduce shader tint by 50% for overlay sprite
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip sprite based on horizontal movement direction
        if (this.velocity.x < 0) {
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
            
            // Draw sprite on temp canvas
            tempCtx.drawImage(sprite, 0, 0, size, size);
            
            // Apply reduced tint using source-atop
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted overlay sprite to main canvas
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw overlay normally
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(sprite, -size/2, -size/2, size, size);
        }
        
        ctx.restore();
    }
    
    // Get current AI state for debugging
    getAIState() {
        return {
            state: this.aiState || 'none',
            target: this.aiTarget ? 'yes' : 'no',
            energy: Math.round(this.energy),
            alertness: this.alertness ? Math.round(this.alertness * 100) : 0,
            huntSuccess: this.huntSuccess || 0,
            speedBoost: this.currentSpeedBoost ? Math.round((this.currentSpeedBoost - 1.0) * 100) : 0
        };
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Predator = Predator;
} 