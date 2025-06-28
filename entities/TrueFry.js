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
    
    // Override checkForFood to use TrueFry specific logic
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Use parent method but with TrueFry specific food sources
        const foodSources = [
            { array: krillArray, name: 'krill', range: 25 },
            { array: fishFoodArray, name: 'fishFood', range: 20 },
            { array: poopArray.filter(p => p.state >= 2), name: 'poop', range: 22 },
            { array: fertilizedEggsArray, name: 'fertilizedEggs', range: 25 }
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
                    } else if (foodSource.name === 'fertilizedEggs') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    }
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
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.5;
        
        // Apply deep water shader effects for TrueFry with 75% opacity
        const baseOpacity = window.Utils.getDepthOpacity(this.y, 0.9) * 0.75; // 75% opacity
        const tintStrength = window.Utils.getDepthTint(this.y);
        
        // Draw with deep water shader effects
        this.drawWithDeepWaterShader(sprite, this.size, baseOpacity, angle, tintStrength);
        
        // Debug info
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawWithDeepWaterShader(sprite, size, opacity, angle, tintStrength) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip sprite based on horizontal movement direction
        if (this.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided (for directional movement)
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TrueFry temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    fishType: this.fishType
                });
                ctx.restore();
                return;
            }
            
            // Apply deep water tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = opacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally with validation
            ctx.globalAlpha = opacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TrueFry main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    fishType: this.fishType
                });
            }
        }
        
        ctx.restore();
    }
    
    drawFallback() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Apply deep water shader effects to fallback drawing too with 75% opacity
        const baseOpacity = window.Utils.getDepthOpacity(this.y, 0.8) * 0.75; // 75% opacity
        const tintStrength = window.Utils.getDepthTint(this.y);
        
        ctx.save();
        ctx.globalAlpha = baseOpacity;
        
        if (tintStrength > 0) {
            // Apply blue tint for deep water effect
            ctx.fillStyle = `rgba(76, 175, 80, ${1 - tintStrength * 0.3})`; // Green with blue tint
        } else {
            ctx.fillStyle = '#4CAF50';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.fillStyle = '#4CAF50';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TRUEFRY1', this.x, this.y - this.size/2 - 10);
        
        // Show eating cooldown status
        if (!this.canEat) {
            const remainingCooldown = Math.max(0, this.eatCooldown - (Date.now() - this.lastEatTime));
            ctx.fillStyle = '#FF5722';
            ctx.fillText(`CD: ${Math.ceil(remainingCooldown/100)}s`, this.x, this.y - this.size/2 - 20);
        }
        
        // Show progression info
        ctx.fillStyle = '#2196F3';
        ctx.fillText(`Food: ${this.hasEatenThisStage}/1`, this.x, this.y + this.size/2 + 10);
        ctx.fillText(`Time: ${Math.floor(this.evolutionTimer/1000)}s`, this.x, this.y + this.size/2 + 20);
        
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
        
        // TrueFry2 specific properties (override Boid defaults)
        this.size = 20; // Slightly larger than TrueFry1
        this.maxSpeed = 3.2;
        this.maxForce = 0.07;
        this.frameSpeed = 0.12;
        
        // Enhanced schooling (slightly increased swarm tendencies)
        this.cohesionRadius = 95; // Slightly larger than TrueFry1
        this.alignmentRadius = 75; // Slightly larger than TrueFry1
        this.separationRadius = 28; // Slightly tighter than TrueFry1
        this.schoolingUrge = 1.3; // Enhanced schooling urge
        
        // Evolution properties
        this.evolutionTimer = 0;
        this.evolutionDuration = 7000; // 7 seconds
        this.hasEatenThisStage = 0; // Track count of food eaten, not boolean
        this.canTransform = true;
        
        // Energy and nutrition
        this.energy = 110;
        this.nutritionLevel = 0.7;
        this.hunger = Math.random() * 0.4;
        
        // TrueFry specific feeding properties
        this.lastEatTime = 0;
        this.eatCooldown = 1000; // 1 second cooldown between eating
        this.canEat = true;
        
        // Prevent spawning state (TrueFry2 cannot lay eggs or spawn)
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
            console.log(`🐟 TrueFry2 ate food! Progress: ${this.hasEatenThisStage}/5 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
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
            console.log(`🐟 TrueFry2 ate poop! Progress: ${this.hasEatenThisStage}/5 (${this.evolutionTimer}/${this.evolutionDuration}ms)`);
        }
        
        return true;
    }
    
    // Override checkForFood to use TrueFry specific logic
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (!this.canEat) return false; // Cannot eat during cooldown
        
        // Use parent method but with TrueFry specific food sources
        const foodSources = [
            { array: krillArray, name: 'krill', range: 25 },
            { array: fishFoodArray, name: 'fishFood', range: 20 },
            { array: poopArray.filter(p => p.state >= 2), name: 'poop', range: 22 },
            { array: fertilizedEggsArray, name: 'fertilizedEggs', range: 25 }
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
                    } else if (foodSource.name === 'fertilizedEggs') {
                        this.consumeFood(food);
                        foodSource.array.splice(i, 1);
                    }
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
        const angle = Math.atan2(this.velocity.y, Math.abs(this.velocity.x)) * 0.5;
        
        // Apply deep water shader effects for TrueFry
        const baseOpacity = window.Utils.getDepthOpacity(this.y, 0.9);
        const tintStrength = window.Utils.getDepthTint(this.y);
        
        // Draw with deep water shader effects
        this.drawWithDeepWaterShader(sprite, this.size, baseOpacity, angle, tintStrength);
        
        // Debug info
        if (window.gameState?.fryDebug) {
            this.drawDebugInfo();
        }
    }
    
    drawWithDeepWaterShader(sprite, size, opacity, angle, tintStrength) {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Flip sprite based on horizontal movement direction
        if (this.velocity.x < 0) {
            ctx.scale(-1, 1);
        }
        
        // Apply rotation if provided (for directional movement)
        if (angle !== 0) {
            ctx.rotate(angle);
        }
        
        if (tintStrength > 0) {
            // Create temporary canvas for proper transparency handling
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = size;
            tempCanvas.height = size;
            
            // Draw sprite on temp canvas with validation
            try {
                tempCtx.drawImage(sprite, 0, 0, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TrueFry temp canvas:', error, {
                    sprite: sprite,
                    size: size,
                    fishType: this.fishType
                });
                ctx.restore();
                return;
            }
            
            // Apply deep water tint using source-atop (only affects non-transparent pixels)
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(100, 150, 255, ${tintStrength})`;
            tempCtx.fillRect(0, 0, size, size);
            
            // Draw the tinted sprite to main canvas
            ctx.globalAlpha = opacity;
            ctx.drawImage(tempCanvas, -size/2, -size/2);
        } else {
            // No tint needed, draw normally with validation
            ctx.globalAlpha = opacity;
            try {
                ctx.drawImage(sprite, -size/2, -size/2, size, size);
            } catch (error) {
                console.error('🚨 drawImage error in TrueFry main canvas:', error, {
                    sprite: sprite,
                    size: size,
                    fishType: this.fishType
                });
            }
        }
        
        ctx.restore();
    }
    
    drawFallback() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        // Apply deep water shader effects to fallback drawing too
        const baseOpacity = window.Utils.getDepthOpacity(this.y, 0.8);
        const tintStrength = window.Utils.getDepthTint(this.y);
        
        ctx.save();
        ctx.globalAlpha = baseOpacity;
        
        if (tintStrength > 0) {
            // Apply blue tint for deep water effect
            ctx.fillStyle = `rgba(33, 150, 243, ${1 - tintStrength * 0.3})`; // Blue with blue tint
        } else {
            ctx.fillStyle = '#2196F3';
        }
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    drawDebugInfo() {
        const ctx = window.ctx;
        if (!ctx) return;
        
        ctx.save();
        ctx.fillStyle = '#2196F3';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TRUEFRY2', this.x, this.y - this.size/2 - 10);
        
        // Show eating cooldown status
        if (!this.canEat) {
            const remainingCooldown = Math.max(0, this.eatCooldown - (Date.now() - this.lastEatTime));
            ctx.fillStyle = '#FF5722';
            ctx.fillText(`CD: ${Math.ceil(remainingCooldown/100)}s`, this.x, this.y - this.size/2 - 20);
        }
        
        // Show progression info
        ctx.fillStyle = '#2196F3';
        ctx.fillText(`Food: ${this.hasEatenThisStage}/5`, this.x, this.y + this.size/2 + 10);
        ctx.fillText(`Time: ${Math.floor(this.evolutionTimer/1000)}s`, this.x, this.y + this.size/2 + 20);
        
        ctx.restore();
    }
}

// Export for global access
window.TrueFry1 = TrueFry1;
window.TrueFry2 = TrueFry2; 