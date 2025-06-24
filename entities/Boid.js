// Boid class for small fish with flocking behavior
class Boid extends (window.Entity || Entity) {
    constructor(fishType = null) {
        // Use global constants safely
        const FISH_TYPES = window.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3', 
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        // Determine fish type and spawn zone BEFORE calling super()
        const actualFishType = fishType || FISH_TYPES.SMALL_FRY_2;
        
        // Determine spawn zone based on fish type
        let spawnZone;
        switch (actualFishType) {
            case FISH_TYPES.SMALL_FRY_2:
            case FISH_TYPES.SMALL_FRY_4:
                spawnZone = 'surface';
                break;
            case FISH_TYPES.SMALL_FRY_3:
                spawnZone = 'mid';
                break;
            default:
                spawnZone = 'shallow';
        }
        
        // Call parent constructor with proper spawn zone
        super(null, null, spawnZone);
        
        // NOW we can set this properties
        this.fishType = actualFishType;
        
        // Ensure velocity is properly initialized (safety check)
        if (!this.velocity) {
            this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
        }
        this.maxSpeed = 1.5;
        this.maxForce = 0.06; // Doubled from 0.03 for 2x turning speed
        this.size = 18;
        this.separationRadius = 35;
        this.alignmentRadius = 60;
        this.cohesionRadius = 80;
        this.fearRadius = 120;
        this.foodRadius = 80;
        this.huntRadius = 40;
        this.energy = 100;
        this.hunger = 0;
        this.huntCooldown = 0;
        this.animationFrame = 0;
        this.frameSpeed = 0.1;
        
        // Species-specific setup
        this.setupFishProperties();
        
        // Generate some variance in movement
        this.personalSpace = this.separationRadius + (Math.random() - 0.5) * 10;
        this.groupAffinity = 0.8 + Math.random() * 0.4;
        this.fearSensitivity = 0.8 + Math.random() * 0.4;
        
        // Depth preference based on fish type
        this.preferredDepth = this.getPreferredDepth();
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        this.depthTolerance = WORLD_HEIGHT * 0.15; // 15% of world height tolerance
    }
    
    setupFishProperties() {
        const FISH_TYPES = window.FISH_TYPES || {};
        
        const configs = {
            [FISH_TYPES.SMALL_FRY_4]: { size: 28, maxSpeed: 3.2 },
            [FISH_TYPES.SMALL_FRY_3]: { size: 32, maxSpeed: 2.8 },
            [FISH_TYPES.SMALL_FRY_2]: { size: 35, maxSpeed: 3.0 }
        };
        
        const config = configs[this.fishType] || configs[FISH_TYPES.SMALL_FRY_2];
        this.size = config.size;
        this.maxSpeed = config.maxSpeed;
    }

    getPreferredDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const FISH_TYPES = window.FISH_TYPES || {};
        
