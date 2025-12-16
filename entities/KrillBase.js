// Base Krill class with core functionality
class KrillBase extends Boid {
    constructor() {
        super(FISH_TYPES.KRILL);
        
        // Initialize velocity properly
        this.velocity = this.velocity || { x: 0, y: 0 };
        this.velocity.x = (Math.random() - 0.5) * 2;
        this.velocity.y = (Math.random() - 0.5) * 2;
        
        // Core krill properties
        this.krillSize = 9;
        this.size = this.krillSize;
        this.maxSpeed = 2.0;
        this.maxForce = 0.04;
        this.eatRadius = 20;
        this.eatRadiusSquared = this.eatRadius * this.eatRadius;
        
        // Behavioral state system
        this.behaviorState = 'schooling';
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
        
        // Post-migration resting properties
        this.wasMigrating = false;
        this.postMigrationRest = false;
        this.postMigrationRestStart = null;
        
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
        
        // Add more randomization to initial velocity to prevent line formation
        this.velocity.x += (Math.random() - 0.5) * 2;
        this.velocity.y += (Math.random() - 0.5) * 2;
    }
    
    setupFishProperties() {
        // Override parent - krill have specialized properties
        this.fishType = FISH_TYPES.KRILL;
        this.size = this.krillSize;
        this.maxSpeed = 1.8 + (this.nutritionLevel * 0.5); // Speed varies with nutrition
        this.preferredDepthZone = 'deep';
        this.canEat = ['krill']; // For compatibility
    }
    
    // Add missing move method
    move() {
        // Apply velocity to position
        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }
    
    // Add missing edges method
    edges() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const margin = 60;
        const damping = 0.9;
        
        // Handle horizontal boundaries
        if (this.x < margin) {
            this.x = margin;
            this.velocity.x *= -damping;
        } else if (this.x > WORLD_WIDTH - margin) {
            this.x = WORLD_WIDTH - margin;
            this.velocity.x *= -damping;
        }
        
