// Krill Lifecycle System - Manages complete krill transformation cycle
// Regular Krill → Mom Krill → Pale Krill Offspring → Mature Pale Krill → Regular Krill

class KrillLifecycleSystem {
    constructor() {
        this.config = {
            // Regular krill transformation requirements
            REGULAR_TO_MOM: {
                poopEaten: 3,
                foodConsumed: 2
            },
            
            // Pale krill maturation
            PALE_MATURATION: {
                duration: 10000, // 10 seconds (was 15 seconds)
                checkInterval: 16 // 60fps
            },
            
            // Mom krill reproduction
            MOM_REPRODUCTION: {
                offspringInterval: 5000, // 5 seconds between offspring (was 10 seconds)
                maxOffspring: 3, // Maximum offspring per mom
                maxBatches: 3, // Maximum batches per mom
                offspringCount: { min: 1, max: 2 } // Random offspring per batch
            },
            
            // Visual properties
            VISUAL: {
                paleKrill: {
                    baseOpacity: 0.7,
                    spriteFrames: ['paleKrill1', 'paleKrill2', 'paleKrill3', 'paleKrill2'],
                    size: 7,
                    maturationTime: 600, // frames to mature
                    maturationTimer: 0,
                    maxSpeed: 1.5,
                    maxForce: 0.02,
                    debugColor: '#DDA0DD' // Plum
                },
                momKrill: {
                    baseOpacity: 0.9,
                    spriteFrames: ['momKrill1', 'momKrill2', 'momKrill3', 'momKrill2'],
                    size: 9,
                    maxOffspring: 3,
                    offspringTimer: 0,
                    offspringInterval: 300, // frames between offspring
                    offspringTimerMax: 300
                }
            }
        };
    }

    // Check if regular krill should transform to mom krill
    checkRegularToMomTransformation(krill) {
        if (!krill.canTransform) return { shouldTransform: false };
        
        const requirements = this.config.REGULAR_TO_MOM;
        if (krill.poopEaten >= requirements.poopEaten && krill.foodConsumed >= requirements.foodConsumed) {
            return {
                shouldTransform: true,
                x: krill.x,
                y: krill.y,
                velocity: krill.velocity
            };
        }
        
        return { shouldTransform: false };
    }

    // Check if pale krill should mature to regular krill
    checkPaleMaturation(paleKrill) {
        if (!paleKrill.canTransform) return { shouldTransform: false };
        
        paleKrill.maturationTimer += this.config.PALE_MATURATION.checkInterval;
        
        if (paleKrill.maturationTimer >= this.config.PALE_MATURATION.duration) {
            return {
                shouldTransform: true,
                x: paleKrill.x,
                y: paleKrill.y,
                velocity: paleKrill.velocity
            };
        }
        
        return { shouldTransform: false };
    }

    // Check if mom krill should produce offspring
    checkMomOffspring(momKrill) {
        if (momKrill.offspringCount >= this.config.MOM_REPRODUCTION.maxOffspring) {
            return {
                shouldProduce: false,
                shouldRevert: true,
                offspring: []
            };
        }
        
        // Increment timer by frame time (approximately 16ms at 60fps)
        momKrill.offspringTimer += this.config.PALE_MATURATION.checkInterval;
        
        if (window.gameState?.krillDebug && momKrill.offspringTimer % 1000 < 16) {
            console.log(`🦐 MomKrill timer: ${momKrill.offspringTimer}/${momKrill.offspringInterval}ms (${(momKrill.offspringTimer/momKrill.offspringInterval*100).toFixed(1)}%)`);
        }
        
        if (momKrill.offspringTimer >= momKrill.offspringInterval) {
            // Create offspring data
            const offspring = [];
            const offspringCount = Math.random() < 0.5 ? 
                this.config.MOM_REPRODUCTION.offspringCount.min : 
                this.config.MOM_REPRODUCTION.offspringCount.max;
            
            for (let i = 0; i < offspringCount && momKrill.offspringCount < this.config.MOM_REPRODUCTION.maxOffspring; i++) {
                const offsetX = (Math.random() - 0.5) * 30;
                const offsetY = (Math.random() - 0.5) * 30;
                
                offspring.push({
                    x: momKrill.x + offsetX,
                    y: momKrill.y + offsetY,
                    velocity: {
                        x: momKrill.velocity.x * 0.5 + (Math.random() - 0.5) * 2,
                        y: momKrill.velocity.y * 0.5 + (Math.random() - 0.5) * 2
                    }
                });
                
                momKrill.offspringCount++;
            }
            
            // Reset timer and increment batch counter
            momKrill.offspringTimer = 0;
            momKrill.batchesProduced++;
            
            if (window.gameState?.krillDebug) {
                console.log(`🦐 MomKrill offspring timer triggered! Producing ${offspring.length} pale krill`);
            }
            
            return {
                shouldProduce: true,
                shouldRevert: momKrill.offspringCount >= this.config.MOM_REPRODUCTION.maxOffspring,
                offspring: offspring
            };
        }
        
        return {
            shouldProduce: false,
            shouldRevert: false,
            offspring: []
        };
    }

