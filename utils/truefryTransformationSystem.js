// TrueFry Transformation System - Centralized transformation management
// Handles TrueFry lifecycle transformations: TrueFry1 → TrueFry2 → SmallFry4

class TrueFryTransformationSystem {
    constructor() {
        this.config = {
            // Transformation thresholds - match the TrueFry class durations
            TRUEFRY1_TO_TRUEFRY2: {
                foodRequired: 1, // Single food item triggers evolution
                timeRequired: 7000, // 7 seconds (matches TrueFry1.evolutionDuration)
                evolutionTimer: 0
            },
            TRUEFRY2_TO_SMALLFRY4: {
                foodRequired: 5, // 5 food items required
                timeRequired: 7000, // 7 seconds (matches TrueFry2.evolutionDuration)
                evolutionTimer: 0
            }
        };
        
        // Initialize transformation tracking
        this.transformations = {
            truefry1ToTruefry2: 0,
            truefry2ToSmallFry4: 0
        };
        
        console.log('🔄 TrueFryTransformationSystem initialized');
    }
    
    update(truefry, gameEntities) {
        if (!truefry || !gameEntities) return null;
        
        let transformation = null;
        
        // Check for TrueFry1 to TrueFry2 transformation
        if (truefry.fishType === 'truefry1') {
            transformation = this.checkTrueFry1ToTrueFry2(truefry);
        }
        
        // Check for TrueFry2 to SmallFry4 transformation
        if (truefry.fishType === 'truefry2') {
            transformation = this.checkTrueFry2ToSmallFry4(truefry);
        }
        
        // If transformation is needed, execute it immediately
        if (transformation) {
            const newEntity = this.executeTransformation(truefry, gameEntities);
            if (newEntity) {
                console.log(`🔄 TrueFry transformation executed: ${truefry.fishType} → ${newEntity.fishType}`);
                return { transformation, newEntity };
            }
        }
        
        return transformation;
    }
    
    // Check if TrueFry1 should become TrueFry2
    checkTrueFry1ToTrueFry2(truefry) {
        const config = this.config.TRUEFRY1_TO_TRUEFRY2;
        
        // Food-based transformation (use entity's hasEatenThisStage count)
        if (truefry.hasEatenThisStage >= config.foodRequired) {
            truefry.shouldTransform = true;
            truefry.transformTo = 'truefry2';
            console.log(`🐟 TrueFry1 ready to transform to TrueFry2 (Food-based transformation)`);
            return {
                transformTo: 'truefry2',
                reason: 'food'
            };
        }
        
        // Time-based transformation (use entity's evolutionTimer)
        if (truefry.evolutionTimer >= config.timeRequired) {
            truefry.shouldTransform = true;
            truefry.transformTo = 'truefry2';
            console.log(`🐟 TrueFry1 ready to transform to TrueFry2 (Time-based maturation)`);
            return {
                transformTo: 'truefry2',
                reason: 'time'
            };
        }
        
        return null; // No transformation yet
    }
    
    // Check if TrueFry2 should become SmallFry4
    checkTrueFry2ToSmallFry4(truefry) {
        const config = this.config.TRUEFRY2_TO_SMALLFRY4;
        
        // Food-based transformation (use entity's hasEatenThisStage count)
        if (truefry.hasEatenThisStage >= config.foodRequired) {
            truefry.shouldTransform = true;
            truefry.transformTo = 'smallFry4';
            console.log(`🐟 TrueFry2 ready to transform to SmallFry4 (Food-based transformation)`);
            return {
                transformTo: 'smallFry4',
                reason: 'food'
            };
        }
        
        // Time-based transformation (use entity's evolutionTimer)
        if (truefry.evolutionTimer >= config.timeRequired) {
            truefry.shouldTransform = true;
            truefry.transformTo = 'smallFry4';
            console.log(`🐟 TrueFry2 ready to transform to SmallFry4 (Time-based maturation)`);
            return {
                transformTo: 'smallFry4',
                reason: 'time'
            };
        }
        
        return null; // No transformation yet
    }
    
    // Execute transformation
    executeTransformation(truefry, gameEntities) {
        if (!truefry || !gameEntities) return null;
        
        if (!truefry.shouldTransform || !truefry.transformTo) {
            return null;
        }
        
        const newType = truefry.transformTo;
        console.log(`🔄 Executing transformation: ${truefry.fishType} → ${newType}`);
        
        // Create new entity based on transformation type
        let newEntity = null;
        switch (newType) {
            case 'truefry2':
                newEntity = new window.TrueFry2(truefry.x, truefry.y, truefry.velocity);
                break;
            case 'smallFry4':
                newEntity = new window.Boid('smallFry4'); // Use existing Boid class for SmallFry4
                break;
            default:
                console.error(`❌ Unknown transformation type: ${newType}`);
                return null;
        }
        
        if (!newEntity) {
            console.error(`❌ Failed to create new entity for transformation: ${newType}`);
            return null;
        }
        
        // Copy position and velocity from original entity
        newEntity.x = truefry.x;
        newEntity.y = truefry.y;
        newEntity.velocity = { ...truefry.velocity };
        
        // Add to appropriate array based on type
        if (newType === 'smallFry4') {
            // SmallFry4 goes into the fish array
            gameEntities.fish.push(newEntity);
            console.log(`🐟 Added SmallFry4 to fish array (new count: ${gameEntities.fish.length})`);
        } else if (newType === 'truefry2') {
            // TrueFry2 goes into the fish array (same as TrueFry1) so it can be processed
            gameEntities.fish.push(newEntity);
            console.log(`🐟 Added TrueFry2 to fish array (new count: ${gameEntities.fish.length})`);
        } else {
            // Other TrueFry entities go into the truefry array
            gameEntities.truefry.push(newEntity);
            console.log(`🐟 Added ${newType} to truefry array (new count: ${gameEntities.truefry.length})`);
        }
        
        // Track transformation
        this.transformations[`${truefry.fishType}To${newType}`]++;
        
        // Log transformation statistics
        console.log(`📊 Transformation stats:`, this.transformations);
        
        return newEntity;
    }
    
    // Check if entity should be removed after transformation
    shouldRemoveAfterTransformation(type) {
        // All transformations result in the original entity being replaced
        return true;
    }
    
    // Get transformation statistics
    getTransformationStats() {
        return { ...this.transformations };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TrueFryTransformationSystem = TrueFryTransformationSystem;
} 