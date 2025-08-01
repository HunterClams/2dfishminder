// Krill Transformation System - Centralized transformation management
// Handles all krill lifecycle transformations: Regular → Mom, Pale → Regular, Mom → Regular

class KrillTransformationSystem {
    constructor() {
        this.config = {
            // Transformation requirements
            REGULAR_TO_MOM: {
                foodRequired: 1, // Any food triggers transformation
                poopRequired: 1   // Any poop triggers transformation
            },
            PALE_TO_REGULAR: {
                foodRequired: 1, // Any food triggers transformation
                timeRequired: 30000 // 30 seconds maturation time
            },
            MOM_TO_REGULAR: {
                maxOffspring: 3,
                maxBatches: 3
            }
        };
    }
    
    // Check if krill should transform
    checkTransformation(krill) {
        const krillType = this.getKrillType(krill);
        
        switch (krillType) {
            case 'regular':
                return this.checkRegularToMom(krill);
            case 'pale':
                return this.checkPaleToRegular(krill);
            case 'mom':
                return this.checkMomToRegular(krill);
            default:
                return { shouldTransform: false };
        }
    }
    
    // Get krill type based on constructor or properties
    getKrillType(krill) {
        if (krill.constructor.name === 'PaleKrill') {
            return 'pale';
        } else if (krill.constructor.name === 'MomKrill') {
            return 'mom';
        } else {
            return 'regular';
        }
    }
    
