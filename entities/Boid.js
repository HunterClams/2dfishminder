// Boid class for small fish with flocking behavior
class Boid extends (window.Entity || Entity) {
    constructor(fishType = null) {
        // Use BoidConfig for fish types and spawn zone determination
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {
            SMALL_FRY_2: 'smallFry2',
            SMALL_FRY_3: 'smallFry3', 
            SMALL_FRY_4: 'smallFry4',
            KRILL: 'krill'
        };
        
        // Determine fish type and spawn zone BEFORE calling super()
        const actualFishType = fishType || FISH_TYPES.SMALL_FRY_2;
        const spawnZone = config.getSpawnZone ? config.getSpawnZone(actualFishType) : 'shallow';
        
        // Call parent constructor with proper spawn zone
        super(null, null, spawnZone);
        
        // NOW we can set this properties
        this.fishType = actualFishType;
        
        // Ensure velocity is properly initialized (safety check)
        if (!this.velocity) {
            this.velocity = { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 };
        }
        
        // Initialize modular systems
        this.initializeModularSystems();
        
        // Setup fish properties using config
        this.setupFishProperties();
        
        // Generate some variance in movement
        const behaviorConfig = config.BEHAVIOR_CONFIG || {};
        this.personalSpace = (behaviorConfig.separationRadius || 35) + (Math.random() - 0.5) * 10;
        this.groupAffinity = 0.8 + Math.random() * 0.4;
        this.fearSensitivity = 0.8 + Math.random() * 0.4;
        
        // Depth preference based on fish type
        this.preferredDepth = config.getPreferredDepth ? config.getPreferredDepth(actualFishType) : this.getPreferredDepth();
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        this.depthTolerance = WORLD_HEIGHT * (behaviorConfig.depthTolerance || 0.15);
    }