        switch (this.fishType) {
            case FISH_TYPES.SMALL_FRY_2:
            case FISH_TYPES.SMALL_FRY_4:
                return WORLD_HEIGHT * 0.2; // Prefer surface waters
            case FISH_TYPES.SMALL_FRY_3:
                return WORLD_HEIGHT * 0.4; // Prefer mid waters
            default:
                return WORLD_HEIGHT * 0.3;
        }
    }

    edges() {
        const WORLD_WIDTH = window.WORLD_WIDTH || 12000;
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        if (window.Utils && window.Utils.handleEdges) {
            window.Utils.handleEdges(this, 20, 0.8, WORLD_WIDTH, WORLD_HEIGHT);
        }
    }

    flock(boids, predators, food, krill = []) {
        const CONSTANTS = window.CONSTANTS || { PERCEPTION_RADIUS: 50, SEPARATION_RADIUS: 30 };
        const perceptionRadiusSquared = CONSTANTS.PERCEPTION_RADIUS * CONSTANTS.PERCEPTION_RADIUS;
        const separationRadiusSquared = CONSTANTS.SEPARATION_RADIUS * CONSTANTS.SEPARATION_RADIUS;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // Single pass through nearby boids
        for (let other of boids) {
            if (other === this) continue;
            
            const distSquared = this.distanceSquared(this, other);
            
            if (distSquared < perceptionRadiusSquared) {
                alignment.x += other.velocity.x;
                alignment.y += other.velocity.y;
                alignCount++;
                
                cohesion.x += other.x;
                cohesion.y += other.y;
                cohesionCount++;
            }
            
            if (distSquared < separationRadiusSquared) {
                const dist = Math.sqrt(distSquared);
                const diff = { x: (this.x - other.x) / dist, y: (this.y - other.y) / dist };
                separation.x += diff.x;
                separation.y += diff.y;
                separationCount++;
            }
        }
        
        // Calculate steering forces
        const forces = { x: 0, y: 0 };
        
        if (alignCount > 0) {
            alignment.x /= alignCount;
            alignment.y /= alignCount;
            const alignSteering = this.calculateSteering(alignment, this.maxSpeed, this.maxForce);
            forces.x += alignSteering.x;
            forces.y += alignSteering.y;
        }
        
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - this.x;
            cohesion.y = (cohesion.y / cohesionCount) - this.y;
            const cohesionSteering = this.calculateSteering(cohesion, this.maxSpeed, this.maxForce);
            forces.x += cohesionSteering.x;
            forces.y += cohesionSteering.y;
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            const separationSteering = this.calculateSteering(separation, this.maxSpeed, this.maxForce);
            forces.x += separationSteering.x * 1.5;
            forces.y += separationSteering.y * 1.5;
        }
        
        // Apply forces
        this.velocity.x += forces.x;
        this.velocity.y += forces.y;
        
        // Limit velocity
        if (window.Utils && window.Utils.limitVelocity) {
            window.Utils.limitVelocity(this.velocity, this.maxSpeed);
        }
    }

    distanceSquared(obj1, obj2) {
        return (obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2;
    }

    calculateSteering(target, maxSpeed, maxForce) {
        // Simplified steering calculation
        const desired = this.normalize(target);
        desired.x *= maxSpeed;
        desired.y *= maxSpeed;
        
        const steer = {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
        
        // Limit steering force
        const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
        if (mag > maxForce) {
            steer.x = (steer.x / mag) * maxForce;
            steer.y = (steer.y / mag) * maxForce;
        }
        
        return steer;
    }

    normalize(vector) {
        const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (mag === 0) return { x: 0, y: 0 };
        return { x: vector.x / mag, y: vector.y / mag };
    }

    update(boids, predators, food, krill, poop) {
        this.flock(boids, predators, food, krill);
        this.checkForFood(krill, food, poop); // Small fry eat krill, fish food, and poop
        this.move();
        this.edges();
    }
    
    // Small fry eating behavior - they eat krill, fish food, and poop
    checkForFood(krillArray, fishFoodArray, poopArray) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return;
        
        // Initialize behavior state if not present
        if (!this.behaviorState) {
            this.behaviorState = 'foraging';
            this.lastEatTime = 0;
            this.huntTarget = null;
            this.feedingTimer = 0;
            this.feedingDuration = 3000; // 3 seconds feeding state
            this.foodConsumed = 0; // Track food consumed for pooping system
            this.poopThreshold = 6 + Math.floor(Math.random() * 3); // 6-8 food items needed to poop
        }
        
        // Handle feeding state - update timer and prevent eating but allow normal movement
        if (this.behaviorState === 'feeding') {
            this.feedingTimer += 16; // Approximate frame time
            if (this.feedingTimer >= this.feedingDuration) {
                this.behaviorState = 'foraging';
                this.feedingTimer = 0;
            } else {
                // Still feeding - cannot eat food during feeding cooldown but can move normally
                return; // Exit early - no eating allowed during feeding state
            }
        }
        
        // Check all food types that small fry can eat
        const foodSources = [
            // Krill types with corrected food values
            { array: gameEntities.krill, name: 'krill', energyGain: 15, range: 25, foodValue: 3 }, // 2 needed to poop (6÷3=2)
            { array: gameEntities.paleKrill, name: 'paleKrill', energyGain: 12, range: 25, foodValue: 2 }, // 3 needed to poop (6÷2=3)
            { array: gameEntities.momKrill, name: 'momKrill', energyGain: 20, range: 25, foodValue: 6 }, // 1 needed to poop (correct)
            // Fish food - same as regular krill
            { array: gameEntities.fishFood, name: 'fishFood', energyGain: 10, range: 20, foodValue: 3 }, // 2 needed to poop (6÷3=2)
            // Poop (aged poop only - state 2 and 3) - different values for fry vs tuna poop
            { array: gameEntities.poop?.filter(p => p.state >= 2) || [], name: 'poop', energyGain: 8, range: 22, foodValue: 'variable' }
        ];
        
        let closestFood = null;
        let closestDistance = Infinity;
        
        // Find closest food
        for (let foodSource of foodSources) {
            if (!foodSource.array || foodSource.array.length === 0) continue;
            
            for (let i = foodSource.array.length - 1; i >= 0; i--) {
                const food = foodSource.array[i];
                
                // Check if this fry type can eat this food type
                if (window.shouldIgnorePrey && !window.shouldIgnorePrey(this.fishType, foodSource.name, window.FISH_TYPES)) {
                    const distance = Math.sqrt((this.x - food.x) ** 2 + (this.y - food.y) ** 2);
                    
                    // Check if within eating range
                    if (distance < foodSource.range) {
                        // Eat the food immediately
                        this.eatFood(food, foodSource, i);
                        return;
                    }
                    
                    // Track closest food for hunting behavior
                    if (distance < closestDistance && distance < 120) { // Detection range increased by 50% (was 80)
                        closestFood = { food, source: foodSource, distance, index: i };
                        closestDistance = distance;
                    }
                }
            }
        }
        
        // Update behavior state based on food availability (only if not feeding)
        if (this.behaviorState !== 'feeding') {
            if (closestFood) {
                this.behaviorState = 'hunting';
                this.huntTarget = closestFood.food;
                
                // Apply seeking force toward closest food
                const seekForce = this.calculateSteering({
                    x: closestFood.food.x - this.x,
                    y: closestFood.food.y - this.y
                }, this.maxSpeed, this.maxForce);
                
                this.velocity.x += seekForce.x * 0.8;
                this.velocity.y += seekForce.y * 0.8;
            } else {
                this.behaviorState = 'foraging';
                this.huntTarget = null;
            }
        } else {
            // During feeding state, clear hunt target but keep state
            this.huntTarget = null;
        }
    }
    
    // Helper method to eat food
    eatFood(food, foodSource, index) {
        // Remove the food from appropriate array
        if (foodSource.name === 'poop') {
            // For poop, find and remove from main poop array
            const poopIndex = window.gameEntities.poop.indexOf(food);
            if (poopIndex !== -1) {
                window.gameEntities.poop.splice(poopIndex, 1);
            }
        } else {
            foodSource.array.splice(index, 1);
        }
        
        // Create eating bubbles
        if (window.ObjectPools) {
            for (let j = 0; j < 2; j++) {
                window.ObjectPools.getEatingBubble(
                    this.x + (Math.random() - 0.5) * 15,
                    this.y + (Math.random() - 0.5) * 15
                );
            }
        }
        
        // Add food value to consumption counter (handle variable poop values)
        let actualFoodValue = foodSource.foodValue;
        if (foodSource.name === 'poop' && foodSource.foodValue === 'variable') {
            // Determine poop value based on poop type
            if (food.type === 'tuna') {
                actualFoodValue = 6; // 1 tuna poop = instant poop for fry
            } else {
                actualFoodValue = 1; // 6 fry poop needed to make fry poop
            }
        }
        this.foodConsumed += actualFoodValue;
        
        // Check if fry should poop based on food accumulation (6-8 food system)
        if (this.foodConsumed >= this.poopThreshold && window.gameEntities && window.gameEntities.poop && window.Poop) {
            // Create poop
            window.gameEntities.poop.push(new window.Poop(this.x, this.y, 'regular'));
            
            // Reset food counter and set new threshold
            this.foodConsumed = 0;
            this.poopThreshold = 6 + Math.floor(Math.random() * 3); // New random threshold 6-8
        }
        
        // Restore energy based on food type
        this.energy = Math.min(100, this.energy + foodSource.energyGain);
        this.lastEatTime = Date.now();
        this.behaviorState = 'feeding';
        this.feedingTimer = 0; // Reset feeding timer for 3-second feeding state
    }

    draw() {
        const sprites = window.sprites || {};
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.5;
        this.drawSprite(sprites[this.fishType], this.size, 0.9, angle);
        
        // Debug visualization for fry behavior
        if (window.gameState && window.gameState.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    // Debug visualization for fry behavior
    drawDebugInfo() {
        if (!this.behaviorState) return;
        
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        
        // State color coding
        const stateColors = {
            'foraging': '#90EE90',    // Light Green
            'hunting': '#FFA500',     // Orange  
            'feeding': '#87CEEB'      // Sky Blue
        };
        
        const stateColor = stateColors[this.behaviorState] || '#FFFFFF';
        
        // Draw behavior state text
        ctx.fillStyle = stateColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.behaviorState.toUpperCase(), this.x, this.y - 20);
        
        // Draw food consumption counter
        if (this.foodConsumed !== undefined && this.poopThreshold !== undefined) {
            ctx.font = '8px Arial';
            ctx.fillStyle = 'rgba(139, 69, 19, 0.8)'; // Brown color for poop indicator
            ctx.fillText(`${this.foodConsumed}/${this.poopThreshold}`, this.x, this.y + 25);
        }
        
        // Draw energy bar
        const barWidth = 20;
        const barHeight = 3;
        const energyPercent = (this.energy || 50) / 100;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - barWidth/2, this.y - 15, barWidth, barHeight);
        
        // Energy bar
        ctx.fillStyle = energyPercent > 0.5 ? '#00FF00' : '#FFFF00';
        ctx.fillRect(this.x - barWidth/2, this.y - 15, barWidth * energyPercent, barHeight);
        
        // Draw feeding timer bar when feeding
        if (this.behaviorState === 'feeding' && this.feedingTimer !== undefined) {
            const feedingPercent = this.feedingTimer / this.feedingDuration;
            const timerBarY = this.y - 11;
            
            // Timer background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - barWidth/2, timerBarY, barWidth, barHeight);
            
            // Timer bar (sky blue to match feeding color)
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(this.x - barWidth/2, timerBarY, barWidth * feedingPercent, barHeight);
        }
        
        // Draw detection radius when hunting
        if (this.behaviorState === 'hunting') {
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 120, 0, Math.PI * 2); // Increased by 50% (was 80)
            ctx.stroke();
        }
        
        // Draw hunt target line
        if (this.huntTarget) {
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.huntTarget.x, this.huntTarget.y);
            ctx.stroke();
            
            // Target indicator
            ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(this.huntTarget.x, this.huntTarget.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Export for global access
window.Boid = Boid; 