        // Handle vertical boundaries
        if (this.y < margin) {
            this.y = margin;
            this.velocity.y *= -damping;
        } else if (this.y > WORLD_HEIGHT - margin) {
            this.y = WORLD_HEIGHT - margin;
            this.velocity.y *= -damping;
        }
    }
    
    // Main update function using the simplified AI system
    update(boids, predators, food, poop, sperm = []) {
        // Update cached nearby krill periodically for performance
        const currentTime = Date.now();
        if (currentTime - this.lastNearbyUpdate > this.nearbyUpdateInterval) {
            this.updateNearbyKrill(boids);
            this.lastNearbyUpdate = currentTime;
        }
        
        // Use the simplified AI system
        if (window.krillAI) {
            const aiResult = window.krillAI.updateKrillBehavior(
                this,
                this.nearbyKrill,
                predators,
                food,
                poop,
                sperm
            );
            
            // Store AI results for debug visualization
            this.aiResult = aiResult;
            this.behaviorState = aiResult.state;
            
            // Apply position update
            this.move();
            
            // Handle world boundaries
            this.edges();
        } else {
            // Fallback to basic behavior if AI system not loaded
            this.basicUpdate(boids, predators, food, poop, sperm);
            
            // Standard movement and bounds checking for fallback
            this.move();
            this.edges();
        }
        
        // Handle food consumption (improved from unmodularized version)
        this.checkForFood(food, poop, sperm);
        
        // Update animation
        this.updateAnimation();
    }
    
    // Improved food consumption methods from unmodularized version
    checkForFood(fishFoodArray, poopArray, spermArray = []) {
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
        
        // Check for sperm consumption (high nutrition, easy to catch)
        for (let i = spermArray.length - 1; i >= 0; i--) {
            const sperm = spermArray[i];
            if (!sperm.eaten) {
                const distSquared = this.distanceSquared(this, sperm);
                if (distSquared < this.eatRadiusSquared) {
                    this.consumeSperm(sperm, spermArray, i);
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
        
        // Handle transformation for regular krill
        if (this.canTransform && this.constructor.name === 'Krill') {
            this.shouldTransform = true;
            this.transformTo = 'momKrill';
        }
        
        // Remove consumed poop
        poopArray.splice(index, 1);
    }
    
    consumeSperm(sperm, spermArray, index) {
        sperm.eaten = true;
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Krill consumed sperm! Type: ${this.constructor.name}, Food consumed: ${this.foodConsumed + 1}`);
        }
        
        // High nutrition from sperm (protein-rich!)
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + 0.12);
        this.energy = Math.min(1.0, this.energy + 0.15);
        this.hunger = Math.max(0, this.hunger - 0.25);
        
        // Food value for reproduction (sperm is nutritious)
        this.foodConsumed = (this.foodConsumed || 0) + 2;
        
        // Visual effect
        if (Math.random() < 0.6 && window.ObjectPools) {
            window.ObjectPools.getEatingBubble(sperm.x, sperm.y);
        }
        
        // Handle transformation for regular krill - sperm is very nutritious
        if (this.canTransform && this.constructor.name === 'Krill' && this.foodConsumed >= 3 && !this.shouldTransform) {
            this.shouldTransform = true;
            this.transformTo = 'momKrill';
            
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Krill ready for transformation after eating sperm! Food consumed: ${this.foodConsumed}`);
            }
        }
        
        // Remove consumed sperm
        spermArray.splice(index, 1);
    }
    
    consumeFishFood(food) {
        food.eaten = true;
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Krill consumed fish food! Type: ${this.constructor.name}, Food consumed: ${this.foodConsumed + 1}`);
        }
        
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
        
        // Handle transformation for regular krill - only after eating 3+ fish food
        // AND only if not already set to transform
        if (this.canTransform && this.constructor.name === 'Krill' && this.foodConsumed >= 3 && !this.shouldTransform) {
            this.shouldTransform = true;
            this.transformTo = 'momKrill';
            
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Krill ready for transformation! Food consumed: ${this.foodConsumed}`);
            }
        }
    }
    
    // Food consumption tracking for external systems
    checkFoodConsumption(foodValue) {
        this.foodConsumed = (this.foodConsumed || 0) + foodValue;
        this.nutritionLevel = Math.min(1.0, this.nutritionLevel + 0.1);
        this.energy = Math.min(1.0, this.energy + 0.05);
        this.hunger = Math.max(0, this.hunger - 0.15);
    }
    
    // Fallback basic behavior if AI system unavailable
    basicUpdate(boids, predators, food, poop, sperm = []) {
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
        
        // Basic depth movement
        const depthDiff = this.y - targetDepth;
        this.velocity.y -= depthDiff * 0.0001;
        
        // Add randomized movement during migration to break uniformity
        if (this.behaviorState === 'migrating') {
            // Individual migration randomization - each krill has slightly different behavior
            const personalOffset = this.wanderOffset + currentTime * 0.0001;
            
            // Random horizontal drift during migration
            const horizontalDrift = Math.sin(personalOffset) * 0.02;
            const verticalVariation = Math.cos(personalOffset * 1.3) * 0.015;
            
            // Add some noise to prevent perfect synchronization
            const noiseX = (Math.random() - 0.5) * 0.03;
            const noiseY = (Math.random() - 0.5) * 0.02;
            
            // Apply randomized forces
            this.velocity.x += horizontalDrift + noiseX;
            this.velocity.y += verticalVariation + noiseY;
            
            // Slight speed variation during migration
            const speedVariation = 0.8 + Math.sin(personalOffset * 0.7) * 0.3;
            this.velocity.x *= speedVariation;
            this.velocity.y *= speedVariation;
        }
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
                speedMultiplier = 1.1; // Moderate speed for migration
                break;
            case 'resting':
                speedMultiplier = 0.5; // Slower when resting
                break;
            default:
                speedMultiplier = 1.0; // Normal speed for foraging
        }
        
        // Apply nutrition-based speed variation
        const nutritionSpeedBonus = this.nutritionLevel * 0.3;
        this.maxSpeed = (1.8 + nutritionSpeedBonus) * speedMultiplier;
    }
    
    updateAnimation() {
        this.animationFrame += this.animationSpeed;
        if (this.animationFrame >= this.spriteFrames.length) {
            this.animationFrame = 0;
        }
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const sprites = window.sprites || {};
        const baseOpacity = 0.8;
        let depthOpacity = window.Utils.getDepthOpacity(this.y, baseOpacity);
        let tintStrength = window.Utils.getDepthTint(this.y);
        
        // Get current sprite frame
        const currentSpriteKey = this.spriteFrames[Math.floor(this.animationFrame)];
        if (!sprites[currentSpriteKey]) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // Apply depth-based opacity and tint
        ctx.globalAlpha = depthOpacity;
        if (tintStrength > 0) {
            ctx.filter = `brightness(${1 - tintStrength * 0.3})`;
        }
        
        // Create temporary canvas for sprite processing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.size;
        tempCanvas.height = this.size;
        
        // Draw sprite to temp canvas
        tempCtx.drawImage(window.sprites[currentSpriteKey], 0, 0, this.size, this.size);
        
        // Apply velocity-based rotation
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Krill1-3 sprites render at normal size
        const renderSize = this.size;
        
        // Draw the processed sprite
        ctx.drawImage(window.sprites[currentSpriteKey], -renderSize/2, -renderSize/2, renderSize, renderSize);
        
        ctx.restore();
        
        // Debug visualization handled by KrillRenderingSystem
    }
    
    distanceSquared(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return dx * dx + dy * dy;
    }
    
    calculateSteering(target, maxSpeed, maxForce) {
        const desired = {
            x: target.x - this.x,
            y: target.y - this.y
        };
        
        const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        
        if (distance > 0) {
            desired.x /= distance;
            desired.y /= distance;
            desired.x *= maxSpeed;
            desired.y *= maxSpeed;
            
            const steer = {
                x: desired.x - this.velocity.x,
                y: desired.y - this.velocity.y
            };
            
            const steerMag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (steerMag > maxForce) {
                steer.x /= steerMag;
                steer.y /= steerMag;
                steer.x *= maxForce;
                steer.y *= maxForce;
            }
            
            return steer;
        }
        
        return { x: 0, y: 0 };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.KrillBase = KrillBase;
} 