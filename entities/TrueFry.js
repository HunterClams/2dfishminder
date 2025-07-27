// TrueFry System - Two-stage fry evolution following krill pattern
// TrueFry1 → TrueFry2 → SmallFry4 (regular fry)

class TrueFry1 extends Boid {
    constructor(x, y, velocity = null) {
        // Call parent constructor with fish type
        super('truefry1');
        
        // Override spawn position if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        
        // Override velocity if provided
        if (velocity) {
            this.velocity = velocity;
        }
        
        // TrueFry1 specific properties (override Boid defaults)
        this.size = 12; // Reduced by 6px from 18px
        this.maxSpeed = 3.0;
        this.maxForce = 0.06;
        this.frameSpeed = 0.1;
        
        // Enhanced schooling (slightly increased swarm tendencies)
        this.cohesionRadius = 90; // Slightly larger than regular fry
        this.alignmentRadius = 70; // Slightly larger than regular fry
        this.separationRadius = 30; // Slightly tighter than regular fry
        this.schoolingUrge = 1.2; // Enhanced schooling urge
        
        // Evolution properties
        this.evolutionTimer = 0;
        this.evolutionDuration = 7000; // 7 seconds
        this.hasEatenThisStage = 0; // Track count of food eaten, not boolean
        this.canTransform = true;
        
        // Energy and nutrition
        this.energy = 100;
        this.nutritionLevel = 0.6;
        this.hunger = Math.random() * 0.5;
        
        // TrueFry specific feeding properties
        this.lastEatTime = 0;
        this.eatCooldown = 1000; // 1 second cooldown between eating
        this.canEat = true;
        
        // Prevent spawning state (TrueFry cannot enter spawning)
        this.canSpawn = false;
        this.behaviorState = 'foraging'; // Start in foraging state
        
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.logEntityCreated('TRUEFRY', 'TrueFry1', this.x, this.y);
        }
    }
    
    update(boids, predators, food, krill = [], poop = [], fertilizedEggs = []) {
        // Re-enable flocking and feeding systems
        this.flock(boids, predators, food, krill);
        this.checkForFood(krill, food, poop, fertilizedEggs);
        this.move();
        this.edges();
        
        // Update evolution timer (cap at evolutionDuration to prevent going over 100%)
        this.evolutionTimer = Math.min(this.evolutionTimer + 16, this.evolutionDuration);
        
        // Update eating cooldown
        if (!this.canEat) {
            const currentTime = Date.now();
            if (currentTime - this.lastEatTime >= this.eatCooldown) {
                this.canEat = true;
            }
        }
        
        // Let the TrueFryTransformationSystem handle evolution logic
        // This class only updates the timer and sets flags
    }
    
    // Override food consumption to trigger evolution with 1-second cooldown
    consumeFood(food) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Call parent method for basic food consumption
        super.consumeFood(food);
        
        // TrueFry specific progression
        this.hasEatenThisStage++;
        this.lastEatTime = Date.now();
        this.canEat = false; // Start cooldown
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 TrueFry1 ate food! Progress: ${this.hasEatenThisStage}/1 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
        }
        
        return true;
    }
    
    consumePoop(poop, poopArray, index) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Call parent method for basic poop consumption
        super.consumePoop(poop, poopArray, index);
        
        // TrueFry specific progression
        this.hasEatenThisStage++;
        this.lastEatTime = Date.now();
        this.canEat = false; // Start cooldown
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 TrueFry1 ate poop! Progress: ${this.hasEatenThisStage}/1 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
        }
        
        return true;
    }
    
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Use parent method but with TrueFry specific food sources
        // TrueFry should NOT eat fertilized eggs - they are future fry!
        const foodSources = [
            { array: krillArray, name: 'krill', range: 25 },
            { array: fishFoodArray, name: 'fishFood', range: 20 },
            { array: poopArray.filter(p => p.state >= 2), name: 'poop', range: 22 }
            // Removed fertilizedEggsArray - TrueFry should not eat fertilized eggs
        ];
        
        let closestFood = null;
        let closestDistance = Infinity;
        
        // Find closest food
        for (let foodSource of foodSources) {
            if (!foodSource.array || foodSource.array.length === 0) continue;
            
            for (let i = foodSource.array.length - 1; i >= 0; i--) {
                const food = foodSource.array[i];
                const distance = Math.sqrt((this.x - food.x) ** 2 + (this.y - food.y) ** 2);
                
                // Check if within eating range
                if (distance < foodSource.range) {
                    // Eat the food immediately
                    if (foodSource.name === 'krill') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    } else if (foodSource.name === 'fishFood') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    } else if (foodSource.name === 'poop') {
                        this.consumePoop(food, poopArray, poopArray.indexOf(food));
                    }
                    // Removed fertilizedEggs eating - TrueFry should not eat fertilized eggs
                    return true;
                }
                
                // Track closest food for hunting behavior
                if (distance < closestDistance && distance < 120) {
                    closestFood = { food, source: foodSource, distance, index: i };
                    closestDistance = distance;
                }
            }
        }
        
        // Update behavior state based on food availability
        if (closestFood) {
            this.behaviorState = 'hunting';
            this.huntTarget = closestFood.food;
            
            // Apply seeking force toward closest food (use proper steering)
            const seekForce = this.calculateSeekForce(closestFood.food);
            // Apply steering force instead of directly modifying velocity
            this.acceleration.x += seekForce.x * 0.5; // Reduced force multiplier
            this.acceleration.y += seekForce.y * 0.5;
        } else {
            // No food nearby - return to normal flocking behavior
            this.behaviorState = 'foraging';
            this.huntTarget = null;
            // Don't apply any additional forces - let flocking handle movement
        }
        
        return false;
    }
    
    calculateSeekForce(target) {
        const desired = {
            x: target.x - this.x,
            y: target.y - this.y
        };
        
        const mag = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        if (mag > 0) {
            desired.x = (desired.x / mag) * this.maxSpeed;
            desired.y = (desired.y / mag) * this.maxSpeed;
        }
        
        return {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const sprites = window.sprites || {};
        
        // Use the same sprite allocation as regular fry
        const sprite = sprites[this.fishType];
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            // Fallback circle if sprite not found
            this.drawFallback();
            return;
        }
        
        // Use the same angle calculation as regular fry
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        // Calculate depth-based opacity and tint
        const depthFactor = window.Utils?.getDepthFactor ? window.Utils.getDepthFactor(this.y) : 1;
        const opacity = window.Utils?.getDepthOpacity ? window.Utils.getDepthOpacity(this.y, 0.8) : 0.8;
        const tint = window.Utils?.getDepthTint ? window.Utils.getDepthTint(this.y) : { r: 1, g: 1, b: 1 };
        
        // Use enhanced rendering with deep water shader
        this.drawWithDeepWaterShader(sprite, this.size, opacity, this.angle, depthFactor);
        
        // Draw debug info if enabled
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawWithDeepWaterShader(sprite, size, opacity, angle, tintStrength) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Save context state
        ctx.save();
        
        // Apply camera transform
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Apply depth-based tinting
        const tintIntensity = Math.max(0.3, 1 - tintStrength * 0.7);
        ctx.filter = `brightness(${tintIntensity}) saturate(${0.8 + tintStrength * 0.2})`;
        
        // Draw sprite with size and opacity
        const drawSize = size * 0.8; // Slightly smaller than regular fry
        ctx.globalAlpha = opacity;
        ctx.drawImage(sprite, -drawSize/2, -drawSize/2, drawSize, drawSize);
        
        // Add TrueFry-specific visual effects
        if (this.behaviorState === 'hunting') {
            // Add hunting indicator
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, drawSize * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Restore context state
        ctx.restore();
    }
    
    drawFallback() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw TrueFry as a distinctive shape
        ctx.fillStyle = '#FFB6C1'; // Light pink for TrueFry
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 2;
        
        const size = this.size * 0.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, size/2, size/3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add TrueFry indicator
        ctx.fillStyle = '#FF1493';
        ctx.beginPath();
        ctx.arc(size/3, -size/4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.fillStyle = 'rgba(255, 182, 193, 0.8)';
        ctx.font = '10px Arial';
        ctx.fillText(`TF1: ${this.hasEatenThisStage}/1`, this.x + 15, this.y - 10);
        ctx.fillText(`${Math.round(this.evolutionTimer/this.evolutionDuration*100)}%`, this.x + 15, this.y);
        ctx.restore();
    }
}

