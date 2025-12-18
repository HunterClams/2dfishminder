// Boid Feeding System Module
class BoidFeedingSystem {
    constructor() {
        this.config = window.BoidConfig || {};
    }

    checkForFood(boid, krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        const gameEntities = window.gameEntities;
        if (!gameEntities) return false;
        
        // Initialize behavior state and properties if not present
        if (!boid.behaviorState) {
            boid.behaviorState = 'foraging';
        }
        if (boid.lastEatTime === undefined) {
            boid.lastEatTime = 0;
        }
        if (boid.huntTarget === undefined) {
            boid.huntTarget = null;
        }
        if (boid.feedingTimer === undefined) {
            boid.feedingTimer = 0;
        }
        if (boid.feedingDuration === undefined) {
            boid.feedingDuration = this.config.BEHAVIOR_CONFIG?.feedingDuration || 8000;
        }
        // CRITICAL: Always ensure foodConsumed and poopThreshold are initialized
        if (boid.foodConsumed === undefined) {
            boid.foodConsumed = 0;
        }
        if (boid.poopThreshold === undefined) {
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
        
        // Handle spawning cooldown state - prevent hunting after spawning
        if (boid.behaviorState === 'spawning_cooldown') {
            // Cannot hunt or eat during spawning cooldown but can move normally
            return false; // Exit early - no hunting allowed during spawning cooldown
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
                        // Eat the food immediately (this may set state to 'feeding' if threshold reached)
                        this.eatFood(boid, food, foodSource, i);
                        // Return early - don't continue checking other food or changing state
                        // This preserves the 'feeding' state if eatFood set it
                        return true; // Return true to indicate food was eaten
                    }
                    
                    // Track closest food for hunting behavior (only if not in eating range)
                    const detectionRange = this.config.BEHAVIOR_CONFIG?.detectionRange || 120;
                    if (distance < closestDistance && distance < detectionRange) {
                        closestFood = { food, source: foodSource, distance, index: i };
                        closestDistance = distance;
                    }
                }
            }
        }
        
        // Update behavior state based on food availability
        // CRITICAL: Exclude feeding, spawning, and fleeing states (fleeing has priority, feeding/spawning are locked states)
        if (boid.behaviorState !== 'feeding' && 
            boid.behaviorState !== 'spawning' && 
            boid.behaviorState !== 'fleeing') {
            if (closestFood) {
                boid.behaviorState = 'hunting';
                boid.huntTarget = closestFood.food;
                
                // Apply seeking force toward closest food (like original working version)
                const seekForce = this.calculateSeekForce(boid, closestFood.food);
                boid.velocity.x += seekForce.x * 0.8;
                boid.velocity.y += seekForce.y * 0.8;
            } else {
                // No food nearby - return to normal flocking behavior
                boid.behaviorState = 'foraging';
                boid.huntTarget = null;
                // Don't apply any additional forces - let flocking handle movement
            }
        } else {
            // During feeding, spawning, or fleeing state, clear hunt target but keep state
            // Don't override these states - they have specific logic elsewhere
            boid.huntTarget = null;
        }
        
        return false; // No food was eaten this frame
    }

    getFoodSources(gameEntities) {
        const foodConfig = this.config.FOOD_SOURCES || {};
        
        // Base food sources that all fry can eat (eggs removed - fry cannot eat eggs)
        const baseFoodSources = [
            // Krill types with corrected food values
            { array: gameEntities.krill, name: 'krill', energyGain: foodConfig.krill?.energyGain || 15, range: foodConfig.krill?.range || 25, foodValue: foodConfig.krill?.foodValue || 3 },
            { array: gameEntities.paleKrill, name: 'paleKrill', energyGain: foodConfig.paleKrill?.energyGain || 12, range: foodConfig.paleKrill?.range || 25, foodValue: foodConfig.paleKrill?.foodValue || 2 },
            { array: gameEntities.momKrill, name: 'momKrill', energyGain: foodConfig.momKrill?.energyGain || 20, range: gameEntities.momKrill?.range || 25, foodValue: foodConfig.momKrill?.foodValue || 6 },
            // Fish food - same as regular krill
            { array: gameEntities.fishFood, name: 'fishFood', energyGain: foodConfig.fishFood?.energyGain || 10, range: foodConfig.fishFood?.range || 20, foodValue: foodConfig.fishFood?.foodValue || 3 },
            // Poop (aged poop only - state 2 and 3) - different values for fry vs tuna poop
            { array: gameEntities.poop?.filter(p => p.state >= 2) || [], name: 'poop', energyGain: foodConfig.poop?.energyGain || 8, range: foodConfig.poop?.range || 22, foodValue: 'variable' }
        ];
        
        // Eggs removed - all fry types cannot eat eggs
        return baseFoodSources;
    }

    eatFood(boid, food, foodSource, index) {
        // Special handling for swarm krill (krill1-3 sprites)
        // When swarm krill is eaten, convert it to lone krill instead of removing it
        if (foodSource.name === 'krill' && food && food.isSwarmKrill === true) {
            // Convert swarm krill to lone krill
            if (food.convertToLoneKrill && food.convertToLoneKrill()) {
                // Krill converted to lone krill - don't remove from array
                // Fry still gets nutrition below, just like normal eating
                if (window.gameState?.fryDebug) {
                    console.log(`🦐 Swarm krill converted to lone krill after being eaten by ${boid.constructor.name}`);
                }
            } else {
                // Conversion failed or already lone krill - remove normally
                foodSource.array.splice(index, 1);
            }
        } else if (foodSource.name === 'poop') {
            // For poop, find and remove from main poop array
            const poopIndex = window.gameEntities.poop.indexOf(food);
            if (poopIndex !== -1) {
                window.gameEntities.poop.splice(poopIndex, 1);
            }
        } else {
            // Normal removal for other food types
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
        
        // CRITICAL: Always ensure counters are initialized (not just on first checkForFood call)
        if (boid.foodConsumed === undefined || boid.foodConsumed === null) {
            boid.foodConsumed = 0;
        }
        if (boid.poopThreshold === undefined || boid.poopThreshold === null || boid.poopThreshold <= 0) {
            boid.poopThreshold = this.getPoopThreshold();
        }
        
        // Increment food consumed
        boid.foodConsumed += actualFoodValue;
        
        // Check if fry should poop based on food accumulation (1-2 food system)
        // CRITICAL: This check MUST work - it's how fry enter feeding state
        const shouldPoop = boid.foodConsumed >= boid.poopThreshold;
        
        if (shouldPoop && window.gameEntities && window.gameEntities.poop && window.Poop) {
            // Create poop
            window.gameEntities.poop.push(new window.Poop(boid.x, boid.y, 'regular'));
            
            // Reset food counter and set new threshold
            boid.foodConsumed = 0;
            boid.poopThreshold = this.getPoopThreshold();
            
            // CRITICAL: Enter feeding state AFTER pooping
            // This state MUST be set and preserved - spawning systems depend on it
            // This is the PRIMARY way fry enter feeding state
            boid.behaviorState = 'feeding';
            boid.feedingTimer = 0; // Reset feeding timer to start the feeding duration
            
            // Debug logging to verify state is being set
            if (window.gameState?.fryDebug) {
                console.log(`🐟 Fry ${boid.fishType || 'unknown'} entered FEEDING state after pooping at (${Math.round(boid.x)}, ${Math.round(boid.y)}), threshold was ${boid.poopThreshold}`);
            }
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
        // Make fry poop very frequently - only 1-2 food items
        return 1 + Math.floor(Math.random() * 2); // 1-2 food items for frequent feeding states
    }

    getFeedingStateDuration() {
        // Increase feeding state duration to 8 seconds for more egg laying opportunities
        return 8000; // 8 seconds instead of 3
    }
}

// Export for global access
window.BoidFeedingSystem = BoidFeedingSystem; 