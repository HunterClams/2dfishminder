// GameEntities system - manages all game entities and their lifecycle
class GameEntities {
    constructor() {
        this.fish = [];
        this.predators = [];
        this.krill = [];
        this.paleKrill = [];
        this.momKrill = [];
        this.fishFood = [];
        this.fishEggs = [];
        this.fertilizedEggs = [];
        this.sperm = [];
        this.poop = [];
        this.bubbles = [];
        this.squid = [];
        
        // Initialize entity counter
        this.entityCounter = window.EntityCounter ? new window.EntityCounter() : null;
        
        // Fish spawning system is only used for initialization, not stored as instance variable
        
        // Initialize fry fertilization system
        this.fryFertilizationSystem = window.FryFertilizationSystem ? new window.FryFertilizationSystem() : null;
        console.log('🥚 Fry fertilization system initialized:', !!this.fryFertilizationSystem);
        
        // Initialize tuna pooping system
        this.tunaPoopingSystem = window.TunaPoopingSystem ? new window.TunaPoopingSystem() : null;
        console.log('🐟 Tuna pooping system initialized:', !!this.tunaPoopingSystem);
        
        // Initialize truefry hatching system
        this.truefryHatchingSystem = window.TrueFryHatchingSystem ? new window.TrueFryHatchingSystem() : null;
        console.log('🐟 TrueFry hatching system initialized:', !!this.truefryHatchingSystem);
        
        // Initialize truefry evolution system
        this.truefryEvolutionSystem = window.TrueFryEvolutionSystem ? new window.TrueFryEvolutionSystem() : null;
        console.log('🐟 TrueFry evolution system initialized:', !!this.truefryEvolutionSystem);
        
        // Initialize debug view system
        this.debugViewSystem = window.DebugViewSystem ? new window.DebugViewSystem() : null;
        console.log('🔍 Debug view system initialized:', !!this.debugViewSystem);
        
        console.log('🎮 GameEntities system initialized');
    }
    
    // Initialize the ecosystem with starting entities
    initializeEcosystem() {
        // Use the new modular spawning system for depth-aware spawning
        if (window.FishSpawningSystem) {
            const spawningSystem = new window.FishSpawningSystem();
            spawningSystem.initializeEcosystemWithDepthPreferences(this);
        } else {
            // Fallback to original spawning if system not available
            console.warn('FishSpawningSystem not available, using fallback spawning');
            this.initializeEcosystemFallback();
        }
    }
    