class TrueFry2 extends Boid {
    constructor(x, y, velocity = null) {
        // Call parent constructor with fish type
        super('truefry2');
        
        // Override spawn position if provided
        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
        }
        
        // Override velocity if provided
        if (velocity) {
            this.velocity = velocity;
        }
        
        // TrueFry2 specific properties (larger than TrueFry1)
        this.size = 18; // Increased from 12px to 18px
        this.maxSpeed = 3.2;
        this.maxForce = 0.07;
        this.frameSpeed = 0.12;
        
        // Enhanced schooling (stronger swarm tendencies)
        this.cohesionRadius = 100; // Larger than TrueFry1
        this.alignmentRadius = 80; // Larger than TrueFry1
        this.separationRadius = 35; // Slightly larger than TrueFry1
        this.schoolingUrge = 1.4; // Stronger schooling urge
        
        // Evolution properties
        this.evolutionTimer = 0;
        this.evolutionDuration = 10000; // 10 seconds
        this.hasEatenThisStage = 0; // Track count of food eaten, not boolean
        this.canTransform = true;
        
        // Energy and nutrition
        this.energy = 120;
        this.nutritionLevel = 0.7;
        this.hunger = Math.random() * 0.4;
        
        // TrueFry specific feeding properties
        this.lastEatTime = 0;
        this.eatCooldown = 800; // 0.8 second cooldown between eating
        this.canEat = true;
        