    // Check if regular krill should become mom krill
    checkRegularToMom(krill) {
        // Simplified: any food consumption triggers transformation
        if (krill.shouldTransform && krill.transformTo === 'momKrill') {
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Regular krill ready to transform to MomKrill (Food consumed: ${krill.foodConsumed})`);
            }
            return {
                shouldTransform: true,
                transformTo: 'momKrill',
                x: krill.x,
                y: krill.y,
                velocity: krill.velocity
            };
        }
        
        return { shouldTransform: false };
    }
    
    // Check if pale krill should become regular krill
    checkPaleToRegular(krill) {
        // Check if pale krill ate food (immediate transformation)
        if (krill.shouldTransform && krill.transformTo === 'regularKrill') {
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Pale krill ready to transform to RegularKrill (Food-based transformation)`);
            }
            return {
                shouldTransform: true,
                transformTo: 'regularKrill',
                x: krill.x,
                y: krill.y,
                velocity: krill.velocity
            };
        }
        
        // Time-based maturation (10 seconds = 10000ms)
        if (!krill.maturationTimer) {
            krill.maturationTimer = 0;
            krill.maturationDuration = 10000; // 10 seconds
        }
        
        krill.maturationTimer += 16; // Approximate frame time
        
        if (krill.maturationTimer >= krill.maturationDuration) {
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Pale krill ready to transform to RegularKrill (Time-based maturation)`);
            }
            return {
                shouldTransform: true,
                transformTo: 'regularKrill',
                x: krill.x,
                y: krill.y,
                velocity: krill.velocity
            };
        }
        
        return { shouldTransform: false };
    }
    
    // Check if mom krill should revert to regular krill
    checkMomToRegular(krill) {
        if (krill.offspringCount >= this.config.MOM_TO_REGULAR.maxOffspring ||
            krill.batchesProduced >= this.config.MOM_TO_REGULAR.maxBatches) {
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Mom krill ready to revert to RegularKrill (Offspring: ${krill.offspringCount}/${this.config.MOM_TO_REGULAR.maxOffspring}, Batches: ${krill.batchesProduced}/${this.config.MOM_TO_REGULAR.maxBatches})`);
            }
            return {
                shouldTransform: true,
                transformTo: 'regularKrill',
                x: krill.x,
                y: krill.y,
                velocity: krill.velocity
            };
        }
        
        return { shouldTransform: false };
    }
    
    // Execute transformation in GameEntities
    executeTransformation(gameEntities, krill, transformation) {
        if (!transformation.shouldTransform) return false;
        
        const { transformTo, x, y, velocity } = transformation;
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Attempting to create ${transformTo} at (${x}, ${y})`);
        }
        
        // Create new krill of target type FIRST
        const newKrill = this.createKrillOfType(transformTo, x, y, velocity);
        
        // Only remove old krill if new krill was created successfully
        if (newKrill) {
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Successfully created ${transformTo}, removing old krill`);
            }
            
            // Remove krill from current array
            this.removeKrillFromArray(gameEntities, krill);
            
            // Add to appropriate array
            this.addKrillToArray(gameEntities, newKrill, transformTo);
            
            if (window.gameState?.krillDebug) {
                console.log(`🦐 Krill transformation successful: ${this.getKrillType(krill)} → ${transformTo}`);
            }
            
            return true;
        } else {
            // Reset transformation flags if creation failed
            krill.shouldTransform = false;
            krill.transformTo = null;
            
            if (window.gameState?.krillDebug) {
                console.warn(`🦐 Krill transformation FAILED: could not create ${transformTo} - keeping original krill alive`);
            }
            
            return false;
        }
    }
    
    // Reset transformation flags after processing
    resetTransformationFlags(krill) {
        if (krill.shouldTransform) {
            krill.shouldTransform = false;
            krill.transformTo = null;
        }
    }
    
    // Remove krill from appropriate array
    removeKrillFromArray(gameEntities, krill) {
        const krillType = this.getKrillType(krill);
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Removing krill from ${krillType} array (current count: ${this.getArrayLength(gameEntities, krillType)})`);
        }
        
        switch (krillType) {
            case 'regular':
                const regularIndex = gameEntities.krill.indexOf(krill);
                if (regularIndex !== -1) {
                    gameEntities.krill.splice(regularIndex, 1);
                    if (window.gameState?.krillDebug) {
                        console.log(`🦐 Removed krill from regular array (new count: ${gameEntities.krill.length})`);
                    }
                } else {
                    if (window.gameState?.krillDebug) {
                        console.warn(`🦐 Krill not found in regular array!`);
                    }
                }
                break;
            case 'pale':
                const paleIndex = gameEntities.paleKrill.indexOf(krill);
                if (paleIndex !== -1) {
                    gameEntities.paleKrill.splice(paleIndex, 1);
                    if (window.gameState?.krillDebug) {
                        console.log(`🦐 Removed krill from pale array (new count: ${gameEntities.paleKrill.length})`);
                    }
                } else {
                    if (window.gameState?.krillDebug) {
                        console.warn(`🦐 Krill not found in pale array!`);
                    }
                }
                break;
            case 'mom':
                const momIndex = gameEntities.momKrill.indexOf(krill);
                if (momIndex !== -1) {
                    gameEntities.momKrill.splice(momIndex, 1);
                    if (window.gameState?.krillDebug) {
                        console.log(`🦐 Removed krill from mom array (new count: ${gameEntities.momKrill.length})`);
                    }
                } else {
                    if (window.gameState?.krillDebug) {
                        console.warn(`🦐 Krill not found in mom array!`);
                    }
                }
                break;
        }
    }
    
    // Helper method to get array length
    getArrayLength(gameEntities, krillType) {
        switch (krillType) {
            case 'regular': return gameEntities.krill.length;
            case 'pale': return gameEntities.paleKrill.length;
            case 'mom': return gameEntities.momKrill.length;
            default: return 0;
        }
    }
    
    // Create new krill of specified type
    createKrillOfType(type, x, y, velocity) {
        switch (type) {
            case 'regularKrill':
                const regularKrill = new window.Krill(x, y, velocity);
                return regularKrill;
                
            case 'momKrill':
                const momKrill = new window.MomKrill(x, y, velocity);
                return momKrill;
                
            case 'paleKrill':
                const paleKrill = new window.PaleKrill(x, y, velocity);
                return paleKrill;
                
            default:
                console.error(`Unknown krill type: ${type}`);
                return null;
        }
    }
    
    // Add krill to appropriate array
    addKrillToArray(gameEntities, krill, type) {
        if (!krill) return;
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 Adding krill to ${type} array`);
        }
        
        switch (type) {
            case 'regularKrill':
                gameEntities.krill.push(krill);
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Added to regular array (new count: ${gameEntities.krill.length})`);
                }
                break;
            case 'momKrill':
                gameEntities.momKrill.push(krill);
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Added to mom array (new count: ${gameEntities.momKrill.length})`);
                }
                break;
            case 'paleKrill':
                gameEntities.paleKrill.push(krill);
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Added to pale array (new count: ${gameEntities.paleKrill.length})`);
                }
                break;
        }
    }
    
    // Process all krill transformations in GameEntities
    processAllTransformations(gameEntities) {
        let transformationsProcessed = 0;
        
        // Process regular krill transformations
        for (let i = gameEntities.krill.length - 1; i >= 0; i--) {
            const krill = gameEntities.krill[i];
            const transformation = this.checkTransformation(krill);
            if (transformation.shouldTransform) {
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Attempting transformation: ${this.getKrillType(krill)} → ${transformation.transformTo}`);
                }
                if (this.executeTransformation(gameEntities, krill, transformation)) {
                    transformationsProcessed++;
                } else {
                    // Reset flags if transformation failed
                    this.resetTransformationFlags(krill);
                }
            }
        }
        
        // Process pale krill transformations
        for (let i = gameEntities.paleKrill.length - 1; i >= 0; i--) {
            const krill = gameEntities.paleKrill[i];
            const transformation = this.checkTransformation(krill);
            if (transformation.shouldTransform) {
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Attempting transformation: ${this.getKrillType(krill)} → ${transformation.transformTo}`);
                }
                if (this.executeTransformation(gameEntities, krill, transformation)) {
                    transformationsProcessed++;
                } else {
                    // Reset flags if transformation failed
                    this.resetTransformationFlags(krill);
                }
            }
        }
        
        // Process mom krill transformations
        for (let i = gameEntities.momKrill.length - 1; i >= 0; i--) {
            const krill = gameEntities.momKrill[i];
            const transformation = this.checkTransformation(krill);
            if (transformation.shouldTransform) {
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Attempting transformation: ${this.getKrillType(krill)} → ${transformation.transformTo}`);
                }
                if (this.executeTransformation(gameEntities, krill, transformation)) {
                    transformationsProcessed++;
                } else {
                    // Reset flags if transformation failed
                    this.resetTransformationFlags(krill);
                }
            }
        }
        
        return transformationsProcessed;
    }
}

// Create global instance
const krillTransformationSystem = new KrillTransformationSystem();

// Export for global access
if (typeof window !== 'undefined') {
    window.KrillTransformationSystem = krillTransformationSystem;
} 