    // Initialize pale krill properties
    initializePaleKrill(paleKrill) {
        const visual = this.config.VISUAL.paleKrill;
        
        paleKrill.krillSize = visual.size;
        paleKrill.size = visual.size;
        paleKrill.maxSpeed = visual.maxSpeed;
        paleKrill.maxForce = visual.maxForce;
        paleKrill.spriteFrames = visual.spriteFrames;
        paleKrill.maturationTimer = 0;
        paleKrill.maturationDuration = this.config.PALE_MATURATION.duration;
        paleKrill.canTransform = true;
        
        // Start with lower energy and nutrition
        paleKrill.energy = 0.4 + Math.random() * 0.3;
        paleKrill.nutritionLevel = 0.3;
        paleKrill.hunger = Math.random() * 0.7;
    }

    // Initialize mom krill properties
    initializeMomKrill(momKrill) {
        const visual = this.config.VISUAL.momKrill;
        
        momKrill.krillSize = visual.size;
        momKrill.size = visual.size;
        momKrill.maxSpeed = visual.maxSpeed;
        momKrill.maxForce = visual.maxForce;
        momKrill.spriteFrames = visual.spriteFrames;
        momKrill.offspringTimer = 0;
        momKrill.offspringInterval = this.config.MOM_REPRODUCTION.offspringInterval;
        momKrill.maxOffspring = this.config.MOM_REPRODUCTION.maxOffspring;
        momKrill.offspringCount = 0;
        momKrill.batchesProduced = 0;
        momKrill.maxBatches = this.config.MOM_REPRODUCTION.maxBatches;
        momKrill.canTransform = false; // Mom krill don't transform further
        
        // Enhanced energy and nutrition
        momKrill.energy = 0.9 + Math.random() * 0.1;
        momKrill.nutritionLevel = 0.8;
        momKrill.hunger = Math.random() * 0.3;
        
        if (window.gameState?.krillDebug) {
            console.log(`🦐 MomKrill initialized with offspring interval: ${momKrill.offspringInterval}ms`);
        }
    }

    // Get maturation progress for pale krill
    getMaturationProgress(paleKrill) {
        return paleKrill.maturationTimer / this.config.PALE_MATURATION.duration;
    }

    // Get offspring progress for mom krill
    getOffspringProgress(momKrill) {
        return momKrill.offspringTimer / this.config.MOM_REPRODUCTION.offspringInterval;
    }

    // Get debug colors
    getDebugColors() {
        return {
            paleKrill: this.config.VISUAL.paleKrill.debugColor,
            momKrill: this.config.VISUAL.momKrill.debugColor
        };
    }

    // Get visual properties
    getVisualProperties() {
        return this.config.VISUAL;
    }
}

// Export for global access
window.krillLifecycleSystem = new KrillLifecycleSystem(); 