        // Prevent spawning state (TrueFry cannot enter spawning)
        this.canSpawn = false;
        this.behaviorState = 'foraging'; // Start in foraging state
        
        if (window.ConsoleDebugSystem) {
            window.ConsoleDebugSystem.logEntityCreated('TRUEFRY', 'TrueFry2', this.x, this.y);
        }
    }
    
    update(boids, predators, food, krill = [], poop = [], fertilizedEggs = []) {
        // Re-enable flocking and feeding systems
        this.flock(boids, predators, food, krill);
        this.checkForFood(krill, food, poop, fertilizedEggs);
        this.move();
        this.edges();
        
        // Update evolution timer (cap at evolutionDuration to prevent going over 100%)
        this.evolutionTimer = Math.min(this.evolutionTimer + 16, this.evolutionDuration);
        
        // Update eating cooldown
        if (!this.canEat) {
            const currentTime = Date.now();
            if (currentTime - this.lastEatTime >= this.eatCooldown) {
                this.canEat = true;
            }
        }
        
        // Let the TrueFryTransformationSystem handle evolution logic
        // This class only updates the timer and sets flags
    }
    
    // Override food consumption to trigger evolution with 0.8-second cooldown
    consumeFood(food) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Call parent method for basic food consumption
        super.consumeFood(food);
        
        // TrueFry specific progression
        this.hasEatenThisStage++;
        this.lastEatTime = Date.now();
        this.canEat = false; // Start cooldown
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 TrueFry2 ate food! Progress: ${this.hasEatenThisStage}/2 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
        }
        
        return true;
    }
    
    consumePoop(poop, poopArray, index) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Call parent method for basic poop consumption
        super.consumePoop(poop, poopArray, index);
        
        // TrueFry specific progression
        this.hasEatenThisStage++;
        this.lastEatTime = Date.now();
        this.canEat = false; // Start cooldown
        
        if (window.gameState?.fryDebug) {
            console.log(`🐟 TrueFry2 ate poop! Progress: ${this.hasEatenThisStage}/2 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
        }
        
        return true;
    }
    
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Use parent method but with TrueFry specific food sources
        // TrueFry should NOT eat fertilized eggs - they are future fry!
        const foodSources = [
            { array: krillArray, name: 'krill', range: 25 },
            { array: fishFoodArray, name: 'fishFood', range: 20 },
            { array: poopArray.filter(p => p.state >= 2), name: 'poop', range: 22 }
            // Removed fertilizedEggsArray - TrueFry should not eat fertilized eggs
        ];
        
        let closestFood = null;
        let closestDistance = Infinity;
        
        // Find closest food
        for (let foodSource of foodSources) {
            if (!foodSource.array || foodSource.array.length === 0) continue;
            
            for (let i = foodSource.array.length - 1; i >= 0; i--) {
                const food = foodSource.array[i];
                const distance = Math.sqrt((this.x - food.x) ** 2 + (this.y - food.y) ** 2);
                
                // Check if within eating range
                if (distance < foodSource.range) {
                    // Eat the food immediately
                    if (foodSource.name === 'krill') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    } else if (foodSource.name === 'fishFood') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    } else if (foodSource.name === 'poop') {
                        this.consumePoop(food, poopArray, poopArray.indexOf(food));
                    }
                    // Removed fertilizedEggs eating - TrueFry should not eat fertilized eggs
                    return true;
                }
                
                // Track closest food for hunting behavior
                if (distance < closestDistance && distance < 120) {
                    closestFood = { food, source: foodSource, distance, index: i };
                    closestDistance = distance;
                }
            }
        }
        
        // Update behavior state based on food availability
        if (closestFood) {
            this.behaviorState = 'hunting';
            this.huntTarget = closestFood.food;
            
            // Apply seeking force toward closest food (use proper steering)
            const seekForce = this.calculateSeekForce(closestFood.food);
            // Apply steering force instead of directly modifying velocity
            this.acceleration.x += seekForce.x * 0.5; // Reduced force multiplier
            this.acceleration.y += seekForce.y * 0.5;
        } else {
            // No food nearby - return to normal flocking behavior
            this.behaviorState = 'foraging';
            this.huntTarget = null;
            // Don't apply any additional forces - let flocking handle movement
        }
        
        return false;
    }
    
    calculateSeekForce(target) {
        const desired = {
            x: target.x - this.x,
            y: target.y - this.y
        };
        
        const mag = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        if (mag > 0) {
            desired.x = (desired.x / mag) * this.maxSpeed;
            desired.y = (desired.y / mag) * this.maxSpeed;
        }
        
        return {
            x: desired.x - this.velocity.x,
            y: desired.y - this.velocity.y
        };
    }
    
    draw() {
        if (!window.Utils?.inRenderDistance(this)) return;
        
        const sprites = window.sprites || {};
        
        // Use the same sprite allocation as regular fry
        const sprite = sprites[this.fishType];
        if (!sprite || !(sprite instanceof HTMLImageElement) || !sprite.complete || sprite.naturalWidth === 0) {
            // Fallback circle if sprite not found
            this.drawFallback();
            return;
        }
        
        // Use the same angle calculation as regular fry
        this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        
        // Calculate depth-based opacity and tint
        const depthFactor = window.Utils?.getDepthFactor ? window.Utils.getDepthFactor(this.y) : 1;
        const opacity = window.Utils?.getDepthOpacity ? window.Utils.getDepthOpacity(this.y, 0.8) : 0.8;
        const tint = window.Utils?.getDepthTint ? window.Utils.getDepthTint(this.y) : { r: 1, g: 1, b: 1 };
        
        // Use enhanced rendering with deep water shader
        this.drawWithDeepWaterShader(sprite, this.size, opacity, this.angle, depthFactor);
        
        // Draw debug info if enabled
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawWithDeepWaterShader(sprite, size, opacity, angle, tintStrength) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Save context state
        ctx.save();
        
        // Apply camera transform
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        
        // Apply depth-based tinting
        const tintIntensity = Math.max(0.3, 1 - tintStrength * 0.7);
        ctx.filter = `brightness(${tintIntensity}) saturate(${0.8 + tintStrength * 0.2})`;
        
        // Draw sprite with size and opacity
        const drawSize = size * 0.9; // Larger than TrueFry1
        ctx.globalAlpha = opacity;
        ctx.drawImage(sprite, -drawSize/2, -drawSize/2, drawSize, drawSize);
        
        // Add TrueFry-specific visual effects
        if (this.behaviorState === 'hunting') {
            // Add hunting indicator
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, drawSize * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Restore context state
        ctx.restore();
    }
    
    drawFallback() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw TrueFry2 as a distinctive shape
        ctx.fillStyle = '#DDA0DD'; // Plum color for TrueFry2
        ctx.strokeStyle = '#9932CC';
        ctx.lineWidth = 2;
        
        const size = this.size * 0.9;
        ctx.beginPath();
        ctx.ellipse(0, 0, size/2, size/3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add TrueFry2 indicator (two dots)
        ctx.fillStyle = '#8A2BE2';
        ctx.beginPath();
        ctx.arc(size/3, -size/4, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(size/3, size/4, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.fillStyle = 'rgba(221, 160, 221, 0.8)';
        ctx.font = '10px Arial';
        ctx.fillText(`TF2: ${this.hasEatenThisStage}/2`, this.x + 15, this.y - 10);
        ctx.fillText(`${Math.round(this.evolutionTimer/this.evolutionDuration*100)}%`, this.x + 15, this.y);
        ctx.restore();
    }
}

// Make classes globally accessible
window.TrueFry1 = TrueFry1;
window.TrueFry2 = TrueFry2; 