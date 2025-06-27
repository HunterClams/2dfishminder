// Boid Feeding System Module
class BoidFeedingSystem {
    constructor() {
        this.config = window.BoidConfig || {};
    }

    checkForFood(boid, krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return false;
        
        // Initialize behavior state if not present
        if (!boid.behaviorState) {
            boid.behaviorState = 'foraging';
            boid.lastEatTime = 0;
            boid.huntTarget = null;
            boid.feedingTimer = 0;
            boid.feedingDuration = this.config.BEHAVIOR_CONFIG?.feedingDuration || 3000;
            boid.foodConsumed = 0;
            boid.poopThreshold = this.getPoopThreshold();
        }
        
        // Handle feeding state - update timer and prevent eating but allow normal movement
        if (boid.behaviorState === 'feeding') {
            boid.feedingTimer += 16; // Approximate frame time
            if (boid.feedingTimer >= boid.feedingDuration) {
                boid.behaviorState = 'foraging';
                boid.feedingTimer = 0;
            } else {
                // Still feeding - cannot eat food during feeding cooldown but can move normally
                return false; // Exit early - no eating allowed during feeding state
            }
        }
        
        // Handle feeding cooldown state - prevent hunting after laying eggs
        if (boid.behaviorState === 'feeding_cooldown') {
            // Cannot hunt or eat during feeding cooldown but can move normally
            return false; // Exit early - no hunting allowed during feeding cooldown
        }
        
        // Handle spawning state - prevent eating but allow normal movement
        if (boid.behaviorState === 'spawning') {
            // Cannot eat food during spawning state but can move normally
            return false; // Exit early - no eating allowed during spawning state
        }
        
        // Check all food types that small fry can eat
        const foodSources = this.getFoodSources(gameEntities);
        
        let closestFood = null;
        let closestDistance = Infinity;
        
        // Find closest food
        for (let foodSource of foodSources) {
            if (!foodSource.array || foodSource.array.length === 0) continue;
            
            for (let i = foodSource.array.length - 1; i >= 0; i--) {
                const food = foodSource.array[i];
                
                // Check if this fry type can eat this food type
                if (window.shouldIgnorePrey && !window.shouldIgnorePrey(boid.fishType, foodSource.name, this.config.FISH_TYPES)) {
                    const distance = Math.sqrt((boid.x - food.x) ** 2 + (boid.y - food.y) ** 2);
                    
                    // Check if within eating range
                    if (distance < foodSource.range) {
                        // Eat the food immediately
                        this.eatFood(boid, food, foodSource, i);
                        return true; // Return true to indicate food was eaten
                    }
                    
                    // Track closest food for hunting behavior
                    const detectionRange = this.config.BEHAVIOR_CONFIG?.detectionRange || 120;
                    if (distance < closestDistance && distance < detectionRange) {
                        closestFood = { food, source: foodSource, distance, index: i };
                        closestDistance = distance;
                    }
                }
            }
        }
        
        // Update behavior state based on food availability (only if not feeding or spawning)
        if (boid.behaviorState !== 'feeding' && boid.behaviorState !== 'spawning') {
            if (closestFood) {
                boid.behaviorState = 'hunting';
                boid.huntTarget = closestFood.food;
                
                // Apply seeking force toward closest food
                const seekForce = this.calculateSeekForce(boid, closestFood.food);
                boid.velocity.x += seekForce.x * 0.8;
                boid.velocity.y += seekForce.y * 0.8;
            } else {
                boid.behaviorState = 'foraging';
                boid.huntTarget = null;
            }
        } else {
            // During feeding or spawning state, clear hunt target but keep state
            boid.huntTarget = null;
        }
        
        return false; // No food was eaten this frame
    }

    getFoodSources(gameEntities) {
        const foodConfig = this.config.FOOD_SOURCES || {};
        
        return [
            // Krill types with corrected food values
            { array: gameEntities.krill, name: 'krill', energyGain: foodConfig.krill?.energyGain || 15, range: foodConfig.krill?.range || 25, foodValue: foodConfig.krill?.foodValue || 3 },
            { array: gameEntities.paleKrill, name: 'paleKrill', energyGain: foodConfig.paleKrill?.energyGain || 12, range: foodConfig.paleKrill?.range || 25, foodValue: foodConfig.paleKrill?.foodValue || 2 },
            { array: gameEntities.momKrill, name: 'momKrill', energyGain: foodConfig.momKrill?.energyGain || 20, range: gameEntities.momKrill?.range || 25, foodValue: foodConfig.momKrill?.foodValue || 6 },
            // Fish food - same as regular krill
            { array: gameEntities.fishFood, name: 'fishFood', energyGain: foodConfig.fishFood?.energyGain || 10, range: foodConfig.fishFood?.range || 20, foodValue: foodConfig.fishFood?.foodValue || 3 },
            // Fertilized eggs - high nutrition value
            { array: gameEntities.fertilizedEggs, name: 'fertilizedEggs', energyGain: foodConfig.fertilizedEggs?.energyGain || 25, range: foodConfig.fertilizedEggs?.range || 25, foodValue: foodConfig.fertilizedEggs?.foodValue || 5 },
            // Sperm - can be eaten by truefry
            { array: gameEntities.sperm, name: 'sperm', energyGain: foodConfig.sperm?.energyGain || 8, range: foodConfig.sperm?.range || 20, foodValue: foodConfig.sperm?.foodValue || 2 },
            // Poop (aged poop only - state 2 and 3) - different values for fry vs tuna poop
            { array: gameEntities.poop?.filter(p => p.state >= 2) || [], name: 'poop', energyGain: foodConfig.poop?.energyGain || 8, range: foodConfig.poop?.range || 22, foodValue: 'variable' }
        ];
    }

    eatFood(boid, food, foodSource, index) {
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
                    boid.x + (Math.random() - 0.5) * 15,
                    boid.y + (Math.random() - 0.5) * 15
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
        boid.foodConsumed += actualFoodValue;
        
        // Check if fry should poop based on food accumulation (6-8 food system)
        if (boid.foodConsumed >= boid.poopThreshold && window.gameEntities && window.gameEntities.poop && window.Poop) {
            // Create poop
            window.gameEntities.poop.push(new window.Poop(boid.x, boid.y, 'regular'));
            
            // Reset food counter and set new threshold
            boid.foodConsumed = 0;
            boid.poopThreshold = this.getPoopThreshold();
            
            // Enter feeding state AFTER pooping, not after eating
            boid.behaviorState = 'feeding';
            boid.feedingTimer = 0; // Reset feeding timer for 3-second feeding state
        }
        
        // Restore energy based on food type
        boid.energy = Math.min(100, boid.energy + foodSource.energyGain);
        boid.lastEatTime = Date.now();
    }

    calculateSeekForce(boid, target) {
        const desired = {
            x: target.x - boid.x,
            y: target.y - boid.y
        };
        
        const mag = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        if (mag > 0) {
            desired.x = (desired.x / mag) * boid.maxSpeed;
            desired.y = (desired.y / mag) * boid.maxSpeed;
        }
        
        return {
            x: desired.x - boid.velocity.x,
            y: desired.y - boid.velocity.y
        };
    }

    getPoopThreshold() {
        const config = this.config.BEHAVIOR_CONFIG?.poopThreshold || { min: 6, max: 8 };
        return config.min + Math.floor(Math.random() * (config.max - config.min + 1));
    }
}

// Export for global access
window.BoidFeedingSystem = BoidFeedingSystem; 