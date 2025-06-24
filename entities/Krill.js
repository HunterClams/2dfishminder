// Enhanced Krill class with advanced AI and swarm behavior
class Krill extends Boid {
    constructor() {
        super(FISH_TYPES.KRILL);
        
        // Core krill properties
        this.krillSize = 9;
        this.size = this.krillSize;
        this.maxSpeed = 1.8;
        this.maxForce = 0.025;
        this.eatRadius = 20;
        this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        
        // Behavioral state system
        this.behaviorState = 'foraging';
        this.energy = 0.7 + Math.random() * 0.3; // Start with good energy
        this.hunger = Math.random() * 0.5; // Random initial hunger
        this.nutritionLevel = 0.5;
        
        // AI and swarm properties
        this.seekTarget = null;
        this.fleeTarget = null;
        this.fleeIntensity = 0;
        this.swarmCenter = null;
        this.swarmSize = 0;
        this.migrationPhase = 0;
        this.migrationTarget = null;
        this.restStartTime = 0;
        this.wanderOffset = Math.random() * Math.PI * 2;
        
        // Animation and visual properties
        this.animationFrame = 0;
        this.animationSpeed = 0.08;
        this.spriteFrames = ['krill1', 'krill2', 'krill3', 'krill2'];
        
        // Spawn in deep waters (60-90% depth)
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const spawnDepth = 0.6 + Math.random() * 0.3;
        this.y = WORLD_HEIGHT * spawnDepth;
        
        // Food tracking for reproduction system
        this.poopEaten = 0;
        this.foodConsumed = 0;
        this.canTransform = true;
        
        // Performance optimization - cache nearby entities
        this.nearbyKrill = [];
        this.lastNearbyUpdate = 0;
        this.nearbyUpdateInterval = 200; // Update every 200ms
    }
    
    setupFishProperties() {
        // Override parent - krill have specialized properties
        this.fishType = FISH_TYPES.KRILL;
        this.size = this.krillSize;
        this.maxSpeed = 1.8 + (this.nutritionLevel * 0.5); // Speed varies with nutrition
        this.preferredDepthZone = 'deep';
        this.canEat = ['krill']; // For compatibility
    }
    
    // Main update function using the new AI system
    update(boids, predators, food, poop) {
        // Update cached nearby krill periodically for performance
        const currentTime = Date.now();
        if (currentTime - this.lastNearbyUpdate > this.nearbyUpdateInterval) {
            this.updateNearbyKrill(boids);
            this.lastNearbyUpdate = currentTime;
        }
        
        // Use the advanced AI system
        if (window.krillAI) {
            const aiResult = window.krillAI.updateKrillBehavior(
                this,
                this.nearbyKrill,
                predators,
                food,
                poop
            );
            
            // Store AI results for debug visualization
            this.aiResult = aiResult;
        } else {
            // Fallback to basic behavior if AI system not loaded
            this.basicUpdate(boids, predators, food, poop);
        }
        
        // Standard movement and bounds checking
        this.move();
        this.edges();
        
        // Handle food consumption
        this.checkForFood(food, poop);
        
        // Update animation
        this.updateAnimation();
        
        // Update speed based on current state and nutrition
        this.updateSpeedBasedOnState();
    }
    
    // Fallback basic behavior if AI system unavailable
    basicUpdate(boids, predators, food, poop) {
        // Simple flocking with other krill
        const krillOnly = boids.filter(b => b.fishType === FISH_TYPES.KRILL);
        super.flock(krillOnly, predators, food, []);
        
        // Basic poop seeking
        this.basicPoopSeek(poop);
        
        // Basic migration behavior
        this.basicMigration();
        
        // Basic energy and hunger updates
        this.energy = Math.max(0, this.energy - 0.0005);
        this.hunger = Math.min(1.0, this.hunger + 0.001);
        this.nutritionLevel = Math.max(0.2, this.nutritionLevel - 0.001);
    }
    
    basicPoopSeek(poopArray) {
        let closest = null;
        let closestDistSquared = this.eatRadiusSquared * 4;
        
        for (let poop of poopArray) {
            if (poop.isActive && poop.state >= 2) {
                const distSquared = this.distanceSquared(this, poop);
                if (distSquared < closestDistSquared) {
                    closest = poop;
                    closestDistSquared = distSquared;
                }
            }
        }
        
        if (closest) {
            this.behaviorState = 'seeking';
            this.seekTarget = closest;
            const seekForce = this.calculateSteering(
                { x: closest.x - this.x, y: closest.y - this.y },
                this.maxSpeed,
                this.maxForce
            );
            this.velocity.x += seekForce.x * 1.5;
            this.velocity.y += seekForce.y * 1.5;
        } else if (this.behaviorState === 'seeking') {
            this.behaviorState = 'foraging';
            this.seekTarget = null;
        }
    }
    