    // Fallback spawning method (original implementation)
    initializeEcosystemFallback() {
        // Create initial fish population
        for (let i = 0; i < 230; i++) {
            const fishType = Math.random() < 0.4 ? window.FISH_TYPES.SMALL_FRY_2 : 
                           Math.random() < 0.5 ? window.FISH_TYPES.SMALL_FRY_3 : 
                           window.FISH_TYPES.SMALL_FRY_4;
            const fish = new window.Boid(fishType);
            fish.x = Math.random() * window.WORLD_WIDTH;
            fish.y = Math.random() * window.WORLD_HEIGHT;
            this.fish.push(fish);
        }
        
        // Create initial krill population
        for (let i = 0; i < 280; i++) {
            const krill = new window.Krill();
            krill.x = Math.random() * window.WORLD_WIDTH;
            krill.y = Math.random() * window.WORLD_HEIGHT;
            this.krill.push(krill);
        }
        
        // Create initial pale krill population
        for (let i = 0; i < 20; i++) {
            const paleKrill = new window.PaleKrill(
                Math.random() * window.WORLD_WIDTH,
                Math.random() * window.WORLD_HEIGHT
            );
            this.paleKrill.push(paleKrill);
        }
        
        // Create initial mom krill population
        for (let i = 0; i < 20; i++) {
            const momKrill = new window.MomKrill(
                Math.random() * window.WORLD_WIDTH,
                Math.random() * window.WORLD_HEIGHT
            );
            this.momKrill.push(momKrill);
        }
        
        // Create initial fish eggs for testing spawning system
        for (let i = 0; i < 10; i++) {
            const fishEgg = new window.FishEgg(
                Math.random() * window.WORLD_WIDTH,
                Math.random() * window.WORLD_HEIGHT
            );
            this.fishEggs.push(fishEgg);
        }
        console.log('🥚 Created', this.fishEggs.length, 'initial fish eggs for testing');
        
        // Create initial predators
        for (let i = 0; i < 30; i++) {
            const tunaType = Math.random() < 0.5 ? 'tuna' : 'tuna2';
            const predator = new window.Predator(tunaType);
            predator.x = Math.random() * window.WORLD_WIDTH;
            predator.y = window.WORLD_HEIGHT * 0.6 + Math.random() * window.WORLD_HEIGHT * 0.3; // 60-90% depth for better overlap with squid
            this.predators.push(predator);
        }
        
        // Create initial giant squid population
        for (let i = 0; i < 3; i++) {
            const squid = new window.GiantSquid();
            this.squid.push(squid);
        }
        
        // Create initial bubbles
        for (let i = 0; i < 20; i++) {
            const bubble = new window.Bubble();
            this.bubbles.push(bubble);
        }
        
        console.log('Ecosystem initialized with:', {
            fish: this.fish.length,
            krill: this.krill.length,
            paleKrill: this.paleKrill.length,
            momKrill: this.momKrill.length,
            predators: this.predators.length,
            squid: this.squid.length,
            bubbles: this.bubbles.length
        });
        
        // Log depth ranges for debugging
        console.log('🌊 Depth ranges:', {
            tunaSpawnRange: `${Math.round(window.WORLD_HEIGHT * 0.6)}-${Math.round(window.WORLD_HEIGHT * 0.9)} pixels (60-90%)`,
            squidSpawnRange: `${Math.round(window.WORLD_HEIGHT * 0.75)}-${Math.round(window.WORLD_HEIGHT * 0.95)} pixels (75-95%)`,
            overlapRange: `${Math.round(window.WORLD_HEIGHT * 0.75)}-${Math.round(window.WORLD_HEIGHT * 0.9)} pixels (75-90%)`,
            squidVisionRange: '1050 pixels'
        });
    }
    
