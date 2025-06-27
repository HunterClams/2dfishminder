// Boid Rendering System Module
class BoidRenderingSystem {
    constructor() {
        this.config = window.BoidConfig || {};
    }

    draw(boid) {
        const sprites = window.sprites || {};
        const angle = Math.atan2(boid.velocity.y, Math.abs(boid.velocity.x)) * 0.5;
        
        // Validate sprite before drawing
        const sprite = sprites[boid.fishType];
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            console.warn('🚨 Invalid sprite for boid:', {
                fishType: boid.fishType,
                sprite: sprite,
                type: typeof sprite,
                isImage: sprite instanceof HTMLImageElement,
                complete: sprite?.complete,
                naturalWidth: sprite?.naturalWidth
            });
            return; // Skip drawing if sprite is invalid
        }
        
        boid.drawSprite(sprite, boid.size, 0.9, angle);
        
        // Debug visualization
        if (window.debugManager && window.debugManager.isDebugOn('fry')) {
            this.drawDebugInfo(boid);
        }
    }
    
    // Debug visualization for fry behavior
    drawDebugInfo(boid) {
        if (!boid.behaviorState) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State color coding
        const stateColors = this.config.DEBUG_COLORS || {
            'foraging': '#90EE90',    // Light Green
            'hunting': '#FFA500',     // Orange  
            'feeding': '#87CEEB',     // Sky Blue
            'feeding_cooldown': '#FFB6C1', // Light Pink for feeding cooldown
            'spawning': '#FF69B4',    // Hot Pink
            'spawning_cooldown': '#DDA0DD' // Plum for spawning cooldown
        };
        
        const stateColor = stateColors[boid.behaviorState] || '#FFFFFF';
        
        // Draw behavior state text
        ctx.fillStyle = stateColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(boid.behaviorState.toUpperCase(), boid.x, boid.y - 20);
        
        // Draw food consumption counter
        if (boid.foodConsumed !== undefined && boid.poopThreshold !== undefined) {
            ctx.font = '8px Arial';
            ctx.fillStyle = 'rgba(139, 69, 19, 0.8)'; // Brown color for poop indicator
            ctx.fillText(`${boid.foodConsumed}/${boid.poopThreshold}`, boid.x, boid.y + 25);
        }
        
        // Draw energy bar
        this.drawEnergyBar(boid);
        
        // Draw feeding timer bar when feeding
        if (boid.behaviorState === 'feeding' && boid.feedingTimer !== undefined) {
            this.drawFeedingTimerBar(boid);
        }
        
        // Draw feeding cooldown timer bar when in feeding cooldown
        if (boid.behaviorState === 'feeding_cooldown' && boid.feedingCooldownTimer !== undefined) {
            this.drawFeedingCooldownTimerBar(boid);
        }
        
        // Draw spawning timer bar when spawning
        if (boid.behaviorState === 'spawning' && boid.spawningProperties?.spawningTimer !== undefined) {
            this.drawSpawningTimerBar(boid);
        }
        
        // Draw spawning cooldown timer bar when in spawning cooldown
        if (boid.behaviorState === 'spawning_cooldown' && boid.spawningProperties?.spawningTimer !== undefined) {
            this.drawSpawningCooldownTimerBar(boid);
        }
        
        // Draw detection radius when hunting
        if (boid.behaviorState === 'hunting') {
            this.drawDetectionRadius(boid);
        }
        
        // Draw hunt target line
        if (boid.huntTarget) {
            this.drawHuntTargetLine(boid);
        }
        
        // Draw spawn target line when spawning
        if (boid.behaviorState === 'spawning' && boid.spawningProperties?.spawnTarget) {
            this.drawSpawnTargetLine(boid);
        }
        
        ctx.restore();
    }

    drawEnergyBar(boid) {
        const ctx = window.ctx;
        const barWidth = 20;
        const barHeight = 3;
        const energyPercent = (boid.energy || 50) / 100;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boid.x - barWidth/2, boid.y - 15, barWidth, barHeight);
        
        // Energy bar
        ctx.fillStyle = energyPercent > 0.5 ? '#00FF00' : '#FFFF00';
        ctx.fillRect(boid.x - barWidth/2, boid.y - 15, barWidth * energyPercent, barHeight);
    }

    drawFeedingTimerBar(boid) {
        const ctx = window.ctx;
        const barWidth = 20;
        const barHeight = 3;
        const feedingPercent = boid.feedingTimer / boid.feedingDuration;
        const timerBarY = boid.y - 11;
        
        // Timer background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth, barHeight);
        
        // Timer bar (sky blue to match feeding color)
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth * feedingPercent, barHeight);
    }

    drawFeedingCooldownTimerBar(boid) {
        const ctx = window.ctx;
        const barWidth = 20;
        const barHeight = 3;
        const timerBarY = boid.y - 11;
        
        // Since the feeding cooldown system was removed, we'll show a simple indicator
        // that the fry is in a cooldown state
        const cooldownPercent = 0.5; // Show 50% progress as placeholder
        
        // Timer background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth, barHeight);
        
        // Timer bar (light pink to match feeding cooldown color)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth * cooldownPercent, barHeight);
    }

    drawSpawningTimerBar(boid) {
        const ctx = window.ctx;
        const barWidth = 20;
        const barHeight = 3;
        const spawningDuration = 8000; // 8 seconds from spawning system config
        const spawningPercent = boid.spawningProperties.spawningTimer / spawningDuration;
        const timerBarY = boid.y - 11;
        
        // Timer background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth, barHeight);
        
        // Timer bar (hot pink to match spawning color)
        ctx.fillStyle = '#FF69B4';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth * spawningPercent, barHeight);
    }

    drawSpawningCooldownTimerBar(boid) {
        const ctx = window.ctx;
        const barWidth = 20;
        const barHeight = 3;
        const spawningDuration = 8000; // 8 seconds from spawning system config
        const spawningPercent = boid.spawningProperties.spawningTimer / spawningDuration;
        const timerBarY = boid.y - 11;
        
        // Timer background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth, barHeight);
        
        // Timer bar (plum to match spawning cooldown color)
        ctx.fillStyle = '#DDA0DD';
        ctx.fillRect(boid.x - barWidth/2, timerBarY, barWidth * spawningPercent, barHeight);
    }

    drawDetectionRadius(boid) {
        const ctx = window.ctx;
        const detectionRange = this.config.BEHAVIOR_CONFIG?.detectionRange || 120;
        
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(boid.x, boid.y, detectionRange, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawHuntTargetLine(boid) {
        const ctx = window.ctx;
        const detectionRange = this.config.BEHAVIOR_CONFIG?.detectionRange || 120;
        
        // Only draw line if target is within detection range
        const distance = Math.sqrt((boid.x - boid.huntTarget.x) ** 2 + (boid.y - boid.huntTarget.y) ** 2);
        if (distance <= detectionRange) {
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(boid.x, boid.y);
            ctx.lineTo(boid.huntTarget.x, boid.huntTarget.y);
            ctx.stroke();
            
            // Target indicator
            ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(boid.huntTarget.x, boid.huntTarget.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSpawnTargetLine(boid) {
        const ctx = window.ctx;
        const spawnTarget = boid.spawningProperties.spawnTarget;
        
        if (!spawnTarget || spawnTarget.eaten) return;
        
        // Draw line to actual spawn target
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.6)'; // Hot pink
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boid.x, boid.y);
        ctx.lineTo(spawnTarget.x, spawnTarget.y);
        ctx.stroke();
        
        // Draw line to perceived target (50 pixels higher)
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.3)'; // Lighter hot pink
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line for perceived position
        ctx.beginPath();
        ctx.moveTo(boid.x, boid.y);
        ctx.lineTo(spawnTarget.x, spawnTarget.y - 50);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Actual target indicator
        ctx.fillStyle = 'rgba(255, 105, 180, 0.8)';
        ctx.beginPath();
        ctx.arc(spawnTarget.x, spawnTarget.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Perceived target indicator (higher)
        ctx.fillStyle = 'rgba(255, 105, 180, 0.4)';
        ctx.beginPath();
        ctx.arc(spawnTarget.x, spawnTarget.y - 50, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw spawn radius around actual target
        ctx.strokeStyle = 'rgba(255, 105, 180, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(spawnTarget.x, spawnTarget.y, 30, 0, Math.PI * 2); // 30 pixel spawn radius
        ctx.stroke();
    }
}

// Export for global access
window.BoidRenderingSystem = BoidRenderingSystem; 