    basicMigration() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const currentTime = Date.now();
        const migrationCycle = 240000; // 4 minutes
        const cyclePosition = (currentTime % migrationCycle) / migrationCycle;
        
        let targetDepth;
        if (cyclePosition > 0.3 && cyclePosition < 0.7) {
            targetDepth = WORLD_HEIGHT * 0.4; // Move up
            this.behaviorState = 'migrating';
        } else {
            targetDepth = WORLD_HEIGHT * 0.75; // Return to deep
            if (this.behaviorState === 'migrating') {
                this.behaviorState = 'foraging';
            }
        }
        
        const depthDiff = this.y - targetDepth;
        this.velocity.y -= depthDiff * 0.0001;
    }
    
    updateNearbyKrill(boids) {
        const SWARM_RADIUS = window.KRILL_CONFIG?.SWARM_RADIUS || 120;
        this.nearbyKrill = boids.filter(b => {
            if (b === this || b.fishType !== FISH_TYPES.KRILL) return false;
            const dx = this.x - b.x;
            const dy = this.y - b.y;
            const distSquared = dx * dx + dy * dy;
            return distSquared < SWARM_RADIUS * SWARM_RADIUS;
        });
    }
    
    updateSpeedBasedOnState() {
        let speedMultiplier = 1.0;
        
        switch (this.behaviorState) {
            case 'fleeing':
                speedMultiplier = 1.5; // Faster when fleeing
                break;
            case 'seeking':
                speedMultiplier = 1.2; // Slightly faster when seeking food
                break;
            case 'migrating':
                speedMultiplier = 1.1; // Slightly faster during migration
                break;
            case 'resting':
                speedMultiplier = 0.5; // Much slower when resting
                break;
            case 'swarming':
                speedMultiplier = 0.9; // Slightly slower in tight swarms
                break;
            default:
                speedMultiplier = 1.0;
        }
        
        // Apply nutrition factor
        const nutritionFactor = 0.7 + (this.nutritionLevel * 0.3);
        this.maxSpeed = 1.8 * speedMultiplier * nutritionFactor;
    }
    
    updateAnimation() {
        this.animationFrame += this.animationSpeed;
        if (this.animationFrame >= this.spriteFrames.length) {
            this.animationFrame = 0;
        }
    }
    
    checkForFood(fishFoodArray, poopArray) {
        // Check for poop consumption (preferred food)
        for (let i = poopArray.length - 1; i >= 0; i--) {
            const poop = poopArray[i];
            if (poop.isActive && poop.state >= 2) {
                const distSquared = this.distanceSquared(this, poop);
                if (distSquared < this.eatRadiusSquared) {
                    this.consumePoop(poop, poopArray, i);
                    break; // Only eat one per frame
                }
            }
        }
        
        // Check for fish food consumption
        for (let i = fishFoodArray.length - 1; i >= 0; i--) {
            const food = fishFoodArray[i];
            if (!food.eaten) {
                const distSquared = this.distanceSquared(this, food);
                if (distSquared < this.eatRadiusSquared) {
                    this.consumeFishFood(food);
                    break; // Only eat one per frame
                }
            }
        }
    }
    
    consumePoop(poop, poopArray, index) {
        this.behaviorState = 'eating';
        this.poopEaten++;
        
        // Nutrition based on poop type
        const nutritionGain = poop.type === 'tuna' ? 0.15 : 
                             poop.type === 'squid' ? 0.2 : 0.1;
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + nutritionGain);
        
        // Energy and hunger restoration
        this.energy = Math.min(1.0, this.energy + 0.1);
        this.hunger = Math.max(0, this.hunger - 0.3);
        
        // Food value for reproduction
        const foodValue = poop.type === 'tuna' ? 2 : 
                         poop.type === 'squid' ? 3 : 1;
        this.foodConsumed = (this.foodConsumed || 0) + foodValue;
        
        // Visual effect (reduced to prevent lag)
        if (Math.random() < 0.4 && window.ObjectPools) {
            window.ObjectPools.getEatingBubble(poop.x, poop.y);
        }
        
        // Remove consumed poop
        poopArray.splice(index, 1);
    }
    
    consumeFishFood(food) {
        food.eaten = true;
        
        // Less nutrition from fish food
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + 0.05);
        this.energy = Math.min(1.0, this.energy + 0.08);
        this.hunger = Math.max(0, this.hunger - 0.2);
        
        // Food value for reproduction
        this.foodConsumed = (this.foodConsumed || 0) + 1;
        
        // Visual effect
        if (Math.random() < 0.5 && window.ObjectPools) {
            window.ObjectPools.getEatingBubble(food.x, food.y);
        }
    }
    
    // Food consumption tracking for external systems
    checkFoodConsumption(foodValue) {
        this.foodConsumed = (this.foodConsumed || 0) + foodValue;
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + 0.1);
        this.energy = Math.min(1.0, this.energy + 0.05);
        this.hunger = Math.max(0, this.hunger - 0.15);
    }
    
    // Reproduction system compatibility
    checkReproduction() {
        if ((this.foodConsumed || 0) >= 5) {
            return {
                shouldTransform: true,
                newType: 'mom',
                x: this.x,
                y: this.y,
                velocity: { x: this.velocity.x, y: this.velocity.y }
            };
        }
        return { shouldTransform: false };
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // State-based opacity modifications
        let baseOpacity = 0.85;
        if (this.behaviorState === 'fleeing') {
            baseOpacity = 0.95; // More visible when fleeing
        } else if (this.behaviorState === 'resting') {
            baseOpacity = 0.6; // Less visible when resting
        } else if (this.behaviorState === 'migrating') {
            baseOpacity = 0.9; // Slightly more visible during migration
        }
        
        // Apply depth effects (reduced by 50% for krill)
        let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
        let tintStrength = window.Utils.getDepthTint(this.y);
        
        depthOpacity = baseOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Apply depth tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            tempCtx.drawImage(window.sprites[currentSpriteKey], 0, 0, this.size, this.size);
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(window.sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx || !this.behaviorState) return;
        
        ctx.save();
        
        // State color coding
        const stateColors = {
            'foraging': '#90EE90',    // Light Green
            'seeking': '#FFA500',     // Orange  
            'eating': '#87CEEB',      // Sky Blue
            'fleeing': '#FF6B6B',     // Red
            'migrating': '#DDA0DD',   // Plum
            'resting': '#F0E68C',     // Khaki
            'swarming': '#98FB98'     // Pale Green
        };
        
        const stateColor = stateColors[this.behaviorState] || '#FFFFFF';
        
        // Draw behavior state text
        ctx.fillStyle = stateColor;
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.behaviorState.toUpperCase(), this.x, this.y - 15);
        
        // Draw swarm size if in swarm
        if (this.swarmSize > 1) {
            ctx.font = '7px Arial';
            ctx.fillStyle = 'rgba(152, 251, 152, 0.8)';
            ctx.fillText(`S:${this.swarmSize}`, this.x, this.y - 8);
        }
        
        // Draw migration info when migrating
        if (this.behaviorState === 'migrating' && this.migrationPhase !== undefined) {
            ctx.font = '6px Arial';
            ctx.fillStyle = 'rgba(221, 160, 221, 0.9)'; // Plum color
            const phase = (this.migrationPhase * 100).toFixed(0);
            const isUpward = this.migrationPhase > 0.3 && this.migrationPhase < 0.7;
            ctx.fillText(`M:${phase}% ${isUpward ? '↑' : '↓'}`, this.x, this.y - 1);
        }
        
        // Draw energy bar
        const barWidth = 16;
        const barHeight = 2;
        const energyPercent = this.energy || 0.5;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - barWidth/2, this.y - 12, barWidth, barHeight);
        
        ctx.fillStyle = energyPercent > 0.7 ? '#00FF00' : 
                       energyPercent > 0.4 ? '#FFFF00' : '#FF6666';
        ctx.fillRect(this.x - barWidth/2, this.y - 12, barWidth * energyPercent, barHeight);
        
        // Draw hunger indicator
        if (this.hunger > 0.6) {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.font = '6px Arial';
            ctx.fillText('H', this.x + 10, this.y - 5);
        }
        
        // Draw food consumption for reproduction
        if (this.foodConsumed !== undefined) {
            ctx.font = '7px Arial';
            ctx.fillStyle = 'rgba(255, 192, 203, 0.8)';
            ctx.fillText(`${this.foodConsumed}/5`, this.x, this.y + 18);
        }
        
        // Draw seek target line (only if reasonably close)
        if (this.seekTarget) {
            const distanceToTarget = Math.sqrt((this.x - this.seekTarget.x) ** 2 + (this.y - this.seekTarget.y) ** 2);
            if (distanceToTarget <= 60) { // Only show line if food is within 60 pixels
                ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.seekTarget.x, this.seekTarget.y);
                ctx.stroke();
            }
        }
        
        // Draw flee indicator
        if (this.behaviorState === 'fleeing' && this.fleeTarget) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            const fleeX = this.x + (this.x - this.fleeTarget.x) * 0.3;
            const fleeY = this.y + (this.y - this.fleeTarget.y) * 0.3;
            ctx.lineTo(fleeX, fleeY);
            ctx.stroke();
        }
        
        // Draw swarm center connection
        if (this.swarmCenter && this.behaviorState === 'swarming') {
            ctx.strokeStyle = 'rgba(152, 251, 152, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.swarmCenter.x, this.swarmCenter.y);
            ctx.stroke();
            
            // Mark swarm center
            ctx.fillStyle = 'rgba(152, 251, 152, 0.6)';
            ctx.beginPath();
            ctx.arc(this.swarmCenter.x, this.swarmCenter.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Utility functions
    distanceSquared(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return dx * dx + dy * dy;
    }
    
    calculateSteering(target, maxSpeed, maxForce) {
        // Simplified steering - normalize target vector
        const mag = Math.sqrt(target.x * target.x + target.y * target.y);
        if (mag === 0) return { x: 0, y: 0 };
        
        const desired = {
            x: (target.x / mag) * maxSpeed,
            y: (target.y / mag) * maxSpeed
        };
        
        const steer = {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
        
        const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (steerMag > maxForce) {
            steer.x = (steer.x / steerMag) * maxForce;
            steer.y = (steer.y / steerMag) * maxForce;
        }
        
        return steer;
    }
}

// Pale Krill - smaller, faster, juvenile form that matures into regular krill
class PaleKrill extends Krill {
    constructor(x, y, velocity = null) {
        super();
        
        // Override krill properties for pale krill
        this.krillSize = 7; // Increased by 2px (was 5, now 7)
        this.size = this.krillSize;
        this.maxSpeed = 2.8; // Faster than regular krill (1.8)
        this.maxForce = 0.035; // Slightly higher force for more agile movement
        
        // Pale krill specific properties
        this.maturationTimer = 0;
        this.maturationTime = 60000; // 1 minute in milliseconds
        this.isMaturing = false;
        
        // Use pale krill sprites
        this.spriteFrames = ['paleKrill1', 'paleKrill2', 'paleKrill3', 'paleKrill2'];
        
        // Set position and velocity if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        if (velocity) {
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
        }
        
        // Reset food consumption
        this.foodConsumed = 0;
    }
    
    update(boids, predators, food, poop) {
        // Update maturation timer
        this.maturationTimer += 16; // Approximate frame time
        
        // Check if ready to mature into regular krill
        if (this.maturationTimer >= this.maturationTime) {
            this.isMaturing = true;
        }
        
        // Standard krill update with AI system
        super.update(boids, predators, food, poop);
    }
    
    // Check if pale krill should transform into regular krill
    checkMaturation() {
        if (this.isMaturing) {
            return {
                shouldTransform: true,
                newType: 'regular',
                x: this.x,
                y: this.y,
                velocity: { x: this.velocity.x, y: this.velocity.y }
            };
        }
        return { shouldTransform: false };
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // Pale krill have slightly different opacity (more translucent)
        let baseOpacity = 0.75;
        if (this.behaviorState === 'fleeing') {
            baseOpacity = 0.9; // More visible when fleeing
        } else if (this.behaviorState === 'resting') {
            baseOpacity = 0.5; // Less visible when resting
        } else if (this.behaviorState === 'migrating') {
            baseOpacity = 0.8; // Slightly more visible during migration
        }
        
        // Apply depth effects (reduced by 50% for krill)
        let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
        let tintStrength = window.Utils.getDepthTint(this.y);
        
        depthOpacity = baseOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Apply depth tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            tempCtx.drawImage(window.sprites[currentSpriteKey], 0, 0, this.size, this.size);
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(window.sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawDebugInfo();
        }
    }
}

// Mom Krill - larger, produces pale krill offspring
class MomKrill extends Krill {
    constructor(x, y, velocity = null) {
        super();
        
        // Override krill properties for mom krill
        this.krillSize = 9; // Same size as regular krill
        this.size = this.krillSize;
        this.maxSpeed = 1.5; // Slower than regular krill (pregnancy effect)
        this.maxForce = 0.02; // Lower force (less agile when pregnant)
        
        // Mom krill specific properties
        this.reproductionTimer = 0;
        this.reproductionTime = 10000; // 10 seconds in milliseconds
        this.hasReproduced = false;
        this.offspringCount = Math.floor(Math.random() * 3) + 2; // 2-4 offspring
        this.batchesProduced = 0; // Track how many batches have been produced
        this.maxBatches = Math.floor(Math.random() * 2) + 1; // 1-2 batches before turning back
        this.shouldRevert = false; // Flag to indicate when mom should turn back to regular krill
        
        // Use mom krill sprites
        this.spriteFrames = ['momKrill1', 'momKrill2', 'momKrill3', 'momKrill2'];
        
        // Set position and velocity if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        if (velocity) {
            this.velocity.x = velocity.x;
            this.velocity.y = velocity.y;
        }
        
        // Reset food consumption
        this.foodConsumed = 0;
    }
    
    update(boids, predators, food, poop) {
        // Update reproduction timer
        if (!this.hasReproduced) {
            this.reproductionTimer += 16; // Approximate frame time
        }
        
        // Standard krill update with AI system
        super.update(boids, predators, food, poop);
    }
    
    // Check if mom krill should produce offspring
    checkOffspring() {
        if (!this.hasReproduced && this.reproductionTimer >= this.reproductionTime) {
            const offspring = [];
            
            for (let i = 0; i < this.offspringCount; i++) {
                // Spread offspring around the mom
                const angle = (Math.PI * 2 * i) / this.offspringCount + Math.random() * 0.5;
                const distance = 20 + Math.random() * 15;
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;
                
                offspring.push({
                    x: this.x + offsetX,
                    y: this.y + offsetY,
                    velocity: {
                        x: this.velocity.x * 0.5 + (Math.random() - 0.5) * 0.5,
                        y: this.velocity.y * 0.5 + (Math.random() - 0.5) * 0.5
                    }
                });
            }
            
            this.hasReproduced = true;
            this.batchesProduced++;
            
            // Check if mom should revert after this batch
            if (this.batchesProduced >= this.maxBatches) {
                this.shouldRevert = true;
            } else {
                // Reset for next batch
                this.reproductionTimer = 0;
                this.hasReproduced = false;
                this.offspringCount = Math.floor(Math.random() * 3) + 2; // New offspring count for next batch
            }
            
            // Reduced birth effect bubbles (prevent lag)
            for (let i = 0; i < Math.min(this.offspringCount, 3); i++) {
                if (window.ObjectPools) {
                    window.ObjectPools.getEatingBubble(
                        this.x + (Math.random() - 0.5) * 20,
                        this.y + (Math.random() - 0.5) * 20
                    );
                }
            }
            
            return {
                shouldProduce: true,
                offspring: offspring,
                shouldRevert: this.shouldRevert
            };
        }
        return { shouldProduce: false };
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.3;
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        
        // Mom krill have full opacity and slight glow effect when about to reproduce
        let baseOpacity = 1.0;
        if (!this.hasReproduced && this.reproductionTimer > this.reproductionTime * 0.8) {
            // Slight pulsing when close to reproduction
            baseOpacity = 0.9 + 0.1 * Math.sin(this.reproductionTimer * 0.01);
        }
        
        // State-based opacity modifications
        if (this.behaviorState === 'fleeing') {
            baseOpacity = Math.min(1.0, baseOpacity + 0.1); // More visible when fleeing
        } else if (this.behaviorState === 'resting') {
            baseOpacity *= 0.7; // Less visible when resting
        } else if (this.behaviorState === 'migrating') {
            baseOpacity = Math.min(1.0, baseOpacity + 0.05); // Slightly more visible during migration
        }
        
        // Apply depth effects (reduced by 50% for krill)
        let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
        let tintStrength = window.Utils.getDepthTint(this.y);
        
        depthOpacity = baseOpacity * 0.5 + depthOpacity * 0.5;
        tintStrength *= 0.5;
        
        const ctx = window.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        if (tintStrength > 0) {
            // Apply depth tinting
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = this.size;
            tempCanvas.height = this.size;
            
            tempCtx.drawImage(window.sprites[currentSpriteKey], 0, 0, this.size, this.size);
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, this.size, this.size);
            
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(tempCanvas, -this.size/2, -this.size/2);
        } else {
            ctx.globalAlpha = depthOpacity;
            ctx.drawImage(window.sprites[currentSpriteKey], -this.size/2, -this.size/2, this.size, this.size);
        }
        
        ctx.restore();
        
        // Debug visualization
        if (window.gameState?.krillDebug) {
            this.drawDebugInfo();
        }
    }
}

// Export for use by other modules
if (typeof window !== 'undefined') {
    window.Krill = Krill;
    window.PaleKrill = PaleKrill;
    window.MomKrill = MomKrill;
} 