    // Spawn entities based on spawn mode
    spawnEntity(spawnMode, x, y) {
        const centerX = x;
        const centerY = y;
        const spreadRadius = 100;
        
        if (spawnMode === 'food') {
            // Spawn 5-10 fish food with random spread
            const foodCount = 5 + Math.floor(Math.random() * 6); // 5-10
            for (let i = 0; i < foodCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                const newFood = new window.FishFood(spawnX, spawnY);
                this.fishFood.push(newFood);
            }
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('food', foodCount);
            }
        } else if (spawnMode === 'krill') {
            // Spawn krill with spread
            const krillCount = 3 + Math.floor(Math.random() * 3); // 3-5 krill
            
            for (let i = 0; i < krillCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                
                const newKrill = new window.Krill();
                newKrill.x = spawnX;
                newKrill.y = spawnY;
                this.krill.push(newKrill);
            }
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('krill', krillCount);
            }
        } else if (spawnMode === 'poop') {
            // Spawn 3-5 poop with random spread (like fish food)
            const poopCount = 3 + Math.floor(Math.random() * 3); // 3-5 poop
            
            for (let i = 0; i < poopCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                
                const newPoop = new window.Poop(spawnX, spawnY, 'regular');
                this.poop.push(newPoop);
            }
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('poop', poopCount);
            }
        } else if (spawnMode === 'fertilizedEggs') {
            // Spawn fertilized eggs with spread (1-3)
            const eggCount = 1 + Math.floor(Math.random() * 3); // 1-3 eggs
            
            for (let i = 0; i < eggCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                
                const newFertilizedEgg = new window.FertilizedEgg(spawnX, spawnY);
                this.fertilizedEggs.push(newFertilizedEgg);
            }
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('fertilizedEggs', eggCount);
            }
        } else if (spawnMode === 'fry') {
            // Spawn small fry with spread
            const fryCount = 1 + Math.floor(Math.random() * 5); // 1-5 fry
            const fryTypes = [window.FISH_TYPES.SMALL_FRY_2, window.FISH_TYPES.SMALL_FRY_3, window.FISH_TYPES.SMALL_FRY_4];
            
            for (let i = 0; i < fryCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                
                const randomFryType = fryTypes[Math.floor(Math.random() * fryTypes.length)];
                const newFry = new window.Boid(randomFryType);
                newFry.x = spawnX;
                newFry.y = spawnY;
                this.fish.push(newFry);
            }
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('fry', fryCount);
            }
        } else if (spawnMode === 'tuna') {
            // Spawn tuna with spread
            const tunaCount = 1 + Math.floor(Math.random() * 3); // 1-3 tuna
            const tunaTypes = ['tuna', 'tuna2'];
            
            for (let i = 0; i < tunaCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spreadRadius;
                const spawnX = centerX + Math.cos(angle) * distance;
                const spawnY = centerY + Math.sin(angle) * distance;
                
                const randomTunaType = tunaTypes[Math.floor(Math.random() * tunaTypes.length)];
                const newTuna = new window.Predator(randomTunaType);
                newTuna.x = spawnX;
                newTuna.y = spawnY;
                this.predators.push(newTuna);
            }
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('tuna', tunaCount);
            }
        } else if (spawnMode === 'squid') {
            // Spawn a single giant squid
            const newSquid = new window.GiantSquid(centerX, centerY);
            this.squid.push(newSquid);
            
            console.log('Giant squid spawned at:', centerX, centerY);
            
            if (this.entityCounter) {
                this.entityCounter.trackPlayerSpawn('squid', 1);
            }
        }
    }
    
    // Update all entities
    update() {
        // Track krill counts before update for debugging
        const krillCountsBefore = {
            regular: this.krill.length,
            pale: this.paleKrill.length,
            mom: this.momKrill.length
        };
        
        // Update bubbles efficiently
        for (let i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].update();
        }
        
        // Handle fish food and poop in optimized loops
        for (let i = this.fishFood.length - 1; i >= 0; i--) {
            const food = this.fishFood[i];
            food.update();
            
            if (food.checkEaten(this.fish) || food.eaten) {
                this.fishFood.splice(i, 1);
            }
        }
        
        // Update fish eggs
        for (let i = this.fishEggs.length - 1; i >= 0; i--) {
            const egg = this.fishEggs[i];
            egg.update();
            
            if (egg.eaten) {
                this.fishEggs.splice(i, 1);
            }
        }
        
        // Update fertilized eggs
        for (let i = this.fertilizedEggs.length - 1; i >= 0; i--) {
            const egg = this.fertilizedEggs[i];
            egg.update();
            
            if (egg.eaten) {
                this.fertilizedEggs.splice(i, 1);
            }
        }
        
        // Handle sperm in optimized loop
        for (let i = this.sperm.length - 1; i >= 0; i--) {
            const sperm = this.sperm[i];
            sperm.update();
            
            if (sperm.checkEaten(this.fish) || sperm.eaten) {
                this.sperm.splice(i, 1);
            }
        }
        
        for (let i = this.poop.length - 1; i >= 0; i--) {
            const poop = this.poop[i];
            poop.update();
            
            if (poop.isDead()) {
                this.poop.splice(i, 1);
            }
        }
        
        // Update entities with cached references
        this.fish.forEach(f => {
            f.update(this.fish, this.predators, this.fishFood, [...this.krill, ...this.paleKrill, ...this.momKrill], this.poop, this.fertilizedEggs);
        });
        
        // Process fry egg laying system
        if (window.FryEggLayingSystem) {
            window.FryEggLayingSystem.processAllFry(this.fish, this);
        }
        
        // Process fry feeding cooldown system
        if (window.FryFeedingCooldownSystem) {
            window.FryFeedingCooldownSystem.processAllFry(this.fish);
        }
        
        // Process fry fertilization system
        if (this.fryFertilizationSystem) {
            if (window.gameState?.fryDebug) {
                console.log(`🥚 Calling fry fertilization system with ${this.sperm.length} sperm and ${this.fishEggs.length} eggs`);
            }
            this.fryFertilizationSystem.update(this.sperm, this.fishEggs, this);
        } else if (window.gameState?.fryDebug) {
            console.warn(`🥚 Fry fertilization system not available!`);
        }
        
        // Process truefry hatching system
        if (this.truefryHatchingSystem) {
            if (window.gameState?.fryDebug) {
                console.log(`🐟 Calling truefry hatching system with ${this.fertilizedEggs.length} fertilized eggs`);
            }
            this.truefryHatchingSystem.update(this.fertilizedEggs, this);
        } else if (window.gameState?.fryDebug) {
            console.warn(`🐟 TrueFry hatching system not available!`);
        }
        
        // Process truefry evolution system
        if (this.truefryEvolutionSystem) {
            if (window.gameState?.fryDebug) {
                console.log(`🐟 Calling truefry evolution system with ${this.fish.length} fish`);
            }
            this.truefryEvolutionSystem.update(this.fish, this);
        } else if (window.gameState?.fryDebug) {
            console.warn(`🐟 TrueFry evolution system not available!`);
        }
        
        // Process tuna pooping system
        if (this.tunaPoopingSystem) {
            this.tunaPoopingSystem.update(this.predators, this);
        }
        
        this.predators.forEach(p => {
            p.update(this.fish, [...this.krill, ...this.paleKrill, ...this.momKrill], this.squid);
        });
        
        // Update krill - THIS WAS MISSING!
        this.krill.forEach(k => {
            k.update([...this.krill, ...this.paleKrill, ...this.momKrill], this.predators, this.fishFood, this.poop);
        });
        
        this.paleKrill.forEach(pk => {
            pk.update([...this.krill, ...this.paleKrill, ...this.momKrill], this.predators, this.fishFood, this.poop);
        });
        
        this.momKrill.forEach(mk => {
            mk.update([...this.krill, ...this.paleKrill, ...this.momKrill], this.predators, this.fishFood, this.poop);
        });
        
        // Handle krill lifecycle transformations
        this.updateKrillLifecycle();
        
        // Update giant squid
        this.squid.forEach(s => {
            s.update(this.fish, this.predators, this.krill);
        });
        
        // Update entity counter
        if (this.entityCounter) {
            this.entityCounter.updateWorldCounts(this, window.ObjectPools);
        }
        
        // Track krill counts after update for debugging
        const krillCountsAfter = {
            regular: this.krill.length,
            pale: this.paleKrill.length,
            mom: this.momKrill.length
        };
        
        // Log any significant changes in krill counts
        if (window.gameState?.krillDebug) {
            const totalBefore = krillCountsBefore.regular + krillCountsBefore.pale + krillCountsBefore.mom;
            const totalAfter = krillCountsAfter.regular + krillCountsAfter.pale + krillCountsAfter.mom;
            
            if (Math.abs(totalAfter - totalBefore) > 0) {
                console.log(`🦐 Krill count change: ${totalBefore} → ${totalAfter} (Regular: ${krillCountsBefore.regular}→${krillCountsAfter.regular}, Pale: ${krillCountsBefore.pale}→${krillCountsAfter.pale}, Mom: ${krillCountsBefore.mom}→${krillCountsAfter.mom})`);
            }
        }
    }
    
    // Handle krill lifecycle transformations using modular system
    updateKrillLifecycle() {
        // Use the modular transformation system
        if (window.KrillTransformationSystem) {
            const transformationsProcessed = window.KrillTransformationSystem.processAllTransformations(this);
            
            if (transformationsProcessed > 0 && window.gameState?.krillDebug) {
                console.log(`🦐 Processed ${transformationsProcessed} krill transformations`);
            }
        } else {
            console.warn('KrillTransformationSystem not found - krill transformations disabled');
        }
        
        // Handle mom krill offspring production (separate from transformations)
        this.updateMomKrillOffspring();
    }
    
    // Handle mom krill offspring production (separate from transformations)
    updateMomKrillOffspring() {
        if (window.gameState?.krillDebug && this.momKrill.length > 0) {
            console.log(`🦐 Checking ${this.momKrill.length} MomKrill for offspring production`);
        }
        
        for (let i = this.momKrill.length - 1; i >= 0; i--) {
            const mk = this.momKrill[i];
            
            // Check if mom krill should produce offspring
            const offspringCheck = mk.checkOffspring();
            
            if (window.gameState?.krillDebug) {
                console.log(`🦐 MomKrill offspring check:`, {
                    shouldProduce: offspringCheck.shouldProduce,
                    shouldRevert: offspringCheck.shouldRevert,
                    offspringCount: offspringCheck.offspring.length,
                    currentOffspring: mk.offspringCount,
                    maxOffspring: mk.maxOffspring,
                    timer: mk.offspringTimer,
                    interval: mk.offspringInterval
                });
            }
            
            if (offspringCheck.shouldProduce) {
                // Add pale krill offspring
                offspringCheck.offspring.forEach(offspring => {
                    const newPaleKrill = new window.PaleKrill(offspring.x, offspring.y, offspring.velocity);
                    this.paleKrill.push(newPaleKrill);
                    
                    if (window.gameState?.krillDebug) {
                        console.log(`🦐 Created pale krill offspring at (${offspring.x}, ${offspring.y})`);
                    }
                });
                
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Mom krill produced ${offspringCheck.offspring.length} pale krill! (Batch ${mk.batchesProduced}/${mk.maxBatches})`);
                }
            }
            
            // Check if mom krill should revert to regular krill
            if (offspringCheck.shouldRevert) {
                if (window.gameState?.krillDebug) {
                    console.log(`🦐 Mom krill should revert to regular krill (offspring limit reached)`);
                }
                // Set transformation flags for the transformation system to handle
                mk.shouldTransform = true;
                mk.transformTo = 'regularKrill';
            }
        }
    }
    
    // Draw all entities
    draw() {
        // Debug: Log krill counts
        if (window.gameState?.krillDebug) {
            console.log(`🦐 GameEntities draw - Krill counts:`, {
                regular: this.krill.length,
                pale: this.paleKrill.length,
                mom: this.momKrill.length
            });
        }
        
        // Draw regular krill
        for (let krill of this.krill) {
            if (window.krillRenderingSystem) {
                window.krillRenderingSystem.drawRegularKrill(krill);
            } else {
                if (window.gameState?.krillDebug) {
                    console.warn(`🦐 KrillRenderingSystem not available!`);
                }
            }
        }
        
        // Draw pale krill
        for (let paleKrill of this.paleKrill) {
            if (window.krillRenderingSystem) {
                window.krillRenderingSystem.drawPaleKrill(paleKrill);
            }
        }
        
        // Draw mom krill with debug logging
        if (window.gameState?.krillDebug && this.momKrill.length > 0) {
            console.log(`🦐 Drawing ${this.momKrill.length} MomKrill`);
        }
        for (let momKrill of this.momKrill) {
            if (window.krillRenderingSystem) {
                window.krillRenderingSystem.drawMomKrill(momKrill);
            }
        }
        
        // Draw bubbles
        for (let i = 0; i < this.bubbles.length; i++) {
            this.bubbles[i].draw();
        }
        
        // Draw fish food and poop
        this.fishFood.forEach(food => food.draw());
        this.fishEggs.forEach(egg => egg.draw());
        this.fertilizedEggs.forEach(egg => egg.draw());
        this.sperm.forEach(sperm => sperm.draw());
        this.poop.forEach(poop => poop.draw());
        
        // Draw entities
        this.fish.forEach(f => f.draw());
        this.predators.forEach(p => p.draw());
        this.squid.forEach(s => s.draw());
        
        // Draw debug information
        if (this.debugViewSystem && window.camera) {
            this.debugViewSystem.draw(window.ctx, this, window.camera);
        }
    }
    
    // Get entity counts for UI
    getEntityCounts() {
        return {
            fish: this.fish.length,
            predators: this.predators.length,
            krill: this.krill.length,
            paleKrill: this.paleKrill.length,
            momKrill: this.momKrill.length,
            fishFood: this.fishFood.length,
            fishEggs: this.fishEggs.length,
            fertilizedEggs: this.fertilizedEggs.length,
            poop: this.poop.length,
            bubbles: this.bubbles.length,
            sperm: this.sperm.length,
            squid: this.squid.length
        };
    }
}

// Make GameEntities globally accessible
window.GameEntities = GameEntities;