    initializeModularSystems() {
        // Initialize modular systems with safety checks
        try {
            this.flockingSystem = new (window.BoidFlockingSystem || BoidFlockingSystem)();
            this.feedingSystem = new (window.BoidFeedingSystem || BoidFeedingSystem)();
            this.renderingSystem = new (window.BoidRenderingSystem || BoidRenderingSystem)();
            
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.logSystemInit('BOID', 'Modular systems initialized successfully');
            }
        } catch (error) {
            if (window.ConsoleDebugSystem) {
                window.ConsoleDebugSystem.logError('BOID', 'Error initializing modular systems: ' + error.message);
            }
        }
    }
    
    setupFishProperties() {
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {};
        
        const fishConfig = config.getFishConfig ? config.getFishConfig(this.fishType) : {
            size: 35,
            maxSpeed: 3.0
        };
        
        this.size = fishConfig.size;
        this.maxSpeed = fishConfig.maxSpeed;
        
        // Set other properties from behavior config
        const behaviorConfig = config.BEHAVIOR_CONFIG || {};
        this.maxForce = behaviorConfig.maxForce || 0.06;
        this.separationRadius = behaviorConfig.separationRadius || 35;
        this.alignmentRadius = behaviorConfig.alignmentRadius || 60;
        this.cohesionRadius = behaviorConfig.cohesionRadius || 80;
        this.fearRadius = behaviorConfig.fearRadius || 120;
        this.foodRadius = behaviorConfig.foodRadius || 80;
        this.huntRadius = behaviorConfig.huntRadius || 40;
        this.frameSpeed = behaviorConfig.frameSpeed || 0.1;
        
        // Initialize other properties
        this.energy = 100;
        this.hunger = 0;
        this.huntCooldown = 0;
        this.animationFrame = 0;
        this.frameCount = 0; // Add frame counter for debug logging
    }

    getPreferredDepth() {
        const WORLD_HEIGHT = window.WORLD_HEIGHT || 8000;
        const config = window.BoidConfig || {};
        const FISH_TYPES = config.FISH_TYPES || {};
        
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
        if (this.flockingSystem && this.flockingSystem.handleEdges) {
            this.flockingSystem.handleEdges(this);
        }
    }

    flock(boids, predators, food, krill = []) {
        // USE OPTIMIZED SPATIAL PARTITIONING FOR O(n log n) PERFORMANCE
        const CONSTANTS = window.CONSTANTS || { PERCEPTION_RADIUS: 50, SEPARATION_RADIUS: 30 };
        const perceptionRadiusSquared = CONSTANTS.PERCEPTION_RADIUS * CONSTANTS.PERCEPTION_RADIUS;
        const separationRadiusSquared = CONSTANTS.SEPARATION_RADIUS * CONSTANTS.SEPARATION_RADIUS;
        
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let separation = { x: 0, y: 0 };
        let alignCount = 0, cohesionCount = 0, separationCount = 0;
        
        // TEMPORARILY DISABLE SPATIAL PARTITIONING - Use brute force for now
        // Use spatial partitioning if available for efficient O(n log n) lookups
        let nearbyBoids = boids; // Force brute force for now
        
        // TODO: Re-enable spatial partitioning once movement is fixed
        /*
        if (window.gameEntities && window.gameEntities.spatialPartitioning) {
            // Get nearby entities using spatial partitioning - much faster than O(n²) brute force
            nearbyBoids = window.gameEntities.spatialPartitioning.getNearbyEntities(
                this, 
                CONSTANTS.PERCEPTION_RADIUS, 
                ['fish', 'krill', 'paleKrill', 'momKrill', 'truefry']
            );
            
            // Fallback to brute force if spatial partitioning returns empty results
            if (nearbyBoids.length === 0) {
                nearbyBoids = boids;
            }
        } else {
            // Fallback to brute force if spatial partitioning not available
            nearbyBoids = boids;
        }
        */
        
        // Single pass through nearby boids (now optimized with spatial partitioning)
        for (let other of nearbyBoids) {
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
            // TEMPORARILY USE ORIGINAL calculateSteering - disable pooling for now
            const alignSteering = this.calculateSteering(alignment, this.maxSpeed, this.maxForce);
            forces.x += alignSteering.x;
            forces.y += alignSteering.y;
        }
        
        if (cohesionCount > 0) {
            cohesion.x = (cohesion.x / cohesionCount) - this.x;
            cohesion.y = (cohesion.y / cohesionCount) - this.y;
            // TEMPORARILY USE ORIGINAL calculateSteering - disable pooling for now
            const cohesionSteering = this.calculateSteering(cohesion, this.maxSpeed, this.maxForce);
            forces.x += cohesionSteering.x;
            forces.y += cohesionSteering.y;
        }
        
        if (separationCount > 0) {
            separation.x /= separationCount;
            separation.y /= separationCount;
            // TEMPORARILY USE ORIGINAL calculateSteering - disable pooling for now
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

    update(boids, predators, food, krill, poop, fertilizedEggs = []) {
        // Update frame counter
        this.frameCount++;
        
        // Debug logging for fry movement
        if (window.gameState && window.gameState.fryDebug && this.frameCount % 60 === 0) {
            console.log(`🐟 Fry update:`, {
                fishType: this.fishType,
                position: { x: Math.round(this.x), y: Math.round(this.y) },
                velocity: { x: Math.round(this.velocity.x * 100) / 100, y: Math.round(this.velocity.y * 100) / 100 },
                behaviorState: this.behaviorState,
                maxSpeed: this.maxSpeed,
                energy: this.energy
            });
        }
        
        // Apply flocking and feeding systems (direct velocity modification like original)
        this.flock(boids, predators, food, krill);
        this.checkForFood(krill, food, poop, fertilizedEggs);
        this.move();
        this.edges();
    }
    
    checkForFood(krillArray, fishFoodArray, poopArray, fertilizedEggsArray = []) {
        if (this.feedingSystem && this.feedingSystem.checkForFood) {
            this.feedingSystem.checkForFood(this, krillArray, fishFoodArray, poopArray, fertilizedEggsArray);
        }
    }

    draw() {
        if (this.renderingSystem && this.renderingSystem.draw) {
            this.renderingSystem.draw(this);
        }
    }
}

// Export for global access
window.Boid = Boid; 