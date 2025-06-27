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
        if (this.flockingSystem && this.flockingSystem.flock) {
            this.flockingSystem.flock(this, boids, predators, food, krill);
        }
    }

    update(boids, predators, food, krill, poop, fertilizedEggs